import { appleAuth } from '@invertase/react-native-apple-authentication';
import {
  login as kakaoLogin,
  getAccessToken as getKakaoAccessToken,
} from '@react-native-seoul/kakao-login';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';

import type { SocialDeletePayload } from '../api/profileApi';

export type SupportedSocialProvider = 'apple' | 'google' | 'kakao';

const GOOGLE_IOS_CLIENT_ID =
  '962194932695-rmfmslpktbsu35oo97dmimacs3m739a9.apps.googleusercontent.com';

const readConfigString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const GOOGLE_WEB_CLIENT_ID = readConfigString((Config as any).GOOGLE_WEB_CLIENT_ID);

export const hasGoogleWebClientIdConfigured = () => GOOGLE_WEB_CLIENT_ID.length > 0;

export const getGoogleClientConfigDebug = () => ({
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  envGoogleWebClientId: readConfigString((Config as any).GOOGLE_WEB_CLIENT_ID) || null,
  legacyGoogleClientId: readConfigString((Config as any).GOOGLE_CLIENT_ID) || null,
  resolvedWebClientId: GOOGLE_WEB_CLIENT_ID || null,
});

export const configureGoogleSocialAuth = () => {
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    offlineAccess: false,
  });
};

export const getGoogleIdTokenFromSignInResult = async (
  signInResult: unknown,
): Promise<string | undefined> => {
  const anyResult: any = signInResult;
  const directIdToken: string | undefined = anyResult?.data?.idToken ?? anyResult?.idToken;
  if (directIdToken) {
    return directIdToken;
  }

  try {
    const tokenResult = await GoogleSignin.getTokens();
    if (tokenResult?.idToken) {
      return tokenResult.idToken;
    }
  } catch {}

  const currentUser: any = GoogleSignin.getCurrentUser?.();
  return currentUser?.idToken;
};

export const reauthenticateSocialAccount = async (
  provider: SupportedSocialProvider,
): Promise<SocialDeletePayload> => {
  if (provider === 'apple') {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const { identityToken, authorizationCode } = response;
    if (!identityToken || !authorizationCode) {
      throw new Error('Apple 재인증 정보를 가져오지 못했어요.');
    }

    return {
      provider: 'apple',
      identityToken,
      authorizationCode,
    };
  }

  if (provider === 'google') {
    await GoogleSignin.hasPlayServices?.();
    const signInResult = await GoogleSignin.signIn();
    const idToken = await getGoogleIdTokenFromSignInResult(signInResult);

    if (!idToken) {
      throw new Error('Google 재인증 토큰을 가져오지 못했어요.');
    }

    return {
      provider: 'google',
      idToken,
    };
  }

  await kakaoLogin();
  const token = await getKakaoAccessToken();
  if (!token?.accessToken) {
    throw new Error('Kakao 재인증 토큰을 가져오지 못했어요.');
  }

  return {
    provider: 'kakao',
    accessToken: token.accessToken,
  };
};

export const isSocialAuthCancelled = (
  provider: SupportedSocialProvider,
  error: unknown,
) => {
  const anyError = error as { code?: string } | null | undefined;
  if (!anyError?.code) {
    return false;
  }

  if (provider === 'apple') {
    return anyError.code === appleAuth.Error.CANCELED;
  }

  if (provider === 'google') {
    return anyError.code === statusCodes.SIGN_IN_CANCELLED;
  }

  return anyError.code === 'E_CANCELLED_OPERATION' || anyError.code === 'E_CANCELLED';
};
