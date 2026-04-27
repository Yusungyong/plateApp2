// src/screens/Home/HomeScreen.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NearbyStoreMarker } from '../../api/mapStoreApi';
import { useAuth } from '../../auth/AuthProvider';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { buildFeedImageUrl } from '../../api/homeImageApi';
import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { getUnreadCount } from '../../api/notificationsApi';
import { subscribeNotificationEvents } from '../../notifications/notificationEvents';

import { useHomeVideos } from './hooks/useHomeVideos';
import { useHomeImages } from './hooks/useHomeImages';
import { useHomeMissionCandidates } from './hooks/useHomeMissionCandidates';

import MissionCard from './components/MissionCard';
import SectionCard from './components/SectionCard';
import HomeMapPreview from './contents/HomeMapPreview';
import HomeVideoPreviewRow from './contents/HomeVideoPreviewRow';
import HomeImageThumbnailGrid from './contents/HomeImageThumbnailGrid';
import { lastKnownLocationStatusRef, lastKnownUserLocationRef } from './utils/mapUtils';
import type { HomeLocationStatus, HomeSortType } from './types';
import { buildHomeVideoThumbUrl } from './utils/videoUtils';
import { HOME_COLORS } from './styles/homeTokens';

const ShimmerBox: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const shimmer = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return <Animated.View style={[style, { opacity: shimmer }]} />;
};

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);

  const [sortType, setSortType] = useState<HomeSortType>('RECENT');
  const [nearbyCenter, setNearbyCenter] = useState<typeof lastKnownUserLocationRef.current>(null);
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>(
    lastKnownUserLocationRef.current ? 'granted' : lastKnownLocationStatusRef.current,
  );
  const { videos, loading: videosLoading, error: videosError, loadVideos } = useHomeVideos(user, {
    sortType,
    location: nearbyCenter,
  });
  const { images, loading: imagesLoading, error: imagesError, loadImages } = useHomeImages(4, {
    sortType,
    location: nearbyCenter,
  });
  const {
    candidates: missionCandidates,
    loading: missionLoading,
    error: missionError,
    loadCandidates,
  } = useHomeMissionCandidates(user, { sortType, location: nearbyCenter }, 20);
  const [missionPick, setMissionPick] = useState<{
    key: string;
    type: 'image' | 'video';
    feedNo?: number;
    storeId?: number;
    placeId?: string | null;
    storeName?: string | null;
    address?: string | null;
    thumbnail?: string | null;
    createdAt?: string | null;
  } | null>(null);
  const missionKeyRef = React.useRef<string>('');

  const renderVideoSkeleton = useCallback(
    () => (
      <View style={styles.skeletonRow}>
        <ShimmerBox style={styles.skeletonTile} />
        <ShimmerBox style={styles.skeletonTile} />
      </View>
    ),
    [],
  );

  const renderImageSkeleton = useCallback(
    () => (
      <View style={styles.skeletonGrid}>
        <ShimmerBox style={styles.skeletonSquare} />
        <ShimmerBox style={styles.skeletonSquare} />
        <ShimmerBox style={styles.skeletonSquare} />
        <ShimmerBox style={styles.skeletonSquare} />
      </View>
    ),
    [],
  );

  const renderMissionSkeleton = useCallback(
    () => (
      <View style={styles.missionSkeleton}>
        <ShimmerBox style={styles.missionThumbSkeleton} />
        <View style={styles.missionTextSkeleton}>
          <ShimmerBox style={styles.skeletonLineWide} />
          <ShimmerBox style={styles.skeletonLine} />
        </View>
      </View>
    ),
    [],
  );

  useEffect(() => {
    void loadCandidates();
    void loadVideos();
    void loadImages();
  }, [loadVideos, loadImages, loadCandidates]);

  useEffect(() => {
    if (sortType !== 'NEARBY') {
      return;
    }
    if (lastKnownUserLocationRef.current) {
      if (!nearbyCenter) {
        setNearbyCenter({ ...lastKnownUserLocationRef.current });
      }
      return;
    }
    if (locationStatus === 'denied' || locationStatus === 'unavailable') {
      setSortType('RECENT');
      setNearbyCenter(null);
    }
  }, [locationStatus, nearbyCenter, sortType]);

  const handleSelectSort = useCallback(
    (nextType: HomeSortType) => {
      if (nextType === sortType) return;
      if (nextType === 'NEARBY' && !lastKnownUserLocationRef.current) {
        if (locationStatus === 'denied') {
          Alert.alert(
            '내 주변',
            '위치 권한이 꺼져 있어요. 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.',
          );
          return;
        }
        if (locationStatus === 'unavailable') {
          Alert.alert(
            '내 주변',
            '현재 위치를 아직 찾지 못했어요. 위치 서비스를 켜거나 잠시 후 다시 시도해주세요.',
          );
          return;
        }
        Alert.alert('내 주변', '현재 위치를 확인 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      if (nextType === 'NEARBY') {
        setNearbyCenter(
          lastKnownUserLocationRef.current
            ? { ...lastKnownUserLocationRef.current }
            : null,
        );
      } else {
        setNearbyCenter(null);
      }
      setSortType(nextType);
    },
    [locationStatus, sortType],
  );

  const pickRandomMission = useCallback((sourceCandidates = missionCandidates) => {
    if (sourceCandidates.length === 0) return;
    const currentKey = missionPick?.key;
    let nextPick = sourceCandidates[Math.floor(Math.random() * sourceCandidates.length)];
    if (sourceCandidates.length > 1 && currentKey && nextPick.key === currentKey) {
      for (let i = 0; i < 3; i += 1) {
        const candidate =
          sourceCandidates[Math.floor(Math.random() * sourceCandidates.length)];
        if (candidate.key !== currentKey) {
          nextPick = candidate;
          break;
        }
      }
    }
    setMissionPick(nextPick);
  }, [missionCandidates, missionPick?.key]);

  useEffect(() => {
    if (missionCandidates.length === 0) {
      setMissionPick(null);
      missionKeyRef.current = '';
      return;
    }

    const keySnapshot = missionCandidates.map((item) => item.key).join('|');
    if (missionKeyRef.current === keySnapshot) {
      return;
    }

    missionKeyRef.current = keySnapshot;
    pickRandomMission();
  }, [missionCandidates, pickRandomMission]);

  const missionData = useMemo(() => {
    const baseLabel = sortType === 'NEARBY' ? '내 주변 추천' : '최신 등록 추천';

    if (missionError) {
      return {
        label: '추천 불러오기 실패',
        badgeText: '다시 시도',
        title: '추천 카드를 준비하지 못했어요',
        address: '잠시 후 다시 새로고침하거나 지도로 둘러보세요.',
        type: 'map' as const,
        thumbnailUri: undefined,
      };
    }

    if (!missionPick) {
      return {
        label: sortType === 'NEARBY' ? '내 주변 추천' : '오늘의 추천',
        badgeText: sortType === 'NEARBY' ? '위치 확인 중' : '둘러보기',
        title: sortType === 'NEARBY' ? '주변 추천을 준비하는 중이에요' : '둘러볼 가게를 찾는 중이에요',
        address:
          sortType === 'NEARBY'
            ? '위치가 확인되면 주변 가게 기준으로 추천이 바뀝니다.'
            : '최신 등록 콘텐츠 기준으로 추천 카드를 준비합니다.',
        type: 'map' as const,
        thumbnailUri: undefined,
      };
    }

    const title = missionPick.storeName || '대표 가게';
    const address = missionPick.address || '위치 정보 없음';
    const thumbnailUri =
      missionPick.type === 'image'
        ? buildFeedImageUrl(missionPick.thumbnail ?? null)
        : buildHomeVideoThumbUrl(missionPick.thumbnail ?? null, missionPick.createdAt ?? null);

    return {
      label: baseLabel,
      badgeText: missionPick.type === 'image' ? '이미지' : '영상',
      title,
      address,
      type: missionPick.type,
      thumbnailUri,
    };
  }, [missionError, missionPick, sortType]);

  const sortGuideText = useMemo(() => {
    if (sortType === 'NEARBY') {
      return '추천 카드와 영상·이미지 목록이 현재 위치 기준으로 바뀝니다.';
    }
    return '추천 카드와 영상·이미지 목록이 최신 등록 순으로 정렬됩니다.';
  }, [sortType]);

  const videoSectionTitle = sortType === 'NEARBY' ? '내 주변 영상' : '오늘의 영상';
  const imageSectionTitle = sortType === 'NEARBY' ? '내 주변 이미지' : '오늘의 이미지';

  const handlePressMission = useCallback(() => {
    if (missionPick?.type === 'image' && missionPick.feedNo) {
      navigation.navigate('ImageFeedViewer', { feedId: missionPick.feedNo });
      return;
    }
    if (missionPick?.type === 'video' && missionPick.storeId && missionPick.placeId) {
      navigation.navigate('VideoFeedScreen', {
        username: user?.username ?? '',
        storeId: missionPick.storeId,
        placeId: missionPick.placeId,
      });
      return;
    }
    navigation.navigate('FullScreenMap');
  }, [missionPick, navigation, user?.username]);

  const handleOpenFeed = useCallback(
    (marker: NearbyStoreMarker) => {
      if (!marker.placeId) {
        return;
      }
      if (marker.contentType?.toUpperCase() === 'IMAGE' && marker.imageFeedId) {
        navigation.navigate('ImageFeedViewer', { feedId: marker.imageFeedId });
        return;
      }

      navigation.navigate('VideoFeedScreen', {
        storeId: marker.storeId,
        placeId: marker.placeId,
        username: user?.username ?? undefined,
      });
    },
    [navigation, user?.username],
  );

  const handleResolvedUserLocation = useCallback(
    (coord: { latitude: number; longitude: number }) => {
      if (sortType !== 'NEARBY') {
        return;
      }
      setNearbyCenter((prev) => {
        if (
          prev &&
          Math.abs(prev.latitude - coord.latitude) < 1e-6 &&
          Math.abs(prev.longitude - coord.longitude) < 1e-6
        ) {
          return prev;
        }
        return { ...coord };
      });
    },
    [sortType],
  );

  useEffect(() => {
    if (!isFocused || !user?.username) {
      setUnreadCount(0);
      return;
    }

    let alive = true;
    getUnreadCount()
      .then((count) => {
        if (!alive) return;
        setUnreadCount(count);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [isFocused, user?.username]);

  useEffect(() => {
    if (!isFocused || !user?.username) return;
    const unsubscribe = subscribeNotificationEvents((event) => {
      if (event.type !== 'message') return;
      getUnreadCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    });
    return unsubscribe;
  }, [isFocused, user?.username]);

  return (
    <AppLayout
      title="홈"
      showBack={false}
      showNotification={true}
      notificationCount={unreadCount}
      footer={<FooterTabBar />}
      onPressNotification={() => {
        if (!requireLogin({ message: '알림은 로그인 후 확인할 수 있어요.' })) return;
        navigation.navigate('Notification');
      }}
      onPressFriends={() => {
        if (!requireLogin({ message: '친구 기능은 로그인 후 사용할 수 있어요.' })) return;
        navigation.navigate('MyFriends');
      }}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortChip, sortType === 'RECENT' && styles.sortChipActive]}
            onPress={() => handleSelectSort('RECENT')}
          >
            <Text
              style={[
                styles.sortChipText,
                sortType === 'RECENT' && styles.sortChipTextActive,
              ]}
            >
              최신순
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortType === 'NEARBY' && styles.sortChipActive]}
            onPress={() => handleSelectSort('NEARBY')}
          >
            <Text
              style={[
                styles.sortChipText,
                sortType === 'NEARBY' && styles.sortChipTextActive,
              ]}
            >
              내 주변
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sortGuide}>{sortGuideText}</Text>

        {missionLoading && missionCandidates.length === 0 ? (
          renderMissionSkeleton()
        ) : (
          <MissionCard
            label={missionData.label}
            badgeText={missionData.badgeText}
            title={missionData.title}
            address={missionData.address}
            type={missionData.type as 'video' | 'image' | 'map'}
            thumbnailUri={missionData.thumbnailUri}
            onPress={handlePressMission}
            onRefresh={async () => {
              if (missionLoading) {
                return;
              }

              const items = await loadCandidates(true);
              if (!items.length) return;
              pickRandomMission(items);
            }}
          />
        )}

        <SectionCard title={videoSectionTitle} actionText="새로 고침" onAction={loadVideos}>
          {isFocused ? (
            videosLoading && videos.length === 0 ? (
              renderVideoSkeleton()
            ) : (
              <HomeVideoPreviewRow
                showHeader={false}
                isFocused={isFocused}
                autoPlay={false}
                videos={videos}
                loading={videosLoading}
                errorMsg={videosError}
                onReload={loadVideos}
              />
            )
          ) : (
            <ShimmerBox style={styles.sectionPlaceholder} />
          )}
        </SectionCard>

        <SectionCard
          title="주변 가게 미니맵"
          actionText="전체 지도"
          onAction={() => navigation.navigate('FullScreenMap')}
          style={styles.sectionTighter}
        >
          {isFocused ? (
            <HomeMapPreview
              style={styles.miniMap}
              isActive={true}
              onPressMarker={handleOpenFeed}
              onPressMap={() => navigation.navigate('FullScreenMap')}
              onLocationStatusChange={setLocationStatus}
              onUserLocationResolved={handleResolvedUserLocation}
            />
          ) : (
            <ShimmerBox style={[styles.sectionPlaceholder, styles.mapPlaceholder]} />
          )}
        </SectionCard>

        <SectionCard
          title={imageSectionTitle}
          actionText="새로 고침"
          onAction={loadImages}
          style={styles.sectionTighter}
        >
          {isFocused ? (
            imagesLoading && images.length === 0 ? (
              renderImageSkeleton()
            ) : (
              <HomeImageThumbnailGrid
                showHeader={false}
                items={images}
                loading={imagesLoading}
                errorMsg={imagesError}
                onReload={loadImages}
                onPressItem={(item) => {
                  navigation.navigate('ImageFeedViewer', { feedId: item.feedNo });
                }}
              />
            )
          ) : (
            <ShimmerBox style={styles.sectionPlaceholder} />
          )}
        </SectionCard>

        <View style={styles.homeContent} />
      </ScrollView>
    </AppLayout>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionPlaceholder: {
    height: 220,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.skeleton,
  },
  mapPlaceholder: {
    height: 200,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonTile: {
    width: '48%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skeletonSquare: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.skeleton,
  },
  missionSkeleton: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: HOME_COLORS.skeleton,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  missionThumbSkeleton: {
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.skeletonStrong,
  },
  missionTextSkeleton: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  skeletonLineWide: {
    height: 14,
    borderRadius: 8,
    backgroundColor: HOME_COLORS.skeletonLine,
    width: '70%',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: HOME_COLORS.skeletonLine,
    width: '45%',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HOME_COLORS.chipBorder,
    backgroundColor: HOME_COLORS.surface,
  },
  sortChipActive: {
    borderColor: HOME_COLORS.chipActiveBorder,
    backgroundColor: HOME_COLORS.chipActiveBg,
  },
  sortChipText: {
    fontSize: 12,
    color: HOME_COLORS.textMuted,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: HOME_COLORS.chipActiveBorder,
  },
  sortGuide: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontSize: 12,
    color: HOME_COLORS.textMuted,
  },
  homeContent: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  miniMap: {
    minHeight: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTighter: {
    marginTop: 4,
  },
});
