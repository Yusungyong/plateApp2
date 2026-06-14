// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';
import { getTokens, saveTokens, clearTokens } from '../auth/tokenStorage';
import { getApiBaseUrl } from '../config/devProxy';

const RAW_BASE_URL = (Config as any).SERVER_API_URL || '';
const BASE_URL = getApiBaseUrl(RAW_BASE_URL);
// const BASE_URL = 'http://192.168.219.131:8090';
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

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

const RATE_LIMIT_MESSAGE = '요청이 너무 많아요. 잠시 후 다시 시도해주세요.';

const normalizeRateLimitError = (error: AxiosError) => {
  if (error.response?.status !== 429) {
    return;
  }

  const data = error.response.data as any;
  if (data && typeof data === 'object') {
    if (!data.message) {
      data.message = RATE_LIMIT_MESSAGE;
    }
    if (!data.errorCode) {
      data.errorCode = 'COMMON_429';
    }
  }
  error.message = data?.message ?? RATE_LIMIT_MESSAGE;
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

  return config;
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

refreshClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    normalizeRateLimitError(error);
    return Promise.reject(error);
  },
);

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
  response => response,
  async (error: AxiosError) => {
    normalizeRateLimitError(error);

    const originalRequest: any = error.config;
    if (!originalRequest) return Promise.reject(error);

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
