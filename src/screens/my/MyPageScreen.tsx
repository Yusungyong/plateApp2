import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { buildProfileUri } from '../../utils/profileImage';
import ProfileSectionCard from './components/ProfileSectionCard';
import SettingsRow from './components/SettingsRow';
import {
  fetchMyUnifiedProfile,
  type UnifiedProfileData,
} from './utils/profileViewModel';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MyPageScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UnifiedProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.username) {
      setProfile(null);
      setError('로그인이 필요한 페이지입니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyUnifiedProfile(user.username);
      setProfile(data);
    } catch {
      setError('마이페이지 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      loadProfile().catch(() => {});
    }, [loadProfile]),
  );

  const profileImageSource = useMemo(
    () => ({
      uri: buildProfileUri(profile?.username ?? user?.username, profile?.profileImageUrl ?? null),
      cache: 'force-cache' as const,
    }),
    [profile?.profileImageUrl, profile?.username, user?.username],
  );

  const headerSubtitle = useMemo(() => {
    if (profile?.email) {
      return profile.email;
    }
    if (profile?.username ?? user?.username) {
      return `@${profile?.username ?? user?.username}`;
    }
    return '로그인이 필요합니다.';
  }, [profile?.email, profile?.username, user?.username]);

  const heroChips = useMemo(
    () =>
      [
        profile?.providerLabel ?? '일반 계정',
        profile?.isPrivate ? '비공개 계정' : '공개 계정',
        profile?.activeRegion ?? '활동 지역 미설정',
      ].filter(Boolean),
    [profile?.activeRegion, profile?.isPrivate, profile?.providerLabel],
  );

  const metricItems = useMemo(
    () => [
      {
        key: 'posts',
        label: '게시물',
        value: profile?.stats.totalPostCount ?? 0,
        onPress: () => navigation.navigate('MyPosts'),
      },
      {
        key: 'likes',
        label: '좋아요',
        value: profile?.stats.likeCount ?? 0,
        onPress: () => navigation.navigate('MyLikes'),
      },
      {
        key: 'friends',
        label: '친구',
        value: profile?.friendsCount ?? 0,
        onPress: () => navigation.navigate('MyFriends'),
      },
    ],
    [navigation, profile?.friendsCount, profile?.stats.likeCount, profile?.stats.totalPostCount],
  );

  const quickMenuRows = useMemo(
    () => [
      {
        key: 'posts',
        icon: 'albums-outline' as const,
        title: '내 콘텐츠',
        value: `${profile?.stats.videoCount ?? 0} 영상 · ${profile?.stats.imageCount ?? 0} 이미지`,
        onPress: () => navigation.navigate('MyPosts'),
      },
      {
        key: 'likes',
        icon: 'heart-outline' as const,
        title: '좋아요 보관함',
        value: `${profile?.stats.likeCount ?? 0}개`,
        onPress: () => navigation.navigate('MyLikes'),
      },
      {
        key: 'friends',
        icon: 'people-outline' as const,
        title: '친구',
        value: `${profile?.friendsCount ?? 0}명`,
        onPress: () => navigation.navigate('MyFriends'),
      },
    ],
    [
      navigation,
      profile?.friendsCount,
      profile?.stats.imageCount,
      profile?.stats.likeCount,
      profile?.stats.videoCount,
    ],
  );

  const statusRows = useMemo(
    () => [
      {
        key: 'recent',
        title: '최근 활동',
        value: formatDate(profile?.stats.recentActivityAt) || '아직 기록 없음',
      },
      {
        key: 'comments',
        title: '댓글',
        value: `${profile?.stats.commentCount ?? 0}개`,
      },
      {
        key: 'visibility',
        title: '공개 범위',
        value: profile?.isPrivate ? '비공개' : '공개',
      },
      {
        key: 'joined',
        title: '가입일',
        value: formatDate(profile?.createdAt) || '-',
      },
    ],
    [
      profile?.createdAt,
      profile?.isPrivate,
      profile?.stats.commentCount,
      profile?.stats.recentActivityAt,
    ],
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  }, [navigation]);

  return (
    <AppLayout
      title="프로필"
      showBack
      showNotification={false}
      footer={null}
      onPressBack={handleBack}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 36, 60) },
        ]}
      >
        {loading && !profile ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.centerText}>내 정보를 불러오는 중이에요.</Text>
          </View>
        ) : error && !profile ? (
          <View style={styles.centerBox}>
            <Text style={[styles.centerText, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfile} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ProfileSectionCard style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Image source={profileImageSource} style={styles.avatarImage} />

                <View style={styles.heroBody}>
                  <Text style={styles.heroTitle}>{profile?.displayName ?? user?.username ?? '게스트'}</Text>
                  <Text style={styles.heroSubtitle}>{headerSubtitle}</Text>
                  <View style={styles.heroChipRow}>
                    {heroChips.map((chip) => (
                      <View key={chip} style={styles.heroChip}>
                        <Text style={styles.heroChipText}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.metricStrip}>
                {metricItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.metricItem, index === metricItems.length - 1 && styles.metricItemLast]}
                    activeOpacity={0.88}
                    onPress={item.onPress}
                  >
                    <Text style={styles.metricValue}>{item.value}</Text>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.heroActionRow}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('ProfileEdit')}
                >
                  <Ionicons name="person-circle-outline" size={16} color={colors.background} />
                  <Text style={styles.primaryActionText}>프로필 설정</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('AccountSettings')}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.secondaryActionText}>계정 · 보안</Text>
                </TouchableOpacity>
              </View>
            </ProfileSectionCard>

            <ProfileSectionCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>자주 찾는 메뉴</Text>
              </View>

              {quickMenuRows.map((item, index) => (
                <SettingsRow
                  key={item.key}
                  icon={item.icon}
                  title={item.title}
                  value={item.value}
                  onPress={item.onPress}
                  isLast={index === quickMenuRows.length - 1}
                />
              ))}
            </ProfileSectionCard>

            <ProfileSectionCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>내 상태</Text>
              </View>

              <View style={styles.statusGrid}>
                {statusRows.map((item) => (
                  <View key={item.key} style={styles.statusTile}>
                    <Text style={styles.statusTileLabel}>{item.title}</Text>
                    <Text style={styles.statusTileValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </ProfileSectionCard>
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default MyPageScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    centerBox: {
      marginTop: 120,
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    centerText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorText: {
      color: '#c43737',
    },
    retryButton: {
      marginTop: 16,
      borderRadius: 18,
      backgroundColor: colors.textPrimary,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    retryButtonText: {
      color: colors.background,
      fontWeight: '700',
    },
    heroCard: {
      paddingHorizontal: 18,
      paddingVertical: 18,
      marginBottom: 16,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      shadowColor: 'rgba(15, 23, 42, 0.06)',
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarImage: {
      width: 74,
      height: 74,
      borderRadius: 24,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    heroBody: {
      flex: 1,
      marginLeft: 12,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    heroSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
    },
    heroChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
    },
    heroChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      marginRight: 8,
      marginBottom: 8,
    },
    heroChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    metricStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    metricItem: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      alignItems: 'center',
      marginRight: 8,
    },
    metricItemLast: {
      marginRight: 0,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    metricLabel: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },
    heroActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    primaryAction: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 12,
      backgroundColor: colors.textPrimary,
    },
    primaryActionText: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '800',
      color: colors.background,
    },
    secondaryAction: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    secondaryActionText: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionCard: {
      padding: 20,
      marginBottom: 16,
    },
    sectionHeader: {
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    statusTile: {
      width: '48.4%',
      minHeight: 76,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 10,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    statusTileLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statusTileValue: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
  });
