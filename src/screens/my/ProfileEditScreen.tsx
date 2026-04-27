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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { useTheme } from '../../styles/theme';
import { buildProfileUri } from '../../utils/profileImage';
import { formatDate } from '../../utils/dateTime';
import ProfileSectionCard from './components/ProfileSectionCard';
import SettingsRow from './components/SettingsRow';
import {
  fetchUnifiedProfileDetail,
  type UnifiedProfileData,
} from './utils/profileViewModel';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProfileEdit'>;

type StatItem = {
  key: string;
  label: string;
  value: string;
  onPress?: () => void;
};

const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const targetUsername = route.params?.username ?? user?.username ?? '';
  const isOwnProfile = Boolean(user?.username) && user?.username === targetUsername;
  const [detail, setDetail] = useState<UnifiedProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!targetUsername) {
      setDetail(null);
      setError('로그인 후 프로필을 확인할 수 있습니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchUnifiedProfileDetail({
        username: targetUsername,
        isOwnProfile,
      });
      setDetail(data);
    } catch {
      setError('프로필 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, targetUsername]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const statItems = useMemo<StatItem[]>(
    () => [
      {
        key: 'video',
        label: '동영상',
        value: String(detail?.stats.videoCount ?? 0),
        onPress: detail
          ? () =>
              navigation.navigate('ProfileContentGrid', {
                type: 'video',
                title: '동영상',
                username: detail.username,
              })
          : undefined,
      },
      {
        key: 'image',
        label: '이미지',
        value: String(detail?.stats.imageCount ?? 0),
        onPress: detail
          ? () =>
              navigation.navigate('ProfileContentGrid', {
                type: 'image',
                title: '이미지',
                username: detail.username,
              })
          : undefined,
      },
      {
        key: 'likes',
        label: '좋아요',
        value: String(detail?.stats.likeCount ?? 0),
        onPress: detail
          ? () =>
              navigation.navigate('ProfileContentGrid', {
                type: 'like',
                title: '좋아요',
                username: detail.username,
              })
          : undefined,
      },
      {
        key: 'recent',
        label: '최근 활동',
        value: formatDate(detail?.stats.recentActivityAt) || '-',
      },
    ],
    [detail, navigation],
  );

  const heroChips = useMemo(
    () =>
      [
        `친구 ${detail?.friendsCount ?? 0}명`,
        detail?.activeRegion ?? null,
        isOwnProfile ? (detail?.isPrivate ? '비공개 계정' : '공개 계정') : null,
      ].filter(Boolean) as string[],
    [detail?.activeRegion, detail?.friendsCount, detail?.isPrivate, isOwnProfile],
  );

  const profileImageSource = useMemo(
    () => ({
      uri: buildProfileUri(detail?.username, detail?.profileImageUrl ?? null),
      cache: 'force-cache' as const,
    }),
    [detail?.profileImageUrl, detail?.username],
  );

  return (
    <AppLayout
      title={isOwnProfile ? '프로필 설정' : '프로필'}
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
          <Text style={styles.pageEyebrow}>{isOwnProfile ? 'PROFILE STUDIO' : 'PROFILE'}</Text>
          <Text style={styles.pageTitle}>
            {isOwnProfile
              ? '프로필과 활동 정보를 한눈에 보고 바로 수정할 수 있습니다.'
              : '프로필과 최근 활동을 한 화면에서 확인할 수 있습니다.'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isOwnProfile
              ? '사진, 이름, 지역, 콘텐츠 이동과 계정 설정까지 흐름대로 정리했습니다.'
              : '공개된 활동과 프로필 요약을 정리해서 보여줍니다.'}
          </Text>
        </View>

        {loading && !detail ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.centerText}>프로필을 불러오는 중…</Text>
          </View>
        ) : error && !detail ? (
          <View style={styles.centerBox}>
            <Text style={[styles.centerText, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDetail} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : !detail ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerText}>표시할 프로필 정보가 없습니다.</Text>
          </View>
        ) : (
          <>
            <ProfileSectionCard style={styles.heroCard}>
              <View style={styles.heroGlowLarge} />
              <View style={styles.heroGlowSmall} />

              <View style={styles.heroTop}>
                <TouchableOpacity
                  activeOpacity={detail.profileImageUrl ? 0.85 : 1}
                  disabled={!detail.profileImageUrl}
                  onPress={() =>
                    navigation.navigate('ProfileImageViewer', {
                      uri: detail.profileImageUrl ?? undefined,
                      title: detail.displayName,
                      username: detail.username,
                    })
                  }
                >
                  <Image source={profileImageSource} style={styles.profileImage} />
                </TouchableOpacity>
                <View style={styles.heroBody}>
                  <Text style={styles.heroEyebrow}>{isOwnProfile ? 'MY PROFILE' : 'PROFILE'}</Text>
                  <Text style={styles.heroName}>{detail.displayName}</Text>
                  <Text style={styles.heroUsername}>@{detail.username}</Text>
                  {detail.email && isOwnProfile ? (
                    <Text style={styles.heroEmail}>{detail.email}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.chipRow}>
                {heroChips.map((chip) => (
                  <View key={chip} style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </View>
                ))}
              </View>

              {isOwnProfile ? (
                <View style={styles.heroActionRow}>
                  <TouchableOpacity
                    style={styles.heroPrimaryAction}
                    activeOpacity={0.88}
                    onPress={() =>
                      navigation.navigate('EditProfileImage', {
                        initialValue: detail.profileImageUrl ?? '',
                      })
                    }
                  >
                    <Ionicons name="image-outline" size={16} color={colors.background} />
                    <Text style={styles.heroPrimaryActionText}>사진 변경</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroSecondaryAction}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('AccountSettings')}
                  >
                    <Ionicons name="shield-outline" size={16} color={colors.textPrimary} />
                    <Text style={styles.heroSecondaryActionText}>계정/보안</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ProfileSectionCard>

            <ProfileSectionCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>활동 요약</Text>
                <Text style={styles.sectionHint}>콘텐츠와 반응을 바로 확인할 수 있게 배치했습니다.</Text>
              </View>
              <View style={styles.statGrid}>
                {statItems.map((item) => {
                  const Container = item.onPress ? TouchableOpacity : View;
                  return (
                    <Container
                      key={item.key}
                      style={[styles.statTile, !item.onPress && styles.statTileStatic]}
                      {...(item.onPress ? { activeOpacity: 0.88, onPress: item.onPress } : {})}
                    >
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Text style={styles.statValue}>{item.value}</Text>
                    </Container>
                  );
                })}
              </View>
            </ProfileSectionCard>

            {isOwnProfile ? (
              <>
                <ProfileSectionCard style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>프로필 편집</Text>
                    <Text style={styles.sectionHint}>자주 바꾸는 프로필 정보부터 앞에 배치했습니다.</Text>
                  </View>
                  <SettingsRow
                    icon="create-outline"
                    title="닉네임"
                    description="프로필에 표시되는 이름"
                    value={detail.displayName}
                    onPress={() =>
                      navigation.navigate('EditNickname', {
                        initialValue: detail.displayName,
                      })
                    }
                  />
                  <SettingsRow
                    icon="location-outline"
                    title="활동 지역"
                    description="친구와 주변 추천에 사용"
                    value={detail.activeRegion ?? '미설정'}
                    onPress={() =>
                      navigation.navigate('EditRegion', {
                        initialValue: detail.activeRegion ?? '',
                      })
                    }
                    isLast
                  />
                </ProfileSectionCard>

                <ProfileSectionCard style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>이동 허브</Text>
                    <Text style={styles.sectionHint}>프로필에서 자주 이어지는 화면을 묶었습니다.</Text>
                  </View>
                  <SettingsRow
                    icon="albums-outline"
                    title="내 콘텐츠"
                    description="업로드한 영상과 이미지를 정리"
                    onPress={() => navigation.navigate('MyPosts')}
                  />
                  <SettingsRow
                    icon="heart-outline"
                    title="좋아요"
                    description="저장해 둔 피드 다시 보기"
                    onPress={() => navigation.navigate('MyLikes')}
                  />
                  <SettingsRow
                    icon="people-outline"
                    title="친구"
                    description="친구 요청과 방문 기록 관리"
                    onPress={() => navigation.navigate('MyFriends')}
                  />
                  <SettingsRow
                    icon="shield-checkmark-outline"
                    title="계정 센터"
                    description="이메일, 비밀번호, 로그아웃, 탈퇴"
                    onPress={() => navigation.navigate('AccountSettings')}
                    isLast
                  />
                </ProfileSectionCard>

                <ProfileSectionCard style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>계정 상태</Text>
                    <Text style={styles.sectionHint}>연동 계정과 공개 정보는 읽기 전용으로 따로 정리했습니다.</Text>
                  </View>
                  <SettingsRow
                    icon="mail-outline"
                    title="이메일"
                    value={detail.email ?? '미등록'}
                    description="계정 센터에서 수정"
                  />
                  <SettingsRow
                    icon="call-outline"
                    title="휴대폰"
                    value={detail.phone ?? '미등록'}
                    description="계정 센터에서 수정"
                  />
                  <SettingsRow
                    icon="lock-closed-outline"
                    title="공개 범위"
                    value={detail.isPrivate ? '비공개' : '공개'}
                    description="계정 센터에서 변경"
                  />
                  <SettingsRow
                    icon="link-outline"
                    title="연동 계정"
                    value={detail.providerLabel ?? '일반 계정'}
                    description={`가입일 ${formatDate(detail.createdAt) || '-'}`}
                    isLast
                  />
                </ProfileSectionCard>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default ProfileEditScreen;

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
    centerBox: {
      marginTop: 120,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    centerText: {
      marginTop: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorText: {
      color: '#c43737',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.textPrimary,
    },
    retryButtonText: {
      color: colors.background,
      fontWeight: '700',
    },
    heroCard: {
      padding: 20,
      marginBottom: 16,
      position: 'relative',
    },
    heroGlowLarge: {
      position: 'absolute',
      top: -28,
      right: -18,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${colors.brandPrimary}16`,
    },
    heroGlowSmall: {
      position: 'absolute',
      bottom: -14,
      left: -12,
      width: 86,
      height: 86,
      borderRadius: 43,
      backgroundColor: `${colors.brandPrimary}10`,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1,
    },
    profileImage: {
      width: 90,
      height: 90,
      borderRadius: 32,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 3,
      borderColor: colors.background,
    },
    heroBody: {
      flex: 1,
      marginLeft: 16,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.brandPrimary,
    },
    heroName: {
      marginTop: 6,
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    heroUsername: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
    },
    heroEmail: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 18,
      zIndex: 1,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      marginRight: 8,
      marginBottom: 8,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    heroActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      zIndex: 1,
    },
    heroPrimaryAction: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      paddingVertical: 13,
      backgroundColor: colors.textPrimary,
    },
    heroPrimaryActionText: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '800',
      color: colors.background,
    },
    heroSecondaryAction: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      paddingVertical: 13,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    heroSecondaryActionText: {
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
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    statTile: {
      width: '48.3%',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginTop: 12,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    statTileStatic: {
      opacity: 0.95,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statValue: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
  });
