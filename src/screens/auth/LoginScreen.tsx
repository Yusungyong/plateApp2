// src/screens/Auth/LoginScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../styles/theme';
import PrimaryButton from '../../components/common/PrimaryButton';
import AuthTextInput from '../../components/common/AuthTextInput';

import { appleAuth } from '@invertase/react-native-apple-authentication'; // ✅ Apple
import {
  login as kakaoLogin,
  getAccessToken as getKakaoAccessToken,
} from '@react-native-seoul/kakao-login'; // ✅ Kakao
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'; // ✅ Google
import {
  useAuth,
  type SocialProvider,
  type SocialSignupRequired,
} from '../../auth/AuthProvider';
import {
  configureGoogleSocialAuth,
  getGoogleClientConfigDebug,
  getGoogleIdTokenFromSignInResult,
  hasGoogleWebClientIdConfigured,
} from '../../auth/socialAuth';
import { createLogger } from '../../utils/logger';

type LoginScreenProps = {
  onLogin?: (id: string, password: string) => void | Promise<void>;
  onSignupPress?: () => void;
  onForgotPasswordPress?: () => void;
  onSocialLoginPress?: (provider: SocialProvider) => void;
  onSocialSignupRequired?: (payload: SocialSignupRequired) => void;
  onContinueAsGuest?: () => void;
  initialId?: string;
};

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const socialAuthLogger = createLogger('[social-auth]');

const summarizeSocialError = (error: any) => ({
  code: error?.code ?? null,
  message: error?.message ?? null,
  name: error?.name ?? null,
  nativeStackAndroid: error?.nativeStackAndroid ? 'present' : null,
});

