// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosInstance';
import { saveTokens, getTokens, clearTokens } from './tokenStorage';
import { getDeviceInfo } from './deviceInfo';
import type { AxiosError } from 'axios';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string | null;
  errorCode?: string | null;
  requestId?: string | null;
  timestamp?: string;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

interface AuthContextProps {
  user: any | null;
  loading: boolean;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => Promise<void>;
  socialLogin: (provider: string, data: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps | null>(null);

const isApiResponse = (x: any): x is ApiResponse<any> =>
  x && typeof x === 'object' && 'success' in x && 'data' in x;

const unwrapOrThrow = <T,>(resData: any): T => {
  // ✅ ApiResponse 포맷이면 success 체크까지
  if (isApiResponse(resData)) {
    if (!resData.success) {
      const msg = resData.message || 'Request failed';
      const code = resData.errorCode || 'UNKNOWN_ERROR';
      const rid = resData.requestId ? ` (requestId=${resData.requestId})` : '';
      throw new Error(`${code}: ${msg}${rid}`);
    }
    return resData.data as T;
  }

  // ✅ 혹시 일부 API가 래퍼 없이 오면 그대로 반환
  return resData as T;
};

const logAxios = (tag: string, e: unknown) => {
  const err = e as AxiosError<any>;
  console.warn(`${tag} status:`, err.response?.status);
  console.warn(`${tag} data:`, err.response?.data);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 실행 시 자동 로그인
  useEffect(() => {
    (async () => {
      const tokens = await getTokens();
      if (tokens?.accessToken) {
        try {
          const res = await api.get('/me');
          const me = unwrapOrThrow<any>(res.data);
          setUser(me);
        } catch (e) {
          // accessToken이 깨졌거나 만료된 경우
          await clearTokens();
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const socialLogin = async (provider: string, data: any) => {
    try {
      const device = await getDeviceInfo();

      // ✅ provider별 endpoint 우선 사용 (DTO/스펙 불일치 방지)
      const endpoint =
        provider === 'kakao'
          ? '/auth/social/kakao'
          : provider === 'google'
            ? '/auth/social/google'
            : `/auth/social/${provider}`; // apple 등

      const res = await api.post(endpoint, {
        ...data,
        ...device,
      });

      const tokens = unwrapOrThrow<Tokens>(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        console.warn('[socialLogin] token payload missing', res.data);
        return false;
      }

      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const meRes = await api.get('/me');
      const me = unwrapOrThrow<any>(meRes.data);
      setUser(me);

      return true;
    } catch (e) {
      logAxios('[socialLogin]', e);
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const device = await getDeviceInfo();

      const res = await api.post('/auth/login', {
        username,
        password,
        ...device,
      });

      const tokens = unwrapOrThrow<Tokens>(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        console.warn('[login] token payload missing', res.data);
        return false;
      }

      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const meRes = await api.get('/me');
      const me = unwrapOrThrow<any>(meRes.data);
      setUser(me);

      return true;
    } catch (e) {
      logAxios('[login]', e);
      return false;
    }
  };

  const logout = async () => {
    // 서버에 logout API가 없거나 필요 없으면 호출 실패해도 무시
    try {
      await api.post('/auth/logout');
    } catch {}

    await clearTokens();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, socialLogin }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
