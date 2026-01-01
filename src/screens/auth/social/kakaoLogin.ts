// src/auth/social/kakaoLogin.ts
import { login, getAccessToken } from '@react-native-seoul/kakao-login';

/**
 * 카카오 로그인 수행 후 accessToken 반환
 * - 이미 로그인된 상태면 바로 accessToken 가져오고
 * - 아니면 로그인 진행 후 accessToken 가져오기
 */
export async function getKakaoAccessToken(): Promise<string | null> {
  try {
    // 1) 카카오 로그인 시도
    await login();

    // 2) 현재 액세스 토큰 조회
    const token = await getAccessToken();

    if (!token?.accessToken) {
      console.warn('Kakao: accessToken 이 없습니다.');
      return null;
    }

    return token.accessToken;
  } catch (e: any) {
    // 유저 취소 등
    if (e?.code === 'E_CANCELLED_OPERATION') {
      console.log('Kakao login canceled by user');
      return null;
    }
    console.warn('Kakao login error:', e);
    return null;
  }
}