const LoginScreen = ({
  onLogin,
  onSignupPress,
  onForgotPasswordPress,
  onSocialLoginPress,
  onSocialSignupRequired,
  onContinueAsGuest,
  initialId = '',
}: LoginScreenProps) => {
  const [id, setId] = useState(initialId);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState<SocialProvider | null>(null);
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );

  const { socialLogin } = useAuth();
  const shouldShowAppleLogin = Platform.OS === 'ios';

  const canSubmit = id.trim().length > 0 && password.trim().length > 0 && !submitting;
  const canUseSocial = socialSubmitting == null;

  /** ✅ Google 설정 */
  useEffect(() => {
    configureGoogleSocialAuth();
  }, []);

  const showSocialFailure = useCallback((title: string, message: string) => {
    Alert.alert(title, message);
  }, []);

  const handleSocialAuthResult = useCallback(
    (result: Awaited<ReturnType<typeof socialLogin>>) => {
      if (result.kind === 'signup_required') {
        onSocialSignupRequired?.(result);
      }
    },
    [onSocialSignupRequired],
  );

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
      setSocialSubmitting('apple');
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      const { identityToken, authorizationCode, user: appleUser } = response;
      if (!identityToken) {
        showSocialFailure('Apple 로그인 실패', 'Apple 로그인 정보를 가져오지 못했어요.');
        return;
      }

      const result = await socialLogin('apple', {
        identityToken,
        authorizationCode,
        user: appleUser,
      });
      handleSocialAuthResult(result);
    } catch (e: any) {
      if (e?.code === appleAuth.Error.CANCELED) {
        return;
      }
      showSocialFailure('Apple 로그인 실패', e?.message || '로그인을 진행하지 못했어요.');
    } finally {
      setSocialSubmitting(null);
    }
  };

  /** 🔥 Kakao 로그인 */
  const handleKakaoLogin = async () => {
    try {
      setSocialSubmitting('kakao');
      socialAuthLogger.debug('kakao login start', { platform: Platform.OS });
      await kakaoLogin(); // 이미 로그인되어 있으면 토큰 갱신

      const token = await getKakaoAccessToken();
      if (!token?.accessToken) {
        socialAuthLogger.warn('kakao token missing', { platform: Platform.OS });
        showSocialFailure('카카오 로그인 실패', '카카오 로그인 토큰을 가져오지 못했어요.');
        return;
      }

      socialAuthLogger.debug('kakao token received', { platform: Platform.OS });
      const result = await socialLogin('kakao', {
        accessToken: token.accessToken,
      });
      handleSocialAuthResult(result);
    } catch (e: any) {
      if (e?.code === 'E_CANCELLED_OPERATION' || e?.code === 'E_CANCELLED') {
        return;
      }
      socialAuthLogger.warn('kakao login failed', summarizeSocialError(e));
      showSocialFailure('카카오 로그인 실패', e?.message || '카카오 로그인을 진행하지 못했어요.');
    } finally {
      setSocialSubmitting(null);
    }
  };

  /** 🔥 Google 로그인 */
  const handleGoogleLogin = async () => {
    try {
      setSocialSubmitting('google');
      socialAuthLogger.debug('google login start', {
        platform: Platform.OS,
        config: getGoogleClientConfigDebug(),
      });
      if (Platform.OS === 'android' && !hasGoogleWebClientIdConfigured()) {
        socialAuthLogger.warn('google web client id missing', getGoogleClientConfigDebug());
        showSocialFailure(
          'Google 로그인 설정 필요',
          'Android용 Google Web Client ID가 설정되지 않아 로그인을 진행할 수 없어요.',
        );
        return;
      }

      await GoogleSignin.hasPlayServices?.();

      const signInResult = await GoogleSignin.signIn();
      const idToken = await getGoogleIdTokenFromSignInResult(signInResult);

      if (!idToken) {
        socialAuthLogger.warn('google id token missing', {
          platform: Platform.OS,
          config: getGoogleClientConfigDebug(),
        });
        showSocialFailure(
          'Google 로그인 실패',
          'Google ID 토큰을 가져오지 못했어요. Firebase/Google Cloud의 Web Client ID 설정을 확인해주세요.',
        );
        return;
      }

      socialAuthLogger.debug('google id token received', { platform: Platform.OS });
      const result = await socialLogin('google', {
        idToken,
      });
      handleSocialAuthResult(result);
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      socialAuthLogger.warn('google login failed', {
        ...summarizeSocialError(e),
        config: getGoogleClientConfigDebug(),
      });
      showSocialFailure('Google 로그인 실패', e?.message || 'Google 로그인을 진행하지 못했어요.');
    } finally {
      setSocialSubmitting(null);
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
          <View style={styles.backgroundLayer} pointerEvents="none">
            <View style={styles.orbOne} />
            <View style={styles.orbTwo} />
          </View>

          <View style={styles.header}>
            <Text style={styles.appTitle}>접시</Text>
            <Text style={styles.appSubtitle}>맛집을 담는 나만의 기록</Text>
          </View>

          <View style={styles.formCard}>
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

            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>또는</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.socialContainer}>
              <Text style={styles.socialLabel}>빠른 로그인</Text>

              <View style={styles.socialIconRow}>
                {shouldShowAppleLogin && (
                  <TouchableOpacity
                    style={[styles.socialIconButton, styles.appleIconButton]}
                    onPress={() => handleSocialPress('apple')}
                    activeOpacity={0.8}
                    disabled={!canUseSocial}
                  >
                    <Icon name="logo-apple" size={20} color="#fff" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.socialIconButton, styles.kakaoIconButton]}
                  onPress={() => handleSocialPress('kakao')}
                  activeOpacity={0.8}
                  disabled={!canUseSocial}
                >
                  <Text style={styles.socialIconTextDark}>K</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialIconButton, styles.googleIconButton]}
                  onPress={() => handleSocialPress('google')}
                  activeOpacity={0.8}
                  disabled={!canUseSocial}
                >
                  <Icon name="logo-google" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {onContinueAsGuest && (
              <TouchableOpacity
                style={styles.guestButton}
                onPress={onContinueAsGuest}
                activeOpacity={0.8}
              >
                <Text style={styles.guestText}>비회원으로 둘러보기</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const createStyles = ({
  colors,
  spacing,
  typography,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
}) =>
  StyleSheet.create({
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
      gap: spacing.xl,
    },
    header: {
      marginTop: spacing.md,
    },
    appTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    appSubtitle: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 14,
    },
    formCard: {
      borderRadius: 22,
      padding: spacing.xl,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
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
    guestButton: {
      marginTop: spacing.lg,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
    },
    guestText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '700',
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
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    orbOne: {
      position: 'absolute',
      top: -120,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.backgroundSoft,
      opacity: 0.35,
    },
    orbTwo: {
      position: 'absolute',
      bottom: -140,
      left: -100,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: colors.backgroundSoft,
      opacity: 0.4,
    },
  });
