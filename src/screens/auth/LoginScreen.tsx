// src/screens/Auth/LoginScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../styles/theme';
import PrimaryButton from '../../components/common/PrimaryButton';
import AuthTextInput from '../../components/common/AuthTextInput';

import { appleAuth } from '@invertase/react-native-apple-authentication'; // ✅ Apple
import {
  login as kakaoLogin,
  getAccessToken as getKakaoAccessToken,
} from '@react-native-seoul/kakao-login'; // ✅ Kakao
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'; // ✅ Google
import { useAuth } from '../../auth/AuthProvider';

type SocialProvider = 'apple' | 'kakao' | 'google';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const LoginScreen = ({
  onLogin,
  onSignupPress,
  onForgotPasswordPress,
  onSocialLoginPress,
  initialId = '',
}) => {
  const [id, setId] = useState(initialId);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { socialLogin } = useAuth();

  const canSubmit = id.trim().length > 0 && password.trim().length > 0 && !submitting;

  /** ✅ Google 설정 */
  useEffect(() => {
    GoogleSignin.configure({
      // 🔥 구글 콘솔에서 발급받은 iOS OAuth 클라이언트 ID
      iosClientId:
        '962194932695-rmfmslpktbsu35oo97dmimacs3m739a9.apps.googleusercontent.com',
      // (선택) 웹 클라이언트 ID 필요하면 설정
      // webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  /** 일반 로그인 */
  const handleLoginPress = useCallback(async () => {
    if (!canSubmit || !onLogin) return;
    try {
      setSubmitting(true);
      await onLogin(id.trim(), password);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, onLogin, id, password]);

  /** 🔥 Apple 로그인 */
  const handleAppleLogin = async () => {
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      console.log('Apple login response:', response);

      const { identityToken, authorizationCode, user: appleUser } = response;

      if (!identityToken) {
        console.warn('Apple Sign-In: identityToken 이 없습니다.');
        return;
      }

      await socialLogin('apple', {
        identityToken,
        authorizationCode,
        user: appleUser,
      });
    } catch (e: any) {
      if (e?.code === appleAuth.Error.CANCELED) {
        // 유저가 로그인 창에서 취소한 경우
        return;
      }
      console.warn('Apple login error:', e);
    }
  };

  /** 🔥 Kakao 로그인 */
  const handleKakaoLogin = async () => {
    try {
      await kakaoLogin(); // 이미 로그인되어 있으면 토큰 갱신

      const token = await getKakaoAccessToken();
      console.log('Kakao token:', token);

      if (!token?.accessToken) {
        console.warn('Kakao: accessToken 이 없습니다.');
        return;
      }

      await socialLogin('kakao', {
        accessToken: token.accessToken,
      });
    } catch (e: any) {
      if (e?.code === 'E_CANCELLED_OPERATION' || e?.code === 'E_CANCELLED') {
        console.log('Kakao login canceled by user');
        return;
      }
      console.warn('Kakao login error:', e);
    }
  };

  /** 🔥 Google 로그인 */
  const handleGoogleLogin = async () => {
    try {
      // Android 용이지만 iOS에서도 문제 없이 통과 (내부 처리)
      await GoogleSignin.hasPlayServices?.();

      const signInResult = await GoogleSignin.signIn();
      console.log('Google signInResult:', signInResult);

      // v13+ / 이전 버전 모두 대응
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyResult: any = signInResult;
      const idToken: string | undefined =
        anyResult?.data?.idToken ?? anyResult?.idToken;

      if (!idToken) {
        console.warn('Google: idToken 이 없습니다.');
        return;
      }

      await socialLogin('google', {
        idToken,
      });
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        // 사용자가 로그인 취소
        console.log('Google login canceled by user');
        return;
      }
      console.warn('Google login error:', e);
    }
  };

  /** 소셜 로그인 공통 핸들러 */
  const handleSocialPress = (provider: SocialProvider) => {
    if (provider === 'apple') {
      handleAppleLogin();
      return;
    }
    if (provider === 'kakao') {
      handleKakaoLogin();
      return;
    }
    if (provider === 'google') {
      handleGoogleLogin();
      return;
    }
    onSocialLoginPress?.(provider);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.appTitle}>접시</Text>
          </View>

          <View style={styles.formContainer}>
            <AuthTextInput
              label="아이디"
              value={id}
              onChangeText={setId}
              placeholder="이메일 또는 아이디"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <AuthTextInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              onSubmitEditing={handleLoginPress}
            />

            <PrimaryButton
              title={submitting ? '로그인 중...' : '로그인'}
              onPress={handleLoginPress}
              disabled={!canSubmit}
              loading={submitting}
            />

            <View style={styles.bottomLinksRow}>
              <TouchableOpacity onPress={onSignupPress} hitSlop={HIT_SLOP}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>

              <View style={styles.linksDivider} />

              <TouchableOpacity onPress={onForgotPasswordPress} hitSlop={HIT_SLOP}>
                <Text style={styles.linkText}>비밀번호 변경</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>또는</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* 🔥 소셜 로그인 버튼 영역 */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialLabel}>소셜 계정으로 간편 로그인</Text>

            <View style={styles.socialIconRow}>
              <TouchableOpacity
                style={[styles.socialIconButton, styles.appleIconButton]}
                onPress={() => handleSocialPress('apple')}
                activeOpacity={0.8}
              >
                <Text style={styles.socialIconTextLight}>A</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialIconButton, styles.kakaoIconButton]}
                onPress={() => handleSocialPress('kakao')}
                activeOpacity={0.8}
              >
                <Text style={styles.socialIconTextDark}>K</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialIconButton, styles.googleIconButton]}
                onPress={() => handleSocialPress('google')}
                activeOpacity={0.8}
              >
                <Text style={styles.socialIconTextDark}>G</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: spacing.xl,
  },
  appTitle: {
    ...typography.title,
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  bottomLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  linksDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.lg,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  separatorText: {
    marginHorizontal: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
  },
  socialContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  socialLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  socialIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  socialIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  socialIconTextLight: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  socialIconTextDark: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  appleIconButton: {
    backgroundColor: colors.socialApple,
  },
  kakaoIconButton: {
    backgroundColor: colors.socialKakao,
  },
  googleIconButton: {
    backgroundColor: colors.background,
    borderColor: colors.socialGoogleBorder,
  },
});
