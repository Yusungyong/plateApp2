// src/auth/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AxiosError } from 'axios';
import api, { setAuthFailureHandler } from '../api/axiosInstance';
import { saveTokens, getTokens, clearTokens } from './tokenStorage';
import { getDeviceInfo } from './deviceInfo';
import { initFcmMessaging } from '../notifications/fcm';
import { createLogger } from '../utils/logger';
 

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
  socialLogin: (provider: string, data: any) => Promise<void>;
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

const authLogger = createLogger('[auth]');

const getReadableErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<any>;
  const responseBody: any = axiosError?.response?.data;
  const message =
    responseBody?.message ??
    responseBody?.error ??
    responseBody?.data?.message ??
    (error as Error | undefined)?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

const logAxios = (tag: string, error: unknown) => {
  const axiosError = error as AxiosError<any>;
  authLogger.warn(tag, {
    message: axiosError?.message ?? (error as Error | undefined)?.message ?? null,
    status: axiosError?.response?.status ?? null,
    data: axiosError?.response?.data ?? null,
  });
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
          const res = await api.get('/api/me');
          const me = unwrapOrThrow<any>(res.data);
          setUser(me);
        } catch {
          // accessToken이 깨졌거나 만료된 경우
          await clearTokens();
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    const cleanup = initFcmMessaging({ username: user.username });
    return cleanup;
  }, [user?.username]);

  useEffect(() => {
    setAuthFailureHandler(async () => {
      await clearTokens();
      setUser(null);
    });
    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const socialLogin = async (provider: string, data: any) => {
    const device = await getDeviceInfo();
    try {
      // ✅ provider별 endpoint 우선 사용 (DTO/스펙 불일치 방지)
      const endpoint =
        provider === 'kakao'
          ? '/api/auth/social/kakao'
          : provider === 'google'
            ? '/api/auth/social/google'
            : `/api/auth/social/${provider}`; // apple 등

      const res = await api.post(endpoint, {
        ...data,
        ...device,
      });

      const tokens = unwrapOrThrow<Tokens>(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error('로그인 토큰을 받지 못했어요.');
      }

      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const meRes = await api.get('/api/me');
      const me = unwrapOrThrow<any>(meRes.data);
      setUser(me);
    } catch (e) {
      logAxios('[socialLogin]', e);
      throw new Error(getReadableErrorMessage(e, '소셜 로그인을 완료하지 못했어요.'));
    }
  };

  const login = async (username: string, password: string) => {
    const device = await getDeviceInfo();
    try {
      const res = await api.post('/api/auth/login', {
        username,
        password,
        ...device,
      });

      const tokens = unwrapOrThrow<Tokens>(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        return false;
      }

      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const meRes = await api.get('/api/me');
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
      await api.post('/api/auth/logout');
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
