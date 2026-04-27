// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';
import { getTokens, saveTokens, clearTokens } from '../auth/tokenStorage';
import { createLogger } from '../utils/logger';
import { getApiBaseUrl } from '../config/devProxy';

const RAW_BASE_URL = (Config as any).SERVER_API_URL || '';
const BASE_URL = getApiBaseUrl(RAW_BASE_URL);
// const BASE_URL = 'http://192.168.219.131:8090';
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});
const logger = createLogger('[api]');

let authFailureHandler: (() => void | Promise<void>) | null = null;

export const setAuthFailureHandler = (
  handler: (() => void | Promise<void>) | null,
) => {
  authFailureHandler = handler;
};

const notifyAuthFailure = async () => {
  if (!authFailureHandler) return;
  try {
    await authFailureHandler();
  } catch {}
};

// ✅ auth 계열은 토큰을 붙이지 않는다 (안전하게 넓게 잡는 버전)
const isPublicAuthEndpoint = (url?: string) => {
  if (!url) return false;

  // absolute url -> path로 변환
  const path = url.startsWith('http') ? url.replace(RAW_BASE_URL, '').replace(BASE_URL, '') : url;

  return (
    path.startsWith('/auth/') || // legacy auth
    path.startsWith('/email/') || // legacy email
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/email/')
  );
};

const isTracedEndpoint = (url?: string) => {
  if (!url) return false;

  const path = url.startsWith('http') ? url.replace(RAW_BASE_URL, '').replace(BASE_URL, '') : url;
  return (
    path.startsWith('/api/home/') ||
    path.startsWith('/api/map/')
  );
};

const summarizeRequest = (config: InternalAxiosRequestConfig | undefined) => ({
  method: config?.method?.toUpperCase() ?? 'GET',
  baseURL: config?.baseURL ?? BASE_URL,
  url: config?.url ?? '',
  timeout: config?.timeout,
  params: config?.params ?? null,
  hasAuthHeader: Boolean((config?.headers as any)?.Authorization),
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const url = config.url;
  if (isPublicAuthEndpoint(url)) {
    if (config.headers && 'Authorization' in config.headers) {
      delete (config.headers as any).Authorization;
    }
    return config;
  }

  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${tokens.accessToken}`;
  }

  if (isTracedEndpoint(url)) {
    logger.debug('request', summarizeRequest(config));
  }

  return config;
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const startRefresh = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('Missing refresh token');
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const refreshRes = await refreshClient.post('/api/auth/refresh', {
          refreshToken: tokens.refreshToken,
        });

        const body: any = refreshRes.data;
        const payload = body?.data ?? body;

        const newAccess = payload?.accessToken;
        const newRefresh = payload?.refreshToken;

        if (!newAccess || !newRefresh) {
          throw new Error('Invalid refresh response');
        }

        await saveTokens(newAccess, newRefresh);
        return { accessToken: newAccess, refreshToken: newRefresh };
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          await sleep(300);
        }
      }
    }

    throw lastError ?? new Error('Refresh failed');
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

api.interceptors.response.use(
  response => {
    if (isTracedEndpoint(response.config?.url)) {
      logger.debug('response', {
        ...summarizeRequest(response.config),
        status: response.status,
        responseDataType: typeof response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (isTracedEndpoint(originalRequest.url)) {
      logger.warn('response error', {
        ...summarizeRequest(originalRequest),
        code: error.code ?? null,
        message: error.message,
        status: error.response?.status ?? null,
        responseData: error.response?.data ?? null,
      });
    }

    const status = error.response?.status;
    const url = originalRequest.url as string | undefined;

    // auth 호출은 refresh 로직 금지
    if (isPublicAuthEndpoint(url)) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const nextTokens = await startRefresh();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextTokens.accessToken}`;

        return api(originalRequest);
      } catch (e) {
        const refreshStatus = (e as AxiosError | undefined)?.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          await clearTokens();
          await notifyAuthFailure();
        }
        // ✅ 네트워크/일시적 실패는 토큰 유지
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
