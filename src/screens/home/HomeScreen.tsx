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
  Easing,
  LayoutChangeEvent,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  Modal,
  Pressable,
  InteractionManager,
  ViewToken,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NearbyStoreMarker } from '../../api/mapStoreApi';
import { toggleFeedLike } from '../../api/imageFeedSocialApi';
import { useAuth } from '../../auth/AuthProvider';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { getUnreadCount, markAllAsRead } from '../../api/notificationsApi';
import { syncFcmTokenOnHomeEntry } from '../../notifications/fcm';
import { subscribeNotificationEvents } from '../../notifications/notificationEvents';
import { likeStore, unlikeStore } from '../../api/videoFeedApi';

import { useHomeVideos } from './hooks/useHomeVideos';
import { useHomeImages } from './hooks/useHomeImages';
import { useHomeContentFeed } from './hooks/useHomeContentFeed';
import { useHomeImpressionTracker } from './hooks/useHomeImpressionTracker';
import { useHomeSeasonal } from './hooks/useHomeSeasonal';
import { useHomeRecommendations } from './hooks/useHomeRecommendations';

import HomeContentFeedPreview from './components/HomeContentFeedPreview';
import HomeRecommendationSection from './components/HomeRecommendationSection';
import type { HomeContentFeedItem } from './mockContentFeedData';
import type { RecommendationItem, RecommendationSurface } from '../../api/recommendationsApi';
import {
  lastKnownLocationStatusRef,
  lastKnownMapRegionRef,
  lastKnownUserLocationRef,
} from './utils/mapUtils';
import type {
  HomeLocationStatus,
  HomeSortType,
  SeasonalHomeData,
  SeasonalHeroItem,
} from './types';
import { HOME_COLORS } from './styles/homeTokens';

const SORT_OPTIONS: HomeSortType[] = ['RECENT', 'NEARBY', 'SEASONAL'];
const SORT_LABELS: Record<HomeSortType, string> = {
  RECENT: '컨텐츠',
  NEARBY: '내 주변',
  SEASONAL: '제철음식',
};
const EMPTY_SEARCH_QUERY_BY_TAB: Record<HomeSortType, string> = {
  RECENT: '',
  NEARBY: '',
  SEASONAL: '',
};
const INITIAL_MOUNTED_SORT_TYPES: Record<HomeSortType, boolean> = {
  RECENT: true,
  NEARBY: false,
  SEASONAL: false,
};
const HOME_RECOMMENDATION_SURFACES: RecommendationSurface[] = [
  'HOME_FEED',
  'NEARBY',
  'SEASONAL',
  'FRIEND',
];
const EMPTY_SEASONAL_HOME_DATA: SeasonalHomeData = {
  basisInfo: { basis: 'MONTH' },
  hero: null,
  chips: [],
  foods: [],
};

const normalizeSearchQuery = (value?: string | null) =>
  String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const matchesSearchQuery = (
  normalizedQuery: string,
  values: Array<string | number | null | undefined>,
) => {
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchQuery(String(value ?? '')).includes(normalizedQuery),
  );
};

const distanceBetweenCoordsMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const earthRadiusMeters = 111_000;
  const dLat = (b.latitude - a.latitude) * earthRadiusMeters;
  const dLng =
    (b.longitude - a.longitude) *
    earthRadiusMeters *
    Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

type SeasonalFoodPreview = SeasonalHomeData['foods'][number];
type SeasonalPreviewPalette = Pick<
  SeasonalHeroItem,
  'accentColor' | 'accentSoftColor' | 'orbStrongColor' | 'orbSoftColor'
>;

const SEASONAL_PREVIEW_FALLBACK_PALETTES: SeasonalPreviewPalette[] = [
  {
    accentColor: '#C66A52',
    accentSoftColor: '#F8E8E1',
    orbStrongColor: '#E9C0B2',
    orbSoftColor: '#F2D8CF',
  },
  {
    accentColor: '#5A9072',
    accentSoftColor: '#E7F3EC',
    orbStrongColor: '#BFE0CF',
    orbSoftColor: '#D9ECE2',
  },
  {
    accentColor: '#6883A3',
    accentSoftColor: '#E8EEF5',
    orbStrongColor: '#C8D4E4',
    orbSoftColor: '#DCE5F0',
  },
];

const resolveSeasonalPreviewPalette = (
  category: string,
  index: number,
): SeasonalPreviewPalette => {
  const normalized = category.trim().toLowerCase();

  if (category.includes('과일') || normalized.includes('fruit')) {
    return {
      accentColor: '#D56963',
      accentSoftColor: '#FCE9E6',
      orbStrongColor: '#F1C0BA',
      orbSoftColor: '#F7DAD6',
    };
  }

  if (
    category.includes('채소') ||
    category.includes('나물') ||
    normalized.includes('vegetable') ||
    normalized.includes('greens')
  ) {
    return {
      accentColor: '#5E9A62',
      accentSoftColor: '#E8F5E7',
      orbStrongColor: '#C4E0C5',
      orbSoftColor: '#DBEEDD',
    };
  }

  if (category.includes('해조') || normalized.includes('seaweed')) {
    return {
      accentColor: '#2C7366',
      accentSoftColor: '#E0F0EB',
      orbStrongColor: '#A8CEC4',
      orbSoftColor: '#CFE5DF',
    };
  }

  if (
    category.includes('해산물') ||
    category.includes('패류') ||
    normalized.includes('seafood') ||
    normalized.includes('shellfish')
  ) {
    return {
      accentColor: '#8A6A47',
      accentSoftColor: '#F4ECE2',
      orbStrongColor: '#DECAB4',
      orbSoftColor: '#EADCCE',
    };
  }

  if (category.includes('생선') || normalized.includes('fish')) {
    return {
      accentColor: '#6D879F',
      accentSoftColor: '#E8EEF4',
      orbStrongColor: '#CBD9E4',
      orbSoftColor: '#DDE7EF',
    };
  }

  if (category.includes('버섯') || normalized.includes('mushroom')) {
    return {
      accentColor: '#8B6A4B',
      accentSoftColor: '#F4EADF',
      orbStrongColor: '#DBC8B3',
      orbSoftColor: '#EBDDCE',
    };
  }

  if (category.includes('곡물') || normalized.includes('grain')) {
    return {
      accentColor: '#D5AE4A',
      accentSoftColor: '#FBF2D8',
      orbStrongColor: '#EFD89A',
      orbSoftColor: '#F6E8C2',
    };
  }

  return SEASONAL_PREVIEW_FALLBACK_PALETTES[index % SEASONAL_PREVIEW_FALLBACK_PALETTES.length];
};

const buildSeasonalPreviewStats = (
  food: SeasonalFoodPreview,
  basis: SeasonalHomeData['basisInfo']['basis'],
  totalFoods: number,
): SeasonalHeroItem['stats'] => [
  { label: '카테고리', value: food.category || '-' },
  {
    label: basis === 'TERM' ? '절기' : '월',
    value: basis === 'TERM' ? String(food.seasonalTerm ?? '-') : `${food.month}월`,
  },
  { label: '항목', value: `${totalFoods}개` },
];

const buildSeasonalPreviewMonthLabel = (
  food: SeasonalFoodPreview,
  basis: SeasonalHomeData['basisInfo']['basis'],
) => {
  if (basis === 'TERM' && food.seasonalTerm) {
    return `${food.seasonalTerm} 무렵의 제철`;
  }
  return `${food.month}월의 제철`;
};

const buildSeasonalPreviewHeadline = (
  food: SeasonalFoodPreview,
  basis: SeasonalHomeData['basisInfo']['basis'],
) => {
  if (basis === 'TERM' && food.seasonalTerm) {
    return `${food.seasonalTerm} 무렵에 먼저 볼 ${food.foodName}`;
  }
  return `${food.month}월에 먼저 볼 ${food.foodName}`;
};

const buildSeasonalPreviewSubcopy = (food: SeasonalFoodPreview) =>
  `${food.foodName}를 중심으로 제철 재료와 연결된 레시피, 근처 가게를 이어서 살펴보세요.`;

const buildSeasonalPreviewHeroItem = (
  food: SeasonalFoodPreview,
  basis: SeasonalHomeData['basisInfo']['basis'],
  totalFoods: number,
  index: number,
  activeHero?: SeasonalHeroItem | null,
): SeasonalHeroItem => {
  if (activeHero && activeHero.seasonalFoodId === food.seasonalFoodId) {
    return activeHero;
  }

  const palette = resolveSeasonalPreviewPalette(food.category, index);

  return {
    seasonalFoodId: food.seasonalFoodId,
    month: food.month,
    monthLabel: buildSeasonalPreviewMonthLabel(food, basis),
    seasonalTerm: food.seasonalTerm ?? null,
    name: food.foodName,
    category: food.category,
    headline: buildSeasonalPreviewHeadline(food, basis),
    subcopy: buildSeasonalPreviewSubcopy(food),
    cardImageUrl: food.cardImageUrl ?? null,
    cardImageMobileUrl: food.cardImageMobileUrl ?? null,
    accentColor: palette.accentColor,
    accentSoftColor: palette.accentSoftColor,
    orbStrongColor: palette.orbStrongColor,
    orbSoftColor: palette.orbSoftColor,
    stats: buildSeasonalPreviewStats(food, basis, totalFoods),
  };
};

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const pagerRef = useRef<ScrollView | null>(null);
  const pendingPagerTargetIndexRef = useRef<number | null>(null);
  const homeEdgeSwipeActiveRef = useRef(false);
  const homeEdgeSwipeStartIndexRef = useRef(0);
  const homeEdgeSwipeStartOffsetRef = useRef(0);
  const searchInputRef = useRef<TextInput | null>(null);
  const seasonalMenuYRef = useRef(0);
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
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const nearbyFeedCenterMetaRef = useRef<{
    coord: { latitude: number; longitude: number } | null;
    updatedAt: number;
  }>({
    coord: lastKnownUserLocationRef.current ? { ...lastKnownUserLocationRef.current } : null,
    updatedAt: 0,
  });
  const nearbyViewportCenterRef = useRef<{ latitude: number; longitude: number } | null>(
    lastKnownMapRegionRef.current
      ? {
          latitude: lastKnownMapRegionRef.current.latitude,
          longitude: lastKnownMapRegionRef.current.longitude,
        }
      : lastKnownUserLocationRef.current
        ? { ...lastKnownUserLocationRef.current }
        : null,
  );
  const pendingNearbyViewportRefreshRef = useRef(false);

  const [sortType, setSortType] = useState<HomeSortType>('RECENT');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTitleMenuVisible, setIsTitleMenuVisible] = useState(false);
  const [searchQueryByTab, setSearchQueryByTab] =
    useState<Record<HomeSortType, string>>(EMPTY_SEARCH_QUERY_BY_TAB);
  const [debouncedContentSearchQuery, setDebouncedContentSearchQuery] = useState('');
  const [isRefreshingContentFeed, setIsRefreshingContentFeed] = useState(false);
  const [nearbyCenter, setNearbyCenter] = useState<typeof lastKnownUserLocationRef.current>(null);
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>(
    lastKnownUserLocationRef.current ? 'granted' : lastKnownLocationStatusRef.current,
  );
  const [seasonalSelectionId, setSeasonalSelectionId] = useState<number | null>(null);
  const [mountedSortTypes, setMountedSortTypes] = useState<Record<HomeSortType, boolean>>(
    INITIAL_MOUNTED_SORT_TYPES,
  );
  const searchProgress = useRef(new Animated.Value(0)).current;
  const isNearbyLayout = sortType === 'NEARBY';
  const isContentMounted = mountedSortTypes.RECENT;
  const isNearbyMounted = mountedSortTypes.NEARBY;
  const isSeasonalMounted = mountedSortTypes.SEASONAL;
  const searchQuery = searchQueryByTab[sortType] ?? '';
  const contentSearchQuery = searchQueryByTab.RECENT ?? '';
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );
  const normalizedDebouncedContentSearchQuery = useMemo(
    () => normalizeSearchQuery(debouncedContentSearchQuery),
    [debouncedContentSearchQuery],
  );
  const currentTabTitle = SORT_LABELS[sortType];
  const searchPlaceholder =
    sortType === 'RECENT'
      ? '가게, 작성자, 제목 검색'
      : sortType === 'NEARBY'
        ? '근처 가게 이름 또는 주소 검색'
        : '제철 음식이나 카테고리 검색';
  const nearbyQuery = useMemo(
    () => ({
      sortType: 'NEARBY' as const,
      location: nearbyCenter,
    }),
    [nearbyCenter],
  );
  const {
    videos,
    loading: videosLoading,
    loadVideos,
  } = useHomeVideos(user, nearbyQuery);
  const {
    images,
    loading: imagesLoading,
    loadImages,
  } = useHomeImages(4, nearbyQuery);
  const {
    seasonal,
    activeSeasonalFoodId,
    loadSeasonal,
  } = useHomeSeasonal(currentMonth);
  const contentFeedLocation = lastKnownUserLocationRef.current ?? nearbyCenter;
  const {
    items: contentFeedItems,
    loading: contentFeedLoading,
    loadingMore: contentFeedLoadingMore,
    error: contentFeedError,
    trackingToken: contentFeedTrackingToken,
    loadInitial: loadContentFeed,
    loadMore: loadMoreContentFeed,
  } = useHomeContentFeed(user, {
    enabled: sortType === 'RECENT',
    location: contentFeedLocation,
    searchQuery: debouncedContentSearchQuery,
  });
  const {
    sections: recommendationSections,
    loading: recommendationsLoading,
    error: recommendationsError,
    loadRecommendations,
  } = useHomeRecommendations(user, {
    enabled: sortType === 'RECENT',
    location: contentFeedLocation,
    currentMonth,
    surfaces: HOME_RECOMMENDATION_SURFACES,
  });
  const NearbyHomeExperienceComponent = useMemo(
    () =>
      isNearbyMounted
        ? (require('./components/NearbyHomeExperience').default as React.ComponentType<any>)
        : null,
    [isNearbyMounted],
  );
  const SeasonalHeroSectionComponent = useMemo(
    () =>
      isSeasonalMounted
        ? (require('./components/SeasonalHeroSection').default as React.ComponentType<any>)
        : null,
    [isSeasonalMounted],
  );
  const SeasonalMenuHubComponent = useMemo(
    () =>
      isSeasonalMounted
        ? (require('./components/SeasonalMenuHub').default as React.ComponentType<any>)
        : null,
    [isSeasonalMounted],
  );
  const contentFeedImageIds = useMemo(
    () =>
      contentFeedItems
        .filter((item) =>
          matchesSearchQuery(normalizedSearchQuery, [
            item.title,
            item.storeName,
            item.address,
            item.author.nickName,
            item.author.username,
          ]),
        )
        .filter(
          (item): item is Extract<HomeContentFeedItem, { contentType: 'IMAGE' }> =>
            item.contentType === 'IMAGE',
        )
        .map((item) => item.imageFeedId ?? item.feedId)
        .filter((feedId): feedId is number => Number.isFinite(feedId) && feedId > 0),
    [contentFeedItems, normalizedSearchQuery],
  );

  const buildContentImageViewerParams = useCallback(
    (
      item: Extract<HomeContentFeedItem, { contentType: 'IMAGE' }>,
      options?: { openComments?: boolean },
    ) => {
      const targetFeedId = item.imageFeedId ?? item.feedId;
      if (!targetFeedId) {
        return null;
      }

      const initialIndex = contentFeedImageIds.findIndex((feedId) => feedId === targetFeedId);
      return {
        feedId: targetFeedId,
        feedIds: contentFeedImageIds.length ? contentFeedImageIds : undefined,
        initialIndex: initialIndex >= 0 ? initialIndex : undefined,
        openComments: options?.openComments ?? false,
      };
    },
    [contentFeedImageIds],
  );

  const handleOpenSearch = useCallback(() => {
    setIsTitleMenuVisible(false);
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleChangeSearchQuery = useCallback(
    (value: string) => {
      setSearchQueryByTab((prev) => ({
        ...prev,
        [sortType]: value,
      }));
    },
    [sortType],
  );

  const handleToggleTitleMenu = useCallback(() => {
    setIsSearchOpen(false);
    setIsTitleMenuVisible((prev) => !prev);
  }, []);

  const handleCloseTitleMenu = useCallback(() => {
    setIsTitleMenuVisible(false);
  }, []);

  useEffect(() => {
    Animated.timing(searchProgress, {
      toValue: isSearchOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!isSearchOpen) {
      searchInputRef.current?.blur();
      return;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 140);

    return () => clearTimeout(timer);
  }, [isSearchOpen, searchProgress]);

  useEffect(() => {
    setIsTitleMenuVisible(false);
  }, [sortType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContentSearchQuery(contentSearchQuery);
    }, 280);

    return () => clearTimeout(timer);
  }, [contentSearchQuery]);

  useEffect(() => {
    pagerRef.current?.scrollTo({
      x: SORT_OPTIONS.indexOf(sortType) * windowWidth,
      animated: false,
    });
  }, [sortType, windowWidth]);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) {
        return;
      }
      if (sortType === 'RECENT') {
        loadContentFeed().catch(() => {});
        loadRecommendations().catch(() => {});
        return;
      }
      if (sortType === 'NEARBY') {
        loadVideos().catch(() => {});
        loadImages().catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [loadContentFeed, loadImages, loadRecommendations, loadVideos, sortType]);

  useEffect(() => {
    if (!activeSeasonalFoodId) {
      return;
    }
    setSeasonalSelectionId(activeSeasonalFoodId);
  }, [activeSeasonalFoodId]);

  useEffect(() => {
    if (sortType !== 'SEASONAL') {
      return;
    }
    loadSeasonal({
      seasonalFoodId: seasonalSelectionId,
      force: true,
      basis: 'MONTH',
    }).catch(() => {});
  }, [loadSeasonal, seasonalSelectionId, sortType]);

  useEffect(() => {
    if (sortType !== 'NEARBY') {
      return;
    }
    if (lastKnownUserLocationRef.current) {
      if (!nearbyCenter) {
        const nextCenter = { ...lastKnownUserLocationRef.current };
        nearbyFeedCenterMetaRef.current = {
          coord: nextCenter,
          updatedAt: Date.now(),
        };
        setNearbyCenter(nextCenter);
      }
      return;
    }
  }, [locationStatus, nearbyCenter, sortType]);

  const markSortTypeMounted = useCallback((nextType: HomeSortType) => {
    setMountedSortTypes((prev) =>
      prev[nextType] ? prev : { ...prev, [nextType]: true },
    );
  }, []);

  const applySortType = useCallback((nextType: HomeSortType) => {
    if (nextType === sortType) {
      return;
    }
    markSortTypeMounted(nextType);
    if (nextType === 'NEARBY') {
      const nextCenter = lastKnownUserLocationRef.current
        ? { ...lastKnownUserLocationRef.current }
        : null;
      nearbyFeedCenterMetaRef.current = {
        coord: nextCenter,
        updatedAt: nextCenter ? Date.now() : 0,
      };
      setNearbyCenter(nextCenter);
    } else {
      setNearbyCenter(null);
    }
    setSortType(nextType);
  }, [markSortTypeMounted, sortType]);

  const scrollPagerToSort = useCallback(
    (nextType: HomeSortType, animated: boolean) => {
      pagerRef.current?.scrollTo({
        x: SORT_OPTIONS.indexOf(nextType) * windowWidth,
        animated,
      });
    },
    [windowWidth],
  );
  const queuePagerTransition = useCallback(
    (nextType: HomeSortType, animated: boolean) => {
      markSortTypeMounted(nextType);
      pendingPagerTargetIndexRef.current = SORT_OPTIONS.indexOf(nextType);
      scrollPagerToSort(nextType, animated);
    },
    [markSortTypeMounted, scrollPagerToSort],
  );
  const maxPagerOffset = useMemo(
    () => windowWidth * (SORT_OPTIONS.length - 1),
    [windowWidth],
  );

  const setPagerOffsetImmediate = useCallback(
    (offset: number) => {
      const nextOffset = Math.max(0, Math.min(offset, maxPagerOffset));
      pagerRef.current?.scrollTo({
        x: nextOffset,
        animated: false,
      });
    },
    [maxPagerOffset],
  );

  const handleSelectSort = useCallback(
    (nextType: HomeSortType) => {
      if (nextType === sortType) return;
      const hasLocation = Boolean(lastKnownUserLocationRef.current);
      const shouldPromptForPermission =
        nextType === 'NEARBY' &&
        !hasLocation &&
        locationStatus === 'denied';

      if (shouldPromptForPermission) {
        pendingPagerTargetIndexRef.current = null;
        scrollPagerToSort(sortType, true);
        Alert.alert(
          '위치 권한이 필요해요',
          '내 주변 가게와 피드를 정확하게 보여드리려면 위치 권한을 허용해주세요.\n\n허용하지 않아도 다른 홈 탭은 계속 이용할 수 있어요.',
          [
            { text: '나중에', style: 'cancel' },
            {
              text: '계속',
              onPress: () => {
                queuePagerTransition('NEARBY', true);
              },
            },
          ],
        );
        return;
      }
      queuePagerTransition(nextType, true);
    },
    [locationStatus, queuePagerTransition, scrollPagerToSort, sortType],
  );

  const handleSelectSortFromTitleMenu = useCallback(
    (nextType: HomeSortType) => {
      setIsTitleMenuVisible(false);
      handleSelectSort(nextType);
    },
    [handleSelectSort],
  );

  const finishHomeEdgeSwipe = useCallback(
    (translationX: number, velocityX: number) => {
      const currentIndex = homeEdgeSwipeStartIndexRef.current;
      const threshold = Math.min(96, windowWidth * 0.18);
      let targetIndex = currentIndex;
      homeEdgeSwipeActiveRef.current = false;

      if ((translationX > threshold || velocityX > 650) && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (
        (translationX < -threshold || velocityX < -650) &&
        currentIndex < SORT_OPTIONS.length - 1
      ) {
        targetIndex = currentIndex + 1;
      }

      const targetType = SORT_OPTIONS[targetIndex];
      const currentType = SORT_OPTIONS[currentIndex] ?? sortType;
      if (!targetType || targetIndex === currentIndex) {
        pendingPagerTargetIndexRef.current = null;
        scrollPagerToSort(currentType, true);
        return;
      }

      handleSelectSort(targetType);
    },
    [handleSelectSort, scrollPagerToSort, sortType, windowWidth],
  );

  const beginHomeEdgeSwipe = useCallback(() => {
    const startIndex = SORT_OPTIONS.indexOf(sortType);
    const previousType = SORT_OPTIONS[startIndex - 1];
    const nextType = SORT_OPTIONS[startIndex + 1];
    setMountedSortTypes((prev) => ({
      ...prev,
      ...(previousType ? { [previousType]: true } : {}),
      ...(nextType ? { [nextType]: true } : {}),
    }));
    homeEdgeSwipeActiveRef.current = true;
    homeEdgeSwipeStartIndexRef.current = startIndex;
    homeEdgeSwipeStartOffsetRef.current = startIndex * windowWidth;
    pendingPagerTargetIndexRef.current = null;
  }, [sortType, windowWidth]);

  const updateHomeEdgeSwipe = useCallback(
    (translationX: number) => {
      const startOffset = homeEdgeSwipeStartOffsetRef.current;
      const nextOffset = Math.max(
        Math.max(0, startOffset - windowWidth),
        Math.min(
          Math.min(maxPagerOffset, startOffset + windowWidth),
          startOffset - translationX,
        ),
      );
      setPagerOffsetImmediate(nextOffset);
    },
    [maxPagerOffset, setPagerOffsetImmediate, windowWidth],
  );

  const leftHomeEdgeGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .activeOffsetX([8, 9999])
        .failOffsetY([-20, 20])
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          runOnJS(beginHomeEdgeSwipe)();
        })
        .onUpdate((event) => {
          runOnJS(updateHomeEdgeSwipe)(event.translationX);
        })
        .onEnd((event) => {
          runOnJS(finishHomeEdgeSwipe)(event.translationX, event.velocityX);
        }),
    [
      beginHomeEdgeSwipe,
      finishHomeEdgeSwipe,
      updateHomeEdgeSwipe,
    ],
  );

  const rightHomeEdgeGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .activeOffsetX([-9999, -8])
        .failOffsetY([-20, 20])
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          runOnJS(beginHomeEdgeSwipe)();
        })
        .onUpdate((event) => {
          runOnJS(updateHomeEdgeSwipe)(event.translationX);
        })
        .onEnd((event) => {
          runOnJS(finishHomeEdgeSwipe)(event.translationX, event.velocityX);
        }),
    [
      beginHomeEdgeSwipe,
      finishHomeEdgeSwipe,
      updateHomeEdgeSwipe,
    ],
  );

  const handlePagerMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (homeEdgeSwipeActiveRef.current) {
        return;
      }
      const computedIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
      const pendingTargetIndex = pendingPagerTargetIndexRef.current;
      const resolvedIndex =
        pendingTargetIndex != null ? pendingTargetIndex : computedIndex;
      pendingPagerTargetIndexRef.current = null;
      const nextType = SORT_OPTIONS[resolvedIndex];
      if (!nextType || nextType === sortType) {
        return;
      }
      applySortType(nextType);
    },
    [applySortType, sortType, windowWidth],
  );

  const seasonalData = useMemo<SeasonalHomeData>(() => {
    if (!isSeasonalMounted) {
      return EMPTY_SEASONAL_HOME_DATA;
    }
    const { buildMockSeasonalHomeDataForMonth } =
      require('./mockSeasonalData') as typeof import('./mockSeasonalData');
    const fallback = buildMockSeasonalHomeDataForMonth(currentMonth, seasonalSelectionId);
    if (!seasonal?.hero?.seasonalFoodId || !seasonal.hero.name) {
      return fallback;
    }
    return {
      basisInfo: seasonal.basisInfo,
      hero: seasonal.hero,
      chips: seasonal.chips.length > 0 ? seasonal.chips : fallback.chips,
      foods: seasonal.foods.length > 0 ? seasonal.foods : fallback.foods,
    };
  }, [currentMonth, isSeasonalMounted, seasonal, seasonalSelectionId]);

  const seasonalHeroItems = useMemo<SeasonalHeroItem[]>(() => {
    if (!isSeasonalMounted) {
      return [];
    }
    const { getSeasonalHeroItemsForMonth } =
      require('./mockSeasonalData') as typeof import('./mockSeasonalData');
    if (!seasonal?.hero?.seasonalFoodId || !seasonal.hero.name) {
      return getSeasonalHeroItemsForMonth(currentMonth);
    }

    const sourceFoods: SeasonalFoodPreview[] =
      seasonal.foods.length > 0
        ? seasonal.foods
        : [
            {
              seasonalFoodId: seasonal.hero.seasonalFoodId,
              seasonalTerm: seasonal.hero.seasonalTerm ?? null,
              month: seasonal.hero.month,
              foodName: seasonal.hero.name,
              category: seasonal.hero.category,
              cardImageUrl: seasonal.hero.cardImageUrl ?? null,
              cardImageMobileUrl: seasonal.hero.cardImageMobileUrl ?? null,
            },
          ];

    return sourceFoods.map((food, index) =>
      buildSeasonalPreviewHeroItem(
        food,
        seasonal.basisInfo.basis,
        sourceFoods.length,
        index,
        seasonal.hero,
      ),
    );
  }, [currentMonth, isSeasonalMounted, seasonal]);

  const filteredContentFeedItems = contentFeedItems;
  const { trackContentFeedImpression } = useHomeImpressionTracker(user);
  const handleContentFeedViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      viewableItems.forEach((viewToken) => {
        const item = viewToken.item as HomeContentFeedItem | undefined;
        if (!item || viewToken.isViewable === false) {
          return;
        }
        trackContentFeedImpression({
          item,
          positionNo: typeof viewToken.index === 'number' ? viewToken.index : null,
          requestId: contentFeedTrackingToken,
        });
      });
    },
    [contentFeedTrackingToken, trackContentFeedImpression],
  );

  const filteredNearbyVideos = useMemo(
    () =>
      normalizedSearchQuery
        ? videos.filter((item) =>
            matchesSearchQuery(normalizedSearchQuery, [
              item.storeName,
              item.title,
              item.address,
              item.nickName,
              item.username,
            ]),
          )
        : videos,
    [normalizedSearchQuery, videos],
  );

  const filteredNearbyImages = useMemo(
    () =>
      normalizedSearchQuery
        ? images.filter((item) =>
            matchesSearchQuery(normalizedSearchQuery, [
              item.storeName,
              item.address,
              item.feedNo,
            ]),
          )
        : images,
    [images, normalizedSearchQuery],
  );

  const filteredSeasonalFoods = useMemo(
    () =>
      normalizedSearchQuery
        ? seasonalData.foods.filter((food) =>
            matchesSearchQuery(normalizedSearchQuery, [
              food.foodName,
              food.category,
              food.seasonalTerm,
              `${food.month}월`,
            ]),
          )
        : seasonalData.foods,
    [normalizedSearchQuery, seasonalData.foods],
  );

  const filteredSeasonalHeroItems = useMemo(
    () =>
      normalizedSearchQuery
        ? seasonalHeroItems.filter((item) =>
            matchesSearchQuery(normalizedSearchQuery, [
              item.name,
              item.category,
              item.headline,
              item.subcopy,
              item.monthLabel,
              item.seasonalTerm,
            ]),
          )
        : seasonalHeroItems,
    [normalizedSearchQuery, seasonalHeroItems],
  );

  const filteredActiveSeasonalItem = useMemo(() => {
    if (filteredSeasonalHeroItems.length === 0) {
      return null;
    }

    const targetId =
      seasonalSelectionId ??
      activeSeasonalFoodId ??
      filteredSeasonalHeroItems[0]?.seasonalFoodId ??
      null;

    if (!targetId) {
      return filteredSeasonalHeroItems[0] ?? null;
    }

    return (
      filteredSeasonalHeroItems.find((item) => item.seasonalFoodId === targetId) ??
      filteredSeasonalHeroItems[0] ??
      null
    );
  }, [activeSeasonalFoodId, filteredSeasonalHeroItems, seasonalSelectionId]);

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
      });
    },
    [navigation],
  );

  const handleResolvedUserLocation = useCallback(
    (coord: { latitude: number; longitude: number }) => {
      if (sortType !== 'NEARBY') {
        return;
      }
      const now = Date.now();
      setNearbyCenter((prev) => {
        const previousCenter = prev ?? nearbyFeedCenterMetaRef.current.coord;
        if (previousCenter) {
          const movedMeters = distanceBetweenCoordsMeters(previousCenter, coord);
          const elapsedMs = now - nearbyFeedCenterMetaRef.current.updatedAt;
          if (movedMeters < 120) {
            return prev ?? previousCenter;
          }
          if (elapsedMs < 15_000 && movedMeters < 400) {
            return prev ?? previousCenter;
          }
        }
        const nextCenter = { ...coord };
        nearbyFeedCenterMetaRef.current = {
          coord: nextCenter,
          updatedAt: now,
        };
        return nextCenter;
      });
    },
    [sortType],
  );

  const handleNearbyViewportCenterChange = useCallback(
    (coord: { latitude: number; longitude: number }) => {
      nearbyViewportCenterRef.current = coord;
    },
    [],
  );

  const handleRefreshNearbyFeeds = useCallback(() => {
    const viewportCenter = nearbyViewportCenterRef.current;
    if (
      sortType === 'NEARBY' &&
      viewportCenter &&
      (!nearbyCenter || distanceBetweenCoordsMeters(nearbyCenter, viewportCenter) >= 80)
    ) {
      pendingNearbyViewportRefreshRef.current = true;
      setNearbyCenter({ ...viewportCenter });
      nearbyFeedCenterMetaRef.current = {
        coord: { ...viewportCenter },
        updatedAt: Date.now(),
      };
      return;
    }
    loadVideos(true).catch(() => undefined);
    loadImages(true).catch(() => undefined);
  }, [loadImages, loadVideos, nearbyCenter, sortType]);

  useEffect(() => {
    if (sortType !== 'NEARBY' || !pendingNearbyViewportRefreshRef.current) {
      return;
    }
    pendingNearbyViewportRefreshRef.current = false;
    loadVideos(true).catch(() => undefined);
    loadImages(true).catch(() => undefined);
  }, [loadImages, loadVideos, nearbyCenter, sortType]);

  const handleRefreshContentFeed = useCallback(() => {
    if (isRefreshingContentFeed) {
      return;
    }
    setIsRefreshingContentFeed(true);
    Promise.all([
      loadContentFeed(true).catch(() => undefined),
      loadRecommendations(true).catch(() => undefined),
    ])
      .catch(() => undefined)
      .finally(() => {
        setIsRefreshingContentFeed(false);
      });
  }, [isRefreshingContentFeed, loadContentFeed, loadRecommendations]);

  const handleOpenContentItem = useCallback(
    (item: HomeContentFeedItem) => {
      if (item.contentType === 'VIDEO') {
        if (!item.storeId || !item.placeId) {
          return;
        }
        navigation.navigate('VideoFeedScreen', {
          storeId: item.storeId,
          placeId: item.placeId,
        });
        return;
      }

      const params = buildContentImageViewerParams(item);
      if (!params) {
        return;
      }
      navigation.navigate('ImageFeedViewer', params);
    },
    [buildContentImageViewerParams, navigation],
  );

  const handleOpenContentComments = useCallback(
    (item: HomeContentFeedItem) => {
      if (item.contentType === 'VIDEO') {
        if (!item.storeId || !item.placeId) {
          return;
        }
        navigation.navigate('VideoFeedScreen', {
          storeId: item.storeId,
          placeId: item.placeId,
          openComments: true,
        });
        return;
      }

      const targetFeedId = item.imageFeedId ?? item.feedId;
      if (!targetFeedId) {
        return;
      }
      const params = buildContentImageViewerParams(item, { openComments: true });
      if (!params) {
        return;
      }
      navigation.navigate('ImageFeedViewer', params);
    },
    [buildContentImageViewerParams, navigation],
  );

  const handleToggleContentLike = useCallback(
    async (item: HomeContentFeedItem) => {
      if (
        !requireLogin({ message: '좋아요는 로그인 후 사용할 수 있어요.' }) ||
        item.isMock
      ) {
        return;
      }

      if (item.contentType === 'VIDEO') {
        if (item.stats.likedByMe) {
          await unlikeStore(item.storeId);
        } else {
          await likeStore(item.storeId);
        }
        return {
          likeCount: Math.max(
            0,
            item.stats.likeCount + (item.stats.likedByMe ? -1 : 1),
          ),
          commentCount: item.stats.commentCount,
          likedByMe: !item.stats.likedByMe,
        };
      }

      const response = await toggleFeedLike(item.feedId);
      return {
        likeCount: Number(response.likeCount ?? item.stats.likeCount),
        commentCount: item.stats.commentCount,
        likedByMe: Boolean(
          response.likedByMe ?? response.liked ?? !item.stats.likedByMe,
        ),
      };
    },
    [requireLogin],
  );

  const handlePressSeasonalMoments = useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(seasonalMenuYRef.current - 10, 0),
      animated: true,
    });
  }, []);

  const handleSeasonalMenuLayout = useCallback((event: LayoutChangeEvent) => {
    seasonalMenuYRef.current = event.nativeEvent.layout.y;
  }, []);

  const handlePressSeasonalRecipe = useCallback(() => {
    navigation.navigate('Recipe');
  }, [navigation]);

  const handlePressSeasonalMap = useCallback(() => {
    navigation.navigate('FullScreenMap');
  }, [navigation]);

  const handleSelectSeasonalItem = useCallback(
    (seasonalFoodId: number) => {
      if (seasonalSelectionId === seasonalFoodId) {
        return;
      }
      setSeasonalSelectionId(seasonalFoodId);
    },
    [seasonalSelectionId],
  );

  const handlePressRecommendationItem = useCallback(
    (item: RecommendationItem) => {
      if (item.targetType === 'IMAGE_FEED' && item.feedId) {
        navigation.navigate('ImageFeedViewer', { feedId: item.feedId });
        return;
      }

      if (item.targetType === 'VIDEO_FEED' && item.storeId && item.placeId) {
        navigation.navigate('VideoFeedScreen', {
          storeId: item.storeId,
          placeId: item.placeId,
        });
        return;
      }

      if (item.targetType === 'SEASONAL_MENU') {
        if (item.seasonalFoodId) {
          setSeasonalSelectionId(item.seasonalFoodId);
        }
        handleSelectSort('SEASONAL');
        return;
      }

      if (item.targetType === 'STORE') {
        navigation.navigate('FullScreenMap', {
          storeName: item.storeName ?? item.title,
          address: item.address ?? undefined,
          placeId: item.placeId ?? undefined,
        });
      }
    },
    [handleSelectSort, navigation],
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
    if (!isFocused || !fcmIdentity) {
      return;
    }
    syncFcmTokenOnHomeEntry({
      username: fcmIdentity,
      force: false,
    }).catch(() => undefined);
  }, [fcmIdentity, isFocused, user?.userId, user?.username]);

  useEffect(() => {
    if (!isFocused || !user?.username) return;
    const unsubscribe = subscribeNotificationEvents(() => {
      getUnreadCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    });
    return unsubscribe;
  }, [isFocused, user?.username]);

  const handleOpenNotifications = useCallback(() => {
    if (!requireLogin({ message: '알림은 로그인 후 확인할 수 있어요.' })) return;
    setUnreadCount(0);
    markAllAsRead().catch(() => undefined);
    navigation.navigate('Notification');
  }, [navigation, requireLogin]);

  const handleOpenFriends = useCallback(() => {
    if (!requireLogin({ message: '친구 기능은 로그인 후 사용할 수 있어요.' })) return;
    navigation.navigate('MyFriends', { initialTab: 'activity' });
  }, [navigation, requireLogin]);

  const headerSearchWidth = Math.min(Math.max(windowWidth - 178, 170), 240);
  const headerSearchContainerStyle = useMemo(
    () => ({
      width: searchProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, headerSearchWidth],
      }),
      opacity: searchProgress,
      marginRight: searchProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
      }),
      transform: [
        {
          translateX: searchProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          }),
        },
      ],
    }),
    [headerSearchWidth, searchProgress],
  );

  const headerRight = (
    <View style={styles.headerRightRow}>
      <Animated.View
        pointerEvents={isSearchOpen ? 'auto' : 'none'}
        style={[styles.headerSearchContainer, headerSearchContainerStyle]}
      >
        <Ionicons name="search-outline" size={22} color={HOME_COLORS.textMutedAlt} />
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={handleChangeSearchQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={HOME_COLORS.textLight}
          style={styles.headerSearchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </Animated.View>

      {isSearchOpen ? (
        <TouchableOpacity
          onPress={handleCloseSearch}
          activeOpacity={0.82}
          style={styles.headerCircleButton}
          accessibilityRole="button"
          accessibilityLabel="검색 닫기"
        >
          <Ionicons name="close" size={24} color={HOME_COLORS.textPrimary} />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            onPress={handleOpenSearch}
            activeOpacity={0.82}
            style={styles.headerCircleButton}
            accessibilityRole="button"
            accessibilityLabel="검색 열기"
          >
            <Ionicons name="search-outline" size={24} color={HOME_COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenNotifications}
            activeOpacity={0.82}
            style={styles.headerCircleButton}
            accessibilityRole="button"
            accessibilityLabel="알림"
          >
            <View style={styles.headerIconWrap}>
              <Ionicons name="notifications-outline" size={24} color={HOME_COLORS.textPrimary} />
              {unreadCount ? (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadCount > 99 ? '99+' : `${unreadCount}`}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenFriends}
            activeOpacity={0.82}
            style={styles.headerCircleButton}
            accessibilityRole="button"
            accessibilityLabel="친구"
          >
            <Ionicons name="people-outline" size={24} color={HOME_COLORS.textPrimary} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <AppLayout
      title={currentTabTitle}
      showBack={false}
      showNotification={false}
      headerRight={headerRight}
      titleAlign="left"
      titleLeftInset={2}
      onPressTitle={handleToggleTitleMenu}
      showTitleChevron
      headerBorderless={true}
      footer={<FooterTabBar variant={isNearbyLayout ? 'overlay' : 'default'} />}
      footerMode={isNearbyLayout ? 'overlay' : 'docked'}
      footerHeight={isNearbyLayout ? 72 : 54}
    >
      <View style={styles.gestureLayer}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          bounces={false}
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          contentContainerStyle={styles.pagerContent}
          onMomentumScrollEnd={handlePagerMomentumEnd}
          scrollEventThrottle={16}
        >
          <View style={[styles.page, { width: windowWidth }]}>
            {isContentMounted ? (
              <HomeContentFeedPreview
                items={filteredContentFeedItems}
                header={
                  <HomeRecommendationSection
                    sections={recommendationSections}
                    loading={recommendationsLoading}
                    error={recommendationsError}
                    onPressItem={handlePressRecommendationItem}
                    onPressRefresh={() => loadRecommendations(true).catch(() => undefined)}
                  />
                }
                loading={contentFeedLoading}
                refreshing={isRefreshingContentFeed}
                loadingMore={contentFeedLoadingMore}
                errorMsg={contentFeedError}
                emptyTitle={
                  normalizedDebouncedContentSearchQuery
                    ? '검색한 컨텐츠가 없어요'
                    : undefined
                }
                emptyBody={
                  normalizedDebouncedContentSearchQuery
                    ? '검색어를 조금 바꾸거나 다른 탭에서 다시 찾아보세요.'
                    : undefined
                }
                onRetry={handleRefreshContentFeed}
                onRefresh={handleRefreshContentFeed}
                onPressItem={handleOpenContentItem}
                onPressComment={handleOpenContentComments}
                onToggleLike={handleToggleContentLike}
                onEndReached={loadMoreContentFeed}
                onViewableItemsChanged={handleContentFeedViewableItemsChanged}
              />
            ) : null}
          </View>

          <View style={[styles.page, { width: windowWidth }]}>
            {NearbyHomeExperienceComponent ? (
              <NearbyHomeExperienceComponent
                isFocused={isFocused && sortType === 'NEARBY'}
                sortType={sortType}
                locationStatus={locationStatus}
                searchQuery={searchQuery}
                videos={filteredNearbyVideos}
                images={filteredNearbyImages}
                isRefreshingFeeds={videosLoading || imagesLoading}
                onSelectSort={handleSelectSort}
                onRefreshFeeds={handleRefreshNearbyFeeds}
                onOpenFeed={handleOpenFeed}
                onOpenImage={(item: any) => {
                  navigation.navigate('ImageFeedViewer', { feedId: item.feedNo });
                }}
                onLocationStatusChange={setLocationStatus}
                onUserLocationResolved={handleResolvedUserLocation}
                onViewportCenterChange={handleNearbyViewportCenterChange}
                showSortPanel={false}
                onEdgeSwipePrev={() => handleSelectSort('RECENT')}
                onEdgeSwipeNext={() => handleSelectSort('SEASONAL')}
              />
            ) : null}
          </View>

          <View style={[styles.page, { width: windowWidth }]}>
            {SeasonalHeroSectionComponent && SeasonalMenuHubComponent ? (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
              >
                {filteredActiveSeasonalItem ? (
                  <SeasonalHeroSectionComponent
                    items={filteredSeasonalHeroItems}
                    activeSeasonalFoodId={filteredActiveSeasonalItem.seasonalFoodId}
                    onSelectItem={handleSelectSeasonalItem}
                  />
                ) : null}

                {filteredActiveSeasonalItem ? (
                  <View onLayout={handleSeasonalMenuLayout}>
                    <SeasonalMenuHubComponent
                      item={filteredActiveSeasonalItem}
                      totalFoods={filteredSeasonalFoods.length}
                      onPressOverview={handlePressSeasonalMoments}
                      onPressRecipe={handlePressSeasonalRecipe}
                      onPressMap={handlePressSeasonalMap}
                    />
                  </View>
                ) : normalizedSearchQuery ? (
                  <View style={styles.searchEmptyState}>
                    <Text style={styles.searchEmptyTitle}>검색한 제철 항목이 없어요</Text>
                    <Text style={styles.searchEmptyBody}>
                      음식 이름이나 카테고리를 조금 다르게 입력해보세요.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.bottomSpacer} />
              </ScrollView>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.edgeSwipeOverlay} pointerEvents="box-none">
          <GestureDetector gesture={leftHomeEdgeGesture}>
            <View style={styles.edgeSwipeZoneLeft} collapsable={false} />
          </GestureDetector>
          <GestureDetector gesture={rightHomeEdgeGesture}>
            <View style={styles.edgeSwipeZoneRight} collapsable={false} />
          </GestureDetector>
        </View>

        <Modal
          visible={isTitleMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseTitleMenu}
        >
          <View style={styles.titleMenuRoot}>
            <Pressable style={styles.titleMenuBackdrop} onPress={handleCloseTitleMenu} />
            <View
              style={[
                styles.titleMenuSheet,
                { top: insets.top + 52 },
              ]}
            >
              {SORT_OPTIONS.map((option) => {
                const isActive = sortType === option;
                return (
                  <TouchableOpacity
                    key={`title-menu-${option}`}
                    style={[styles.titleMenuItem, isActive && styles.titleMenuItemActive]}
                    onPress={() => handleSelectSortFromTitleMenu(option)}
                    activeOpacity={0.84}
                  >
                    <Text
                      style={[
                        styles.titleMenuItemText,
                        isActive && styles.titleMenuItemTextActive,
                      ]}
                    >
                      {SORT_LABELS[option]}
                    </Text>
                    {isActive ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={HOME_COLORS.textPrimary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  gestureLayer: {
    flex: 1,
  },
  edgeSwipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  edgeSwipeZoneLeft: {
    width: 12,
    height: '100%',
  },
  edgeSwipeZoneRight: {
    width: 12,
    height: '100%',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSearchContainer: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderLight,
  },
  headerSearchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: HOME_COLORS.textPrimary,
  },
  headerCircleButton: {
    width: 30,
    height: 30,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    right: -7,
    top: -5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d4f',
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  titleMenuRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  titleMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  titleMenuSheet: {
    position: 'absolute',
    left: 14,
    width: 172,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderLight,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  titleMenuItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleMenuItemActive: {
    backgroundColor: '#f7f7f8',
  },
  titleMenuItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: HOME_COLORS.textPrimary,
  },
  titleMenuItemTextActive: {
    fontWeight: '800',
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: HOME_COLORS.heroBase,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 28,
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
  skeletonLineWide: {
    height: 16,
    borderRadius: 8,
    backgroundColor: HOME_COLORS.skeletonLine,
    width: '76%',
  },
  skeletonLine: {
    height: 13,
    borderRadius: 8,
    backgroundColor: HOME_COLORS.skeletonLine,
    width: '52%',
  },
  searchEmptyState: {
    marginTop: 10,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderLight,
  },
  searchEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  searchEmptyBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: HOME_COLORS.textMutedAlt,
  },
  bottomSpacer: {
    height: 12,
  },
});
