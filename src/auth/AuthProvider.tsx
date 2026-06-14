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

const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;
const AUTH_CLEANUP_TIMEOUT_MS = 3000;

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

export type SocialProvider = 'apple' | 'google' | 'kakao';

export type SocialLoginSuccess = {
  kind: 'login_success';
  accessToken: string;
  refreshToken: string;
};

export type SocialSignupRequired = {
  kind: 'signup_required';
  signupToken: string;
  provider: SocialProvider;
  email?: string | null;
  nickname?: string | null;
  providerUserId?: string | null;
};

export type SocialAuthResult = SocialLoginSuccess | SocialSignupRequired;

type SocialSignupCompletePayload = {
  signupToken: string;
  email: string;
  nickname: string;
  agreeService: boolean;
  agreePrivacy: boolean;
};

interface AuthContextProps {
  user: any | null;
  loading: boolean;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => Promise<void>;
  socialLogin: (provider: SocialProvider, data: any) => Promise<SocialAuthResult>;
  completeSocialSignup: (payload: SocialSignupCompletePayload) => Promise<void>;
  refreshUser: () => Promise<any | null>;
  patchUser: (patch: Record<string, any>) => void;
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

const isRateLimitError = (error: unknown) => {
  const axiosError = error as AxiosError<any>;
  return (
    axiosError?.response?.status === 429 ||
    axiosError?.response?.data?.errorCode === 'COMMON_429'
  );
};

const withStartupTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const fcmIdentity = useMemo(() => {
    const username =
      typeof user?.username === 'string' ? user.username.trim() : '';
    if (username) return username;
    const userId =
      typeof user?.userId === 'number' || typeof user?.userId === 'string'
        ? String(user.userId)
        : '';
    return userId ? `user:${userId}` : null;
  }, [user?.userId, user?.username]);

  const refreshUser = React.useCallback(async () => {
    const tokens = await getTokens();
    if (!tokens?.accessToken) {
      setUser(null);
      return null;
    }

    const res = await api.get('/api/me');
    const me = unwrapOrThrow<any>(res.data);
    setUser(me);
    return me;
  }, []);

  const patchUser = React.useCallback((patch: Record<string, any>) => {
    setUser((prev: any) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // 앱 실행 시 자동 로그인
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const tokens = await withStartupTimeout(
          getTokens(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'auth token restore',
        );

        if (tokens?.accessToken) {
          try {
            await withStartupTimeout(
              refreshUser(),
              AUTH_BOOTSTRAP_TIMEOUT_MS,
              'auth user restore',
            );
          } catch (error) {
            console.warn('[auth] failed to restore session', error);
            // accessToken이 깨졌거나 만료된 경우
            await withStartupTimeout(
              clearTokens(),
              AUTH_CLEANUP_TIMEOUT_MS,
              'auth token cleanup',
            ).catch(() => undefined);
            if (active) {
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.warn('[auth] bootstrap failed', error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!fcmIdentity) return;
    const cleanup = initFcmMessaging({ username: fcmIdentity });
    return cleanup;
  }, [fcmIdentity]);

  useEffect(() => {
    setAuthFailureHandler(async () => {
      await clearTokens();
      setUser(null);
    });
    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const socialLogin = React.useCallback(
    async (provider: SocialProvider, data: any) => {
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

        const payload = unwrapOrThrow<any>(res.data);
        if (payload?.kind === 'signup_required') {
          return {
            kind: 'signup_required',
            signupToken: String(payload.signupToken ?? ''),
            provider: payload.provider ?? provider,
            email: payload.email ?? null,
            nickname: payload.nickname ?? null,
            providerUserId: payload.providerUserId ?? null,
          } satisfies SocialSignupRequired;
        }

        const tokens =
          payload?.kind === 'login_success'
            ? ({
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken,
              } satisfies Tokens)
            : (payload as Tokens);
        if (!tokens?.accessToken || !tokens?.refreshToken) {
          throw new Error('로그인 토큰을 받지 못했어요.');
        }

        await saveTokens(tokens.accessToken, tokens.refreshToken);

        const meRes = await api.get('/api/me');
        const me = unwrapOrThrow<any>(meRes.data);
        setUser(me);
        return {
          kind: 'login_success',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        } satisfies SocialLoginSuccess;
      } catch (e) {
        throw new Error(getReadableErrorMessage(e, '소셜 로그인을 완료하지 못했어요.'));
      }
    },
    [],
  );

  const completeSocialSignup = React.useCallback(
    async (payload: SocialSignupCompletePayload) => {
      try {
        const res = await api.post('/api/auth/social/signup/complete', payload);
        const tokens = unwrapOrThrow<Tokens>(res.data);
        if (!tokens?.accessToken || !tokens?.refreshToken) {
          throw new Error('회원가입 토큰을 받지 못했어요.');
        }

        await saveTokens(tokens.accessToken, tokens.refreshToken);

        const meRes = await api.get('/api/me');
        const me = unwrapOrThrow<any>(meRes.data);
        setUser(me);
      } catch (e) {
        throw new Error(getReadableErrorMessage(e, '소셜 회원가입을 완료하지 못했어요.'));
      }
    },
    [],
  );

  const login = React.useCallback(async (username: string, password: string) => {
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
      if (isRateLimitError(e)) {
        throw new Error(getReadableErrorMessage(e, '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'));
      }
      return false;
    }
  }, []);

  const logout = React.useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      socialLogin,
      completeSocialSignup,
      refreshUser,
      patchUser,
    }),
    [user, loading, login, logout, socialLogin, completeSocialSignup, refreshUser, patchUser],
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
