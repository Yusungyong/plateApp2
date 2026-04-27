import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/AuthProvider';
import { deleteAccount, deleteSocialAccount } from '../../../api/profileApi';
import { fetchMyProfileSummary } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useTheme } from '../../../styles/theme';
import ProfileSectionCard from '../components/ProfileSectionCard';
import {
  configureGoogleSocialAuth,
  isSocialAuthCancelled,
  reauthenticateSocialAccount,
} from '../../../auth/socialAuth';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SocialProviderCode = 'apple' | 'google' | 'kakao';

const normalizeSocialProvider = (value?: string | null): SocialProviderCode | null => {
  const code = value?.trim().toLowerCase();
  if (code === 'apple' || code === 'google' || code === 'kakao') {
    return code;
  }
  return null;
};

const getProviderLabel = (provider: SocialProviderCode) => {
  if (provider === 'apple') return 'Apple';
  if (provider === 'google') return 'Google';
  return 'Kakao';
};

const getProviderIcon = (provider: SocialProviderCode): React.ComponentProps<typeof Ionicons>['name'] => {
  if (provider === 'apple') return 'logo-apple';
  if (provider === 'google') return 'logo-google';
  return 'chatbubble-ellipses-outline';
};

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [provider, setProvider] = useState<SocialProviderCode | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const isSocialAccount = Boolean(provider);
  const providerLabel = provider ? getProviderLabel(provider) : null;

  useEffect(() => {
    configureGoogleSocialAuth();
  }, []);

  const loadAccountType = useCallback(async () => {
    if (!user?.username) {
      setProvider(null);
      setProviderError('로그인이 필요한 화면입니다.');
      return;
    }

    try {
      setLoadingProvider(true);
      setProviderError(null);
      const summary = await fetchMyProfileSummary();
      setProvider(normalizeSocialProvider(summary.social?.provider));
    } catch {
      setProvider(null);
      setProviderError('계정 유형을 확인하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoadingProvider(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      void loadAccountType();
    }, [loadAccountType]),
  );

  const warningItems = useMemo(
    () => [
      '프로필과 계정 정보는 복구할 수 없습니다.',
      '작성한 콘텐츠는 서버 정책에 따라 즉시 삭제되거나 비노출 처리될 수 있습니다.',
      '탈퇴가 완료되면 현재 기기에서도 자동으로 로그아웃됩니다.',
    ],
    [],
  );

  const socialWarningItems = useMemo(
    () => [
      '소셜 계정 탈퇴는 비밀번호 대신 연동 서비스 재인증이 필요합니다.',
      'Google, Apple, Kakao 계정 자체가 삭제되는 것은 아닙니다.',
      '앱 내부 계정과 연결된 개인정보 및 활동 데이터만 삭제 대상입니다.',
    ],
    [],
  );

  const submitDelete = useCallback(() => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      Alert.alert('비밀번호 확인', '회원 탈퇴를 진행하려면 현재 비밀번호를 입력해 주세요.');
      return;
    }

    Alert.alert('회원 탈퇴', '정말 탈퇴할까요? 이 작업은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '회원 탈퇴',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeleting(true);
              await deleteAccount(trimmedPassword);

              if (user?.username) {
                await logProfileHistory(user.username, {
                  changeType: 'ACCOUNT_DELETE',
                  before: { username: user.username },
                  after: null,
                  memo: 'DeleteAccountScreen',
                });
              }

              await logout();
            } catch (error) {
              setDeleting(false);
              const message =
                error instanceof Error && error.message
                  ? error.message
                  : '회원 탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
              Alert.alert('탈퇴 실패', message);
            }
          })();
        },
      },
    ]);
  }, [logout, password, user?.username]);

  const handleSocialDelete = useCallback(() => {
    const activeProvider = provider;
    if (!providerLabel || !activeProvider) return;
    Alert.alert('회원 탈퇴', `${providerLabel} 계정으로 다시 확인한 뒤 탈퇴를 진행할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '회원 탈퇴',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeleting(true);
              const payload = await reauthenticateSocialAccount(activeProvider);
              await deleteSocialAccount(payload);

              if (user?.username) {
                await logProfileHistory(user.username, {
                  changeType: 'ACCOUNT_DELETE',
                  before: { username: user.username, provider: activeProvider },
                  after: null,
                  memo: 'DeleteAccountScreen.social',
                });
              }

              await logout();
            } catch (error) {
              setDeleting(false);
              if (isSocialAuthCancelled(activeProvider, error)) {
                return;
              }
              const message =
                error instanceof Error && error.message
                  ? error.message
                  : `${providerLabel} 재인증 기반 탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.`;
              Alert.alert('탈퇴 실패', message);
            }
          })();
        },
      },
    ]);
  }, [logout, provider, providerLabel, user?.username]);

  return (
    <AppLayout
      title="회원 탈퇴"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProfileSectionCard style={styles.warningCard}>
          <Text style={styles.warningTitle}>탈퇴 전 확인해 주세요</Text>
          {warningItems.map((item) => (
            <View key={item} style={styles.warningRow}>
              <View style={styles.warningDot} />
              <Text style={styles.warningText}>{item}</Text>
            </View>
          ))}
        </ProfileSectionCard>

        {loadingProvider ? (
          <ProfileSectionCard style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
            <Text style={styles.loadingText}>계정 유형을 확인하는 중…</Text>
          </ProfileSectionCard>
        ) : providerError ? (
          <ProfileSectionCard style={styles.formCard}>
            <Text style={styles.errorTitle}>계정 유형을 확인하지 못했어요</Text>
            <Text style={styles.helpText}>{providerError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() => {
                void loadAccountType();
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </ProfileSectionCard>
        ) : isSocialAccount && provider ? (
          <>
            <ProfileSectionCard style={styles.socialCard}>
              <View style={styles.socialHeader}>
                <View style={styles.socialIconWrap}>
                  <Ionicons name={getProviderIcon(provider)} size={20} color={colors.textPrimary} />
                </View>
                <View style={styles.socialHeaderBody}>
                  <Text style={styles.socialTitle}>{providerLabel} 연동 계정</Text>
                  <Text style={styles.socialSubtitle}>
                    소셜 계정은 비밀번호 대신 연동 서비스 재인증으로 탈퇴를 진행합니다.
                  </Text>
                </View>
              </View>

              {socialWarningItems.map((item) => (
                <View key={item} style={styles.warningRow}>
                  <View style={styles.warningDot} />
                  <Text style={styles.warningText}>{item}</Text>
                </View>
              ))}
            </ProfileSectionCard>

            <ProfileSectionCard style={styles.formCard}>
              <Text style={styles.label}>본인 확인 방식</Text>
              <Text style={styles.helpText}>
                {providerLabel} 계정으로 다시 확인한 뒤 탈퇴를 진행합니다. 재인증이 완료되면 앱 내부 계정과 연결 데이터를 삭제합니다.
              </Text>

              <TouchableOpacity
                style={[styles.socialDeleteButton, deleting && styles.deleteButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleSocialDelete}
                disabled={deleting}
              >
                <Ionicons name={getProviderIcon(provider)} size={18} color="#fff" />
                <Text style={styles.socialDeleteButtonText}>
                  {deleting ? '재인증 후 탈퇴 처리 중…' : `${providerLabel} 계정으로 확인 후 탈퇴`}
                </Text>
              </TouchableOpacity>
            </ProfileSectionCard>
          </>
        ) : (
          <ProfileSectionCard style={styles.formCard}>
            <Text style={styles.label}>현재 비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="현재 비밀번호를 입력하세요"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              editable={!deleting}
            />
            <Text style={styles.helpText}>
              일반 계정은 현재 비밀번호 확인 후 바로 탈퇴를 진행합니다.
            </Text>

            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              activeOpacity={0.85}
              onPress={submitDelete}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? '탈퇴 처리 중…' : '회원 탈퇴'}
              </Text>
            </TouchableOpacity>
          </ProfileSectionCard>
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default DeleteAccountScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
    },
    warningCard: {
      padding: 18,
      marginBottom: 16,
      backgroundColor: '#fff5f4',
      borderColor: '#f1d0cd',
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#8f2f2c',
      marginBottom: 12,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    warningDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#d25555',
      marginTop: 7,
      marginRight: 10,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      color: '#6a3d3d',
    },
    formCard: {
      padding: 18,
    },
    loadingCard: {
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.textSecondary,
    },
    socialCard: {
      padding: 18,
      marginBottom: 16,
    },
    socialHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    socialIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    socialHeaderBody: {
      flex: 1,
    },
    socialTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    socialSubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.backgroundSoft,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.textPrimary,
    },
    helpText: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    retryButton: {
      marginTop: 18,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteButton: {
      marginTop: 20,
      height: 52,
      borderRadius: 18,
      backgroundColor: '#d64545',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonDisabled: {
      opacity: 0.6,
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    socialDeleteButton: {
      marginTop: 20,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    socialDeleteButtonText: {
      marginLeft: 8,
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });
