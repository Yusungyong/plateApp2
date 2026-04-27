import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { useTheme } from '../../styles/theme';
import { formatDate } from '../../utils/dateTime';
import ProfileSectionCard from './components/ProfileSectionCard';
import SettingsRow from './components/SettingsRow';
import {
  fetchMyUnifiedProfile,
  type UnifiedProfileData,
} from './utils/profileViewModel';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UnifiedProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.username) {
      setProfile(null);
      setError('로그인이 필요한 화면입니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyUnifiedProfile(user.username);
      setProfile(data);
    } catch {
      setError('계정 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '현재 기기에서 로그인 세션을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  const heroChips = useMemo(
    () =>
      [
        profile?.providerLabel ?? '일반 계정',
        profile?.isPrivate ? '비공개' : '공개',
        profile?.settings.pushNotifications == null
          ? '푸시 -'
          : profile.settings.pushNotifications
            ? '푸시 켜짐'
            : '푸시 꺼짐',
      ].filter(Boolean),
    [profile?.isPrivate, profile?.providerLabel, profile?.settings.pushNotifications],
  );

  const contactTiles = useMemo(
    () => [
      {
        key: 'email',
        icon: 'mail-outline' as const,
        label: '이메일',
        value: profile?.email ?? '미등록',
        onPress: () => navigation.navigate('EditEmail', { initialValue: profile?.email ?? '' }),
      },
      {
        key: 'phone',
        icon: 'call-outline' as const,
        label: '휴대폰',
        value: profile?.phone ?? '미등록',
        onPress: () => navigation.navigate('EditPhone', { initialValue: profile?.phone ?? '' }),
      },
    ],
    [navigation, profile?.email, profile?.phone],
  );

  const documentRows = useMemo(
    () => [
      {
        key: 'terms',
        icon: 'document-text-outline' as const,
        title: '이용약관',
        onPress: () => navigation.navigate('LegalDocument', { documentType: 'terms' }),
      },
      {
        key: 'privacy',
        icon: 'lock-closed-outline' as const,
        title: '개인정보 처리방침',
        onPress: () => navigation.navigate('LegalDocument', { documentType: 'privacy' }),
      },
    ],
    [navigation],
  );

  return (
    <AppLayout
      title="계정 관리"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 36, 56) },
        ]}
      >
        <View style={styles.pageIntro}>
          <Text style={styles.pageEyebrow}>ACCOUNT CENTER</Text>
          <Text style={styles.pageTitle}>개인정보, 보안, 세션을 한 곳에서 관리합니다.</Text>
          <Text style={styles.pageSubtitle}>
            연락처 수정, 공개 범위, 비밀번호 변경, 로그아웃과 탈퇴까지 이 화면으로 묶었습니다.
          </Text>
        </View>

        <ProfileSectionCard style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <Text style={styles.heroTitle}>현재 계정 상태</Text>
          <Text style={styles.heroSubtitle}>
            {profile?.email ?? '이메일 미등록'} · 가입일 {formatDate(profile?.createdAt) || '-'}
          </Text>

          <View style={styles.heroChipRow}>
            {heroChips.map((chip) => (
              <View key={chip} style={styles.heroChip}>
                <Text style={styles.heroChipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusTile}>
              <Text style={styles.statusLabel}>연동 계정</Text>
              <Text style={styles.statusValue}>{profile?.providerLabel ?? '일반 계정'}</Text>
            </View>
            <View style={styles.statusTile}>
              <Text style={styles.statusLabel}>공개 범위</Text>
              <Text style={styles.statusValue}>{profile?.isPrivate ? '비공개' : '공개'}</Text>
            </View>
            <View style={styles.statusTile}>
              <Text style={styles.statusLabel}>언어</Text>
              <Text style={styles.statusValue}>{profile?.settings.language?.toUpperCase() ?? 'KO'}</Text>
            </View>
            <View style={styles.statusTile}>
              <Text style={styles.statusLabel}>푸시 알림</Text>
              <Text style={styles.statusValue}>
                {profile?.settings.pushNotifications == null
                  ? '-'
                  : profile.settings.pushNotifications
                    ? '켜짐'
                    : '꺼짐'}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.brandPrimary} />
              <Text style={styles.inlineLoadingText}>최신 계정 정보를 확인하는 중…</Text>
            </View>
          ) : null}

          {error ? (
            <TouchableOpacity
              style={styles.errorBanner}
              activeOpacity={0.85}
              onPress={loadProfile}
            >
              <Text style={styles.errorBannerText}>{error}</Text>
              <Text style={styles.errorBannerAction}>다시 시도</Text>
            </TouchableOpacity>
          ) : null}
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>연락처 관리</Text>
            <Text style={styles.sectionHint}>로그인과 본인 확인에 쓰는 핵심 정보입니다.</Text>
          </View>

          <View style={styles.contactGrid}>
            {contactTiles.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.contactTile}
                activeOpacity={0.88}
                onPress={item.onPress}
              >
                <View style={styles.contactIconWrap}>
                  <Ionicons name={item.icon} size={18} color={colors.textPrimary} />
                </View>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue} numberOfLines={2}>
                  {item.value}
                </Text>
                <Text style={styles.contactAction}>수정하기</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>보안과 공개</Text>
            <Text style={styles.sectionHint}>계정 보호와 노출 범위를 분리해서 관리합니다.</Text>
          </View>
          <SettingsRow
            icon="lock-closed-outline"
            title="비밀번호 변경"
            description="현재 비밀번호 확인 후 새 비밀번호로 변경"
            onPress={() => navigation.navigate('EditPassword')}
          />
          <SettingsRow
            icon="eye-outline"
            title="공개 설정"
            description="프로필과 활동 노출 범위를 제어"
            value={profile?.isPrivate ? '비공개' : '공개'}
            onPress={() =>
              navigation.navigate('EditPrivacy', { initialValue: profile?.isPrivate ?? false })
            }
          />
          <SettingsRow
            icon="ban-outline"
            title="차단 목록"
            description="차단한 사용자를 확인"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingsRow
            icon="flag-outline"
            title="신고 내역"
            description="내가 제출한 신고 기록"
            onPress={() => navigation.navigate('ReportHistory')}
            isLast
          />
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>세션</Text>
            <Text style={styles.sectionHint}>현재 기기의 로그인 상태를 정리합니다.</Text>
          </View>
          <SettingsRow
            icon="log-out-outline"
            title="로그아웃"
            description="현재 기기의 로그인 세션 종료"
            onPress={handleLogout}
            isLast
          />
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>문서</Text>
            <Text style={styles.sectionHint}>약관과 개인정보 처리방침을 확인합니다.</Text>
          </View>
          {documentRows.map((item, index) => (
            <SettingsRow
              key={item.key}
              icon={item.icon}
              title={item.title}
              onPress={item.onPress}
              isLast={index === documentRows.length - 1}
            />
          ))}
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <View>
              <Text style={styles.dangerTitle}>위험 구역</Text>
              <Text style={styles.dangerDescription}>
                회원 탈퇴는 되돌릴 수 없습니다. 계정과 개인정보가 삭제됩니다.
              </Text>
            </View>
            <View style={styles.dangerIconWrap}>
              <Ionicons name="trash-outline" size={18} color="#c43737" />
            </View>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <Text style={styles.dangerButtonText}>회원 탈퇴 진행</Text>
            <Ionicons name="chevron-forward" size={16} color="#c43737" />
          </TouchableOpacity>
        </ProfileSectionCard>
      </ScrollView>
    </AppLayout>
  );
};

export default AccountSettingsScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    pageIntro: {
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    pageEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.3,
      color: colors.brandPrimary,
    },
    pageTitle: {
      marginTop: 8,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    pageSubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    heroCard: {
      padding: 20,
      marginBottom: 16,
      position: 'relative',
    },
    heroGlowLarge: {
      position: 'absolute',
      top: -30,
      right: -18,
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: `${colors.brandPrimary}16`,
    },
    heroGlowSmall: {
      position: 'absolute',
      bottom: -14,
      left: -10,
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: `${colors.brandPrimary}10`,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      zIndex: 1,
    },
    heroSubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
      zIndex: 1,
    },
    heroChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
      zIndex: 1,
    },
    heroChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      marginRight: 8,
      marginBottom: 8,
    },
    heroChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
      zIndex: 1,
    },
    statusTile: {
      width: '48.3%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
      backgroundColor: colors.backgroundSoft,
    },
    statusLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statusValue: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    inlineLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      zIndex: 1,
    },
    inlineLoadingText: {
      marginLeft: 8,
      fontSize: 12,
      color: colors.textSecondary,
    },
    errorBanner: {
      marginTop: 8,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#fff5f4',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1,
    },
    errorBannerText: {
      flex: 1,
      marginRight: 12,
      fontSize: 12,
      color: '#8f2f2c',
    },
    errorBannerAction: {
      fontSize: 12,
      fontWeight: '700',
      color: '#c43737',
    },
    sectionCard: {
      padding: 20,
      marginBottom: 16,
    },
    sectionHeader: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    sectionHint: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    contactGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    contactTile: {
      width: '48.4%',
      borderRadius: 22,
      padding: 16,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    contactIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      marginBottom: 12,
    },
    contactLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    contactValue: {
      marginTop: 8,
      minHeight: 42,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    contactAction: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPrimary,
    },
    dangerCard: {
      padding: 20,
      marginBottom: 8,
      backgroundColor: '#fff8f7',
      borderColor: '#ffd9d4',
    },
    dangerHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    dangerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: '#8f2f2c',
    },
    dangerDescription: {
      marginTop: 8,
      maxWidth: 250,
      fontSize: 12,
      lineHeight: 18,
      color: '#8f2f2c',
    },
    dangerIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff1ef',
    },
    dangerButton: {
      marginTop: 18,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: '#fff1ef',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dangerButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#c43737',
    },
  });
