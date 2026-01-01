// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTokens, saveTokens, clearTokens } from '../auth/tokenStorage';

const BASE_URL = process.env.SERVER_API_URL || 'http://192.168.219.149:8080';
console.log('API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ✅ auth 계열은 토큰을 붙이지 않는다 (안전하게 넓게 잡는 버전)
const isPublicAuthEndpoint = (url?: string) => {
  if (!url) return false;

  // absolute url -> path로 변환
  const path = url.startsWith('http') ? url.replace(BASE_URL, '') : url;

  return (
    path.startsWith('/auth/') ||  // auth 전부
    path.startsWith('/email/')    // 이메일 전부
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

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
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

      const tokens = await getTokens();
      if (!tokens?.refreshToken) {
        await clearTokens();
        return Promise.reject(error);
      }

      try {
        const refreshRes = await refreshClient.post('/auth/refresh', {
          refreshToken: tokens.refreshToken,
        });

        const body: any = refreshRes.data;
        const payload = body?.data ?? body;

        const newAccess = payload?.accessToken;
        const newRefresh = payload?.refreshToken;

        if (!newAccess || !newRefresh) {
          await clearTokens();
          return Promise.reject(error);
        }

        await saveTokens(newAccess, newRefresh);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (e) {
        await clearTokens();
        // ✅ 원래 에러(401)를 유지하는 게 디버깅에 더 좋음
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
