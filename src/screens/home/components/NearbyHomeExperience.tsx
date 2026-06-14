import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../../../auth/AuthProvider';
import {
  fetchStoreSuggestions,
  type NearbyStoreMarker,
} from '../../../api/mapStoreApi';
import {
  fetchHomeVideoThumbnails,
  type HomeVideoThumbnail,
} from '../../../api/homeVideoApi';
import {
  buildFeedImageUrl,
  fetchHomeImageThumbnails,
} from '../../../api/homeImageApi';
import { HOME_COLORS } from '../styles/homeTokens';
import type {
  HomeImageThumbnail,
  HomeLocationStatus,
  HomeNearbyStatePayload,
  HomeSortType,
} from '../types';
import { formatTimeAgo } from '../../../utils/dateTime';
import { buildImageUrl } from '../utils/imageUtils';
import { buildHomeVideoThumbUrl } from '../utils/videoUtils';
import {
  fetchUserLikedImages,
  fetchUserLikedVideos,
  type UserLikedImage,
  type UserLikedVideo,
} from '../../../api/userLikesApi';
import NearbyMapCanvas from './NearbyMapCanvas';

type NearbyHomeExperienceProps = {
  isFocused: boolean;
  sortType: HomeSortType;
  locationStatus: HomeLocationStatus;
  searchQuery?: string;
  videos: HomeVideoThumbnail[];
  images: HomeImageThumbnail[];
  isRefreshingFeeds: boolean;
  onSelectSort: (nextType: HomeSortType) => void;
  onRefreshFeeds: () => void;
  onOpenFeed: (marker: NearbyStoreMarker) => void;
  onOpenImage: (item: HomeImageThumbnail) => void;
  onLocationStatusChange: (status: HomeLocationStatus) => void;
  onUserLocationResolved: (coord: { latitude: number; longitude: number }) => void;
  onViewportCenterChange?: (coord: { latitude: number; longitude: number }) => void;
  showSortPanel?: boolean;
  onEdgeSwipePrev?: () => void;
  onEdgeSwipeNext?: () => void;
};

type NearbyFeedModalTab = 'ALL' | 'VIDEO' | 'IMAGE';
type NearbyCategoryKey =
  | 'ALL'
  | 'KOREAN'
  | 'JAPANESE'
  | 'CHINESE'
  | 'CAFE'
  | 'DESSERT';
type NearbyFeedCacheEntry = {
  videos: HomeVideoThumbnail[];
  images: HomeImageThumbnail[];
  fetchedAt: number;
};
type NearbyExperienceMode = 'NEARBY' | 'LIKES';
type LikedPlaceGroup = {
  key: string;
  placeId: string | null;
  storeName: string | null;
  address: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  thumbnail: string | null;
  videoLikes: UserLikedVideo[];
  imageLikes: UserLikedImage[];
  latestLikedAt: string | null;
};

type NearbyFeedLoadOptions = {
  force?: boolean;
  seedVideos?: HomeVideoThumbnail[];
  seedImages?: HomeImageThumbnail[];
};

type NearbyFeedListEntry =
  | {
      key: string;
      type: 'HEADER';
      title: string;
      count: number;
    }
  | {
      key: string;
      type: 'VIDEO';
      item: HomeVideoThumbnail;
    }
  | {
      key: string;
      type: 'IMAGE';
      item: HomeImageThumbnail;
    }
  | {
      key: string;
      type: 'EMPTY';
      message: string;
    };

const NEARBY_FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const LIKED_PLACE_RESOLVE_LIMIT = 12;
const NEARBY_ACCENT = HOME_COLORS.textPrimary;
const NEARBY_SURFACE = 'rgba(255,255,255,0.96)';
const NEARBY_SURFACE_STRONG = '#ffffff';
const NEARBY_BORDER = HOME_COLORS.borderLight;
const NEARBY_CATEGORY_OPTIONS: Array<{
  key: NearbyCategoryKey;
  label: string;
  serverValue?: string;
}> = [
  { key: 'ALL', label: '전체' },
  { key: 'KOREAN', label: '한식', serverValue: 'KOREAN' },
  { key: 'JAPANESE', label: '일식', serverValue: 'JAPANESE' },
  { key: 'CHINESE', label: '중식', serverValue: 'CHINESE' },
  { key: 'CAFE', label: '카페', serverValue: 'CAFE' },
  { key: 'DESSERT', label: '디저트', serverValue: 'DESSERT' },
];

const SORT_OPTIONS: Array<{ key: HomeSortType; label: string }> = [
  { key: 'RECENT', label: '최신순' },
  { key: 'NEARBY', label: '내 주변' },
  { key: 'SEASONAL', label: '제철음식' },
];

const buildMarkerKey = (marker: NearbyStoreMarker) =>
  [
    marker.placeId?.trim() || 'noplace',
    String(marker.storeId ?? 'nostore'),
    marker.lat.toFixed(6),
    marker.lng.toFixed(6),
  ].join(':');

const sortMarkersByDistance = (markers: NearbyStoreMarker[]) =>
  [...markers].sort(
    (a, b) =>
      (a.distanceM ?? Number.POSITIVE_INFINITY) - (b.distanceM ?? Number.POSITIVE_INFINITY),
  );

const formatDistance = (distanceM?: number | null) => {
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM)) {
    return '근처';
  }
  if (distanceM < 1000) {
    return `${Math.max(10, Math.round(distanceM / 10) * 10)}m`;
  }
  return `${(distanceM / 1000).toFixed(1)}km`;
};

const normalizeSearchQuery = (value?: string | null) =>
  String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const buildLikedPlaceKey = (placeId?: string | null, storeName?: string | null, address?: string | null) => {
  const normalizedPlaceId = placeId?.trim();
  if (normalizedPlaceId) {
    return `place:${normalizedPlaceId}`;
  }
  return `store:${normalizeSearchQuery(storeName)}|${normalizeSearchQuery(address)}`;
};

const toTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeNearbyCategoryKey = (value?: string | null): NearbyCategoryKey | null => {
  const normalized = normalizeSearchQuery(value);

  if (!normalized) {
    return null;
  }
  if (normalized.includes('korean') || normalized.includes('한식')) {
    return 'KOREAN';
  }
  if (normalized.includes('japanese') || normalized.includes('일식')) {
    return 'JAPANESE';
  }
  if (normalized.includes('chinese') || normalized.includes('중식')) {
    return 'CHINESE';
  }
  if (normalized.includes('cafe') || normalized.includes('카페')) {
    return 'CAFE';
  }
  if (normalized.includes('dessert') || normalized.includes('디저트')) {
    return 'DESSERT';
  }
  return null;
};

const matchesNearbySearchQuery = (marker: NearbyStoreMarker, query: string) => {
  if (!query) {
    return true;
  }

  return [
    marker.storeName,
    marker.address,
    marker.placeId,
  ].some((value) => normalizeSearchQuery(value).includes(query));
};

const getMarkerMetaLabel = (marker: NearbyStoreMarker) => {
  if (marker.contentType === 'BOTH') return '영상+이미지';
  if (marker.contentType === 'IMAGE') return '이미지 중심';
  if (marker.contentType === 'VIDEO') return '영상 중심';
  return '근처 가게';
};

const getLocationStatusLabel = (status: HomeLocationStatus) => {
  switch (status) {
    case 'checking':
      return '위치 확인 중';
    case 'denied':
      return '위치 권한 필요';
    case 'unavailable':
      return '위치 신호 약함';
    default:
      return '';
  }
};

const buildNearbyFeedCacheKey = (marker: NearbyStoreMarker) =>
  [
    marker.placeId?.trim() || 'noplace',
    String(marker.storeId ?? 'nostore'),
    marker.lat.toFixed(4),
    marker.lng.toFixed(4),
  ].join(':');

const hasFeedSeed = (videos: HomeVideoThumbnail[], images: HomeImageThumbnail[]) =>
  videos.length > 0 || images.length > 0;

const buildVideoMarker = (
  item: HomeVideoThumbnail,
  fallbackMarker: NearbyStoreMarker,
): NearbyStoreMarker => ({
  storeId: item.storeId,
  placeId: item.placeId ?? fallbackMarker.placeId,
  storeName: item.storeName ?? item.title ?? fallbackMarker.storeName,
  address: item.address ?? fallbackMarker.address,
  thumbnail: item.thumbnail ?? fallbackMarker.thumbnail,
  lat: fallbackMarker.lat,
  lng: fallbackMarker.lng,
  distanceM: fallbackMarker.distanceM,
  feedCount: item.commentCount ?? fallbackMarker.feedCount,
  contentType: 'VIDEO',
  imageFeedId: null,
});

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NearbyHomeExperience: React.FC<NearbyHomeExperienceProps> = ({
  isFocused,
  sortType,
  locationStatus,
  searchQuery = '',
  videos,
  images,
  isRefreshingFeeds,
  onSelectSort,
  onRefreshFeeds,
  onOpenFeed,
  onOpenImage,
  onLocationStatusChange,
  onUserLocationResolved,
  onViewportCenterChange,
  showSortPanel = true,
  onEdgeSwipePrev,
  onEdgeSwipeNext,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [experienceMode, setExperienceMode] = useState<NearbyExperienceMode>('NEARBY');
  const [nearbyState, setNearbyState] = useState<HomeNearbyStatePayload>({
    markers: [],
    loading: true,
    error: null,
  });
  const [selectedNearbyCategoryKey, setSelectedNearbyCategoryKey] =
    useState<NearbyCategoryKey>('ALL');
  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(null);
  const [focusedMarkerRequest, setFocusedMarkerRequest] = useState<NearbyStoreMarker | null>(null);
  const [dockMode, setDockMode] = useState<'hidden' | 'peek' | 'expanded'>('peek');
  const [recenterToUser, setRecenterToUser] = useState<(() => void) | undefined>();
  const [nearbyFeedsVisible, setNearbyFeedsVisible] = useState(false);
  const [nearbyFeedTab, setNearbyFeedTab] = useState<NearbyFeedModalTab>('ALL');
  const [nearbyFeedVideos, setNearbyFeedVideos] = useState<HomeVideoThumbnail[]>([]);
  const [nearbyFeedImages, setNearbyFeedImages] = useState<HomeImageThumbnail[]>([]);
  const [nearbyFeedsLoading, setNearbyFeedsLoading] = useState(false);
  const [nearbyFeedsError, setNearbyFeedsError] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<UserLikedVideo[]>([]);
  const [likedImages, setLikedImages] = useState<UserLikedImage[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedError, setLikedError] = useState<string | null>(null);
  const [likedCoordinateOverrides, setLikedCoordinateOverrides] = useState<
    Record<string, { lat: number; lng: number; address?: string | null }>
  >({});
  const [refreshMarkers, setRefreshMarkers] = useState<(() => void) | undefined>();
  const dockEntrance = useRef(new Animated.Value(1)).current;
  const railEntrance = useRef(new Animated.Value(1)).current;
  const modalEntrance = useRef(new Animated.Value(0)).current;
  const nearbyFeedCacheRef = useRef<Map<string, NearbyFeedCacheEntry>>(new Map());
  const nearbyFeedPendingRef = useRef<Map<string, Promise<NearbyFeedCacheEntry>>>(new Map());

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(deferredSearchQuery),
    [deferredSearchQuery],
  );
  const loadLikedPlaces = useCallback(async () => {
    if (!user?.username) {
      setLikedVideos([]);
      setLikedImages([]);
      setLikedLoading(false);
      setLikedError(null);
      return;
    }

    setLikedLoading(true);
    setLikedError(null);
    try {
      const [videoItems, imageItems] = await Promise.all([
        fetchUserLikedVideos(user.username, { limit: 60, offset: 0 }),
        fetchUserLikedImages(user.username, { limit: 60, offset: 0 }),
      ]);
      setLikedVideos(videoItems);
      setLikedImages(imageItems);
    } catch {
      setLikedError('좋아요한 장소를 불러오지 못했어요.');
    } finally {
      setLikedLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    if (experienceMode !== 'LIKES') {
      return;
    }
    loadLikedPlaces();
  }, [experienceMode, loadLikedPlaces]);
  const selectedNearbyCategory = useMemo(
    () =>
      NEARBY_CATEGORY_OPTIONS.find((option) => option.key === selectedNearbyCategoryKey) ??
      NEARBY_CATEGORY_OPTIONS[0],
    [selectedNearbyCategoryKey],
  );
  const likedPlaces = useMemo<LikedPlaceGroup[]>(() => {
    const groups = new Map<string, LikedPlaceGroup>();

    likedVideos.forEach((item) => {
      const key = buildLikedPlaceKey(item.placeId, item.storeName, item.address);
      const existing = groups.get(key);
      const override = likedCoordinateOverrides[key];
      const current: LikedPlaceGroup =
        existing ?? {
          key,
          placeId: item.placeId?.trim() || null,
          storeName: item.storeName?.trim() || item.title?.trim() || null,
          address: item.address?.trim() || override?.address || null,
          category: item.category ?? null,
          lat: item.lat ?? override?.lat ?? null,
          lng: item.lng ?? override?.lng ?? null,
          thumbnail: item.thumbnail ?? null,
          videoLikes: [],
          imageLikes: [],
          latestLikedAt: item.likedAt ?? null,
        };

      current.videoLikes.push(item);
      current.storeName = current.storeName ?? item.storeName?.trim() ?? item.title?.trim() ?? null;
      current.address = current.address ?? item.address?.trim() ?? override?.address ?? null;
      current.category = current.category ?? item.category ?? null;
      current.thumbnail = current.thumbnail ?? item.thumbnail ?? null;
      current.lat = current.lat ?? item.lat ?? override?.lat ?? null;
      current.lng = current.lng ?? item.lng ?? override?.lng ?? null;
      if (toTimestamp(item.likedAt) > toTimestamp(current.latestLikedAt)) {
        current.latestLikedAt = item.likedAt;
      }
      groups.set(key, current);
    });

    likedImages.forEach((item) => {
      const key = buildLikedPlaceKey(item.placeId, item.storeName, item.address);
      const existing = groups.get(key);
      const override = likedCoordinateOverrides[key];
      const current: LikedPlaceGroup =
        existing ?? {
          key,
          placeId: item.placeId?.trim() || null,
          storeName: item.storeName?.trim() || item.title?.trim() || null,
          address: item.address?.trim() || override?.address || null,
          category: item.category ?? null,
          lat: item.lat ?? override?.lat ?? null,
          lng: item.lng ?? override?.lng ?? null,
          thumbnail: item.thumbnail ?? null,
          videoLikes: [],
          imageLikes: [],
          latestLikedAt: item.likedAt ?? null,
        };

      current.imageLikes.push(item);
      current.storeName = current.storeName ?? item.storeName?.trim() ?? item.title?.trim() ?? null;
      current.address = current.address ?? item.address?.trim() ?? override?.address ?? null;
      current.category = current.category ?? item.category ?? null;
      current.thumbnail = current.thumbnail ?? item.thumbnail ?? null;
      current.lat = current.lat ?? override?.lat ?? null;
      current.lng = current.lng ?? override?.lng ?? null;
      if (toTimestamp(item.likedAt) > toTimestamp(current.latestLikedAt)) {
        current.latestLikedAt = item.likedAt;
      }
      groups.set(key, current);
    });

    return [...groups.values()].sort(
      (a, b) => toTimestamp(b.latestLikedAt) - toTimestamp(a.latestLikedAt),
    );
  }, [likedCoordinateOverrides, likedImages, likedVideos]);

  useEffect(() => {
    if (experienceMode !== 'LIKES' || likedPlaces.length === 0) {
      return;
    }

    const unresolved = likedPlaces.filter(
      (item) =>
        item.lat == null &&
        item.lng == null &&
        (item.storeName?.trim() || item.address?.trim()),
    );

    if (unresolved.length === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const nextEntries = await Promise.all(
        unresolved.slice(0, LIKED_PLACE_RESOLVE_LIMIT).map(async (item) => {
          const keyword = item.storeName?.trim() || item.address?.trim() || '';
          if (!keyword) {
            return null;
          }
          try {
            const suggestions = await fetchStoreSuggestions({ keyword, limit: 6 });
            const matched =
              suggestions.find((suggestion) => item.placeId && suggestion.placeId === item.placeId) ??
              suggestions.find(
                (suggestion) =>
                  normalizeSearchQuery(suggestion.storeName) === normalizeSearchQuery(item.storeName),
              ) ??
              suggestions.find(
                (suggestion) =>
                  normalizeSearchQuery(suggestion.address) === normalizeSearchQuery(item.address),
              ) ??
              suggestions[0];

            if (!matched) {
              return null;
            }

            return [
              item.key,
              {
                lat: matched.lat,
                lng: matched.lng,
                address: matched.address ?? item.address ?? null,
              },
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const resolvedEntries = nextEntries.filter(Boolean) as Array<
        readonly [string, { lat: number; lng: number; address?: string | null }]
      >;
      if (resolvedEntries.length === 0) {
        return;
      }

      setLikedCoordinateOverrides((prev) => {
        const next = { ...prev };
        resolvedEntries.forEach(([key, value]) => {
          if (!next[key]) {
            next[key] = value;
          }
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [experienceMode, likedPlaces]);

  const likedMarkers = useMemo<NearbyStoreMarker[]>(
    () =>
      likedPlaces
        .filter((item) => item.lat != null && item.lng != null)
        .map((item) => ({
          storeId:
            item.videoLikes[0]?.storeId ??
            item.imageLikes[0]?.feedId ??
            0,
          placeId: item.placeId ?? item.key,
          storeName: item.storeName ?? '좋아요한 가게',
          address: item.address ?? null,
          thumbnail: item.thumbnail ?? null,
          category: item.category ?? null,
          lat: Number(item.lat),
          lng: Number(item.lng),
          distanceM: Number.NaN,
          feedCount: item.videoLikes.length + item.imageLikes.length,
          contentType:
            item.videoLikes.length > 0 && item.imageLikes.length > 0
              ? 'BOTH'
              : item.imageLikes.length > 0
                ? 'IMAGE'
                : 'VIDEO',
          imageFeedId: item.imageLikes[0]?.feedId ?? null,
        })),
    [likedPlaces],
  );
  const effectiveNearbyCategory = useMemo(
    () =>
      normalizedSearchQuery.length > 0
        ? undefined
        : selectedNearbyCategory.serverValue,
    [normalizedSearchQuery.length, selectedNearbyCategory],
  );
  const handleRegisterCenterUser = useCallback((fn?: () => void) => {
    setRecenterToUser(() => fn);
  }, []);
  const handleRegisterRefreshMarkers = useCallback((fn?: () => void) => {
    setRefreshMarkers(() => fn);
  }, []);
  const sortedMarkers = useMemo(
    () => sortMarkersByDistance(nearbyState.markers),
    [nearbyState.markers],
  );
  const nearbyCategoryCounts = useMemo(() => {
    const next: Record<NearbyCategoryKey, number> = {
      ALL: sortedMarkers.length,
      KOREAN: 0,
      JAPANESE: 0,
      CHINESE: 0,
      CAFE: 0,
      DESSERT: 0,
    };

    sortedMarkers.forEach((marker) => {
      const normalizedCategory = normalizeNearbyCategoryKey(marker.category);
      if (normalizedCategory) {
        next[normalizedCategory] += 1;
      }
    });

    return next;
  }, [sortedMarkers]);
  const hasNearbyCategoryCounts = useMemo(
    () =>
      nearbyCategoryCounts.KOREAN > 0 ||
      nearbyCategoryCounts.JAPANESE > 0 ||
      nearbyCategoryCounts.CHINESE > 0 ||
      nearbyCategoryCounts.CAFE > 0 ||
      nearbyCategoryCounts.DESSERT > 0,
    [nearbyCategoryCounts],
  );
  const categoryFilteredMarkers = useMemo(() => {
    if (selectedNearbyCategoryKey === 'ALL') {
      return sortedMarkers;
    }

    const filtered = sortedMarkers.filter(
      (marker) => normalizeNearbyCategoryKey(marker.category) === selectedNearbyCategoryKey,
    );

    if (filtered.length > 0 || hasNearbyCategoryCounts) {
      return filtered;
    }

    return sortedMarkers;
  }, [hasNearbyCategoryCounts, selectedNearbyCategoryKey, sortedMarkers]);
  const visibleMarkers = useMemo(
    () =>
      normalizedSearchQuery
        ? categoryFilteredMarkers.filter((marker) =>
            matchesNearbySearchQuery(marker, normalizedSearchQuery),
          )
        : categoryFilteredMarkers,
    [categoryFilteredMarkers, normalizedSearchQuery],
  );
  const filteredLikedPlaces = useMemo(() => {
    if (!normalizedSearchQuery) {
      return likedPlaces;
    }
    return likedPlaces.filter((item) =>
      [item.storeName, item.address, item.placeId].some((value) =>
        normalizeSearchQuery(value).includes(normalizedSearchQuery),
      ),
    );
  }, [likedPlaces, normalizedSearchQuery]);
  const visibleLikedMarkers = useMemo(() => {
    const keys = new Set(filteredLikedPlaces.map((item) => item.key));
    return likedMarkers.filter((marker) =>
      keys.has(buildLikedPlaceKey(marker.placeId, marker.storeName, marker.address)),
    );
  }, [filteredLikedPlaces, likedMarkers]);
  const activeMarkers = experienceMode === 'LIKES' ? visibleLikedMarkers : visibleMarkers;
  const spotlightPlaces = useMemo(() => activeMarkers.slice(0, 8), [activeMarkers]);
  const isSearchEmpty = normalizedSearchQuery.length > 0 && visibleMarkers.length === 0;
  const isLikedSearchEmpty =
    experienceMode === 'LIKES' &&
    normalizedSearchQuery.length > 0 &&
    filteredLikedPlaces.length === 0;
  const isCategoryEmpty =
    normalizedSearchQuery.length === 0 &&
    selectedNearbyCategoryKey !== 'ALL' &&
    visibleMarkers.length === 0;

  useEffect(() => {
    setSelectedMarkerKey(null);
    setFocusedMarkerRequest(null);
    setDockMode('peek');
  }, [experienceMode, selectedNearbyCategoryKey]);

  useEffect(() => {
    if (activeMarkers.length === 0) {
      setSelectedMarkerKey(null);
      setFocusedMarkerRequest(null);
      setDockMode('peek');
      return;
    }

    if (!selectedMarkerKey) {
      return;
    }

    if (activeMarkers.some((marker) => buildMarkerKey(marker) === selectedMarkerKey)) {
      return;
    }

    setSelectedMarkerKey(null);
    setFocusedMarkerRequest(null);
    setDockMode('peek');
  }, [activeMarkers, selectedMarkerKey]);

  const selectedMarker = useMemo(
    () =>
      selectedMarkerKey
        ? activeMarkers.find((marker) => buildMarkerKey(marker) === selectedMarkerKey) ??
          null
        : null,
    [activeMarkers, selectedMarkerKey],
  );
  const handleSelectMarkerFromMap = useCallback((marker: NearbyStoreMarker) => {
    setSelectedMarkerKey(buildMarkerKey(marker));
    setFocusedMarkerRequest(marker);
    setDockMode('expanded');
  }, []);
  const handlePressBackgroundMap = useCallback(() => {
    setDockMode((prev) => {
      if (prev === 'hidden') {
        return prev;
      }
      return 'peek';
    });
  }, []);

  const selectedLikedPlace = useMemo(
    () =>
      selectedMarker
        ? filteredLikedPlaces.find(
            (item) =>
              buildLikedPlaceKey(item.placeId, item.storeName, item.address) ===
              buildLikedPlaceKey(
                selectedMarker.placeId,
                selectedMarker.storeName,
                selectedMarker.address,
              ),
          ) ?? null
        : null,
    [filteredLikedPlaces, selectedMarker],
  );

  const matchingVideos = useMemo(() => {
    if (experienceMode === 'LIKES' && selectedLikedPlace) {
      return selectedLikedPlace.videoLikes.map((item) => ({
        storeId: item.storeId,
        placeId: item.placeId,
        storeName: item.storeName,
        address: item.address,
        title: item.title,
        thumbnail: item.thumbnail,
        createdAt: item.likedAt,
        updatedAt: item.likedAt,
        commentCount: 0,
      })) as unknown as HomeVideoThumbnail[];
    }
    if (!selectedMarker) return [];
    const placeId = selectedMarker.placeId?.trim();
    const storeName = selectedMarker.storeName?.trim();
    return videos.filter((item) => {
      if (placeId && item.placeId === placeId) return true;
      if (storeName && item.storeName?.trim() === storeName) return true;
      return false;
    });
  }, [experienceMode, selectedLikedPlace, selectedMarker, videos]);

  const matchingImages = useMemo(() => {
    if (experienceMode === 'LIKES' && selectedLikedPlace) {
      return selectedLikedPlace.imageLikes.map((item) => ({
        feedNo: item.feedId,
        thumbFileName: item.thumbnail ?? '',
        title: item.title,
        storeName: item.storeName,
        placeId: item.placeId,
        address: item.address ?? null,
        createdAt: item.likedAt,
        updatedAt: item.likedAt,
      }));
    }
    if (!selectedMarker) return [];
    const placeId = selectedMarker.placeId?.trim();
    const storeName = selectedMarker.storeName?.trim();
    return images.filter((item) => {
      if (placeId && item.placeId === placeId) return true;
      if (storeName && item.storeName?.trim() === storeName) return true;
      return false;
    });
  }, [experienceMode, images, selectedLikedPlace, selectedMarker]);

  const selectedHeroImage = selectedMarker ? buildImageUrl(selectedMarker.thumbnail) : '';
  const bottomDockOffset = insets.bottom + 84;
  const hasAlertStatus = locationStatus === 'denied' || locationStatus === 'unavailable';
  const locationStatusLabel = getLocationStatusLabel(locationStatus);
  const isRefreshingNearby =
    experienceMode === 'LIKES' ? likedLoading : nearbyState.loading || isRefreshingFeeds;
  const utilityStatusLabel = isRefreshingNearby
    ? experienceMode === 'LIKES'
      ? '좋아요한 장소 다시 불러오는 중'
      : '이 지역 다시 불러오는 중'
    : locationStatusLabel;
  const isDockExpanded = dockMode === 'expanded' && !!selectedMarker;
  const isDockHidden = dockMode === 'hidden';
  const hiddenDockLabel = selectedMarker?.storeName?.trim() || '가게 정보';
  const showNearbyCategoryRail =
    experienceMode === 'NEARBY' && normalizedSearchQuery.length === 0;
  const shouldShowIdleDock =
    !selectedMarker &&
    (spotlightPlaces.length === 0 ||
      isSearchEmpty ||
      isLikedSearchEmpty ||
      isCategoryEmpty ||
      nearbyState.loading ||
      Boolean(nearbyState.error) ||
      likedLoading ||
      Boolean(likedError) ||
      (experienceMode === 'LIKES' && !user?.username));

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    dockEntrance.setValue(0.92);
    Animated.spring(dockEntrance, {
      toValue: 1,
      damping: 17,
      stiffness: 210,
      mass: 0.92,
      useNativeDriver: true,
    }).start();

    Animated.timing(railEntrance, {
      toValue: dockMode === 'hidden' ? 0 : 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dockEntrance, dockMode, railEntrance, selectedMarkerKey]);

  const railAnimatedStyle = useMemo(
    () => ({
      opacity: railEntrance,
      transform: [
        {
          translateY: railEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
      ],
    }),
    [railEntrance],
  );

  const dockAnimatedStyle = useMemo(
    () => ({
      opacity: dockEntrance,
      transform: [
        {
          translateY: dockEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
        {
          scale: dockEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1],
          }),
        },
      ],
    }),
    [dockEntrance],
  );

  const hiddenDockAnimatedStyle = useMemo(
    () => ({
      opacity: dockEntrance,
      transform: [
        {
          translateY: dockEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          }),
        },
        {
          scale: dockEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1],
          }),
        },
      ],
    }),
    [dockEntrance],
  );

  const handleRefreshNearby = useCallback(() => {
    if (experienceMode === 'LIKES') {
      loadLikedPlaces();
      return;
    }
    refreshMarkers?.();
    onRefreshFeeds();
  }, [experienceMode, loadLikedPlaces, onRefreshFeeds, refreshMarkers]);

  const triggerEdgeSwipePrev = useCallback(() => {
    onEdgeSwipePrev?.();
  }, [onEdgeSwipePrev]);

  const triggerEdgeSwipeNext = useCallback(() => {
    onEdgeSwipeNext?.();
  }, [onEdgeSwipeNext]);

  const leftEdgeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([12, 9999])
        .failOffsetY([-12, 12])
        .onEnd((event) => {
          if (event.translationX > 44) {
            runOnJS(triggerEdgeSwipePrev)();
          }
        }),
    [triggerEdgeSwipePrev],
  );

  const rightEdgeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-9999, -12])
        .failOffsetY([-12, 12])
        .onEnd((event) => {
          if (event.translationX < -44) {
            runOnJS(triggerEdgeSwipeNext)();
          }
        }),
    [triggerEdgeSwipeNext],
  );

  useEffect(() => {
    if (!nearbyFeedsVisible) {
      modalEntrance.setValue(0);
      return;
    }

    Animated.timing(modalEntrance, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [modalEntrance, nearbyFeedsVisible]);

  const loadNearbyFeeds = useCallback(
    async (marker: NearbyStoreMarker, options?: NearbyFeedLoadOptions) => {
      const cacheKey = buildNearbyFeedCacheKey(marker);
      const forceReload = options?.force === true;
      const seedVideos = options?.seedVideos ?? [];
      const seedImages = options?.seedImages ?? [];
      const canRenderSeed = hasFeedSeed(seedVideos, seedImages);
      const cached = nearbyFeedCacheRef.current.get(cacheKey);
      if (!forceReload && cached && Date.now() - cached.fetchedAt < NEARBY_FEED_CACHE_TTL_MS) {
        setNearbyFeedVideos(cached.videos);
        setNearbyFeedImages(cached.images);
        setNearbyFeedsLoading(false);
        setNearbyFeedsError(null);
        return cached;
      }

      if (canRenderSeed) {
        setNearbyFeedVideos(seedVideos);
        setNearbyFeedImages(seedImages);
      }

      const pending = nearbyFeedPendingRef.current.get(cacheKey);
      if (!forceReload && pending) {
        setNearbyFeedsLoading(!canRenderSeed);
        setNearbyFeedsError(null);
        try {
          const pendingEntry = await pending;
          setNearbyFeedVideos(pendingEntry.videos);
          setNearbyFeedImages(pendingEntry.images);
          return pendingEntry;
        } catch {
          if (!canRenderSeed) {
            setNearbyFeedsError('근처 피드를 불러오지 못했어요.');
          }
          return null;
        } finally {
          setNearbyFeedsLoading(false);
        }
      }

      setNearbyFeedsLoading(!canRenderSeed);
      setNearbyFeedsError(null);
      const location = { latitude: marker.lat, longitude: marker.lng };
      const request = Promise.all([
        fetchHomeVideoThumbnails(0, 18, null, {
          sortType: 'NEARBY',
          location,
          radius: 2200,
        }),
        fetchHomeImageThumbnails(18, {
          sortType: 'NEARBY',
          location,
          radius: 2200,
        }),
      ]).then(([videoPage, imageItems]) => ({
        videos: videoPage.content ?? [],
        images: imageItems ?? [],
        fetchedAt: Date.now(),
      }));
      nearbyFeedPendingRef.current.set(cacheKey, request);

      try {
        const nextEntry = await request;
        nearbyFeedCacheRef.current.set(cacheKey, nextEntry);
        setNearbyFeedVideos(nextEntry.videos);
        setNearbyFeedImages(nextEntry.images);
        return nextEntry;
      } catch {
        if (!canRenderSeed) {
          setNearbyFeedsError('근처 피드를 불러오지 못했어요.');
        }
        return null;
      } finally {
        nearbyFeedPendingRef.current.delete(cacheKey);
        setNearbyFeedsLoading(false);
      }
    },
    [],
  );

  const openNearbyFeedsModal = useCallback(() => {
    if (!selectedMarker) {
      return;
    }
    if (experienceMode === 'LIKES') {
      setNearbyFeedTab('ALL');
      setNearbyFeedsVisible(true);
      setNearbyFeedVideos(matchingVideos);
      setNearbyFeedImages(matchingImages);
      setNearbyFeedsLoading(false);
      setNearbyFeedsError(likedError);
      return;
    }
    const cacheKey = buildNearbyFeedCacheKey(selectedMarker);
    const cached = nearbyFeedCacheRef.current.get(cacheKey);
    const hasFreshCache =
      !!cached && Date.now() - cached.fetchedAt < NEARBY_FEED_CACHE_TTL_MS;
    setNearbyFeedTab('ALL');
    setNearbyFeedsVisible(true);
    setNearbyFeedVideos(hasFreshCache ? cached.videos : matchingVideos);
    setNearbyFeedImages(hasFreshCache ? cached.images : matchingImages);
    loadNearbyFeeds(selectedMarker, {
      seedVideos: matchingVideos,
      seedImages: matchingImages,
    }).catch(() => undefined);
  }, [
    experienceMode,
    likedError,
    loadNearbyFeeds,
    matchingImages,
    matchingVideos,
    selectedMarker,
  ]);

  const handleOpenSelectedFeed = useCallback(() => {
    if (!selectedMarker) {
      return;
    }
    if (experienceMode === 'LIKES') {
      if (matchingVideos.length > 0) {
        onOpenFeed(buildVideoMarker(matchingVideos[0], selectedMarker));
        return;
      }
      if (matchingImages.length > 0) {
        onOpenImage(matchingImages[0]);
      }
      return;
    }
    onOpenFeed(selectedMarker);
  }, [experienceMode, matchingImages, matchingVideos, onOpenFeed, onOpenImage, selectedMarker]);

  const closeNearbyFeedsModal = useCallback(() => {
    setNearbyFeedsVisible(false);
  }, []);

  const handleOpenNearbyVideo = useCallback(
    (item: HomeVideoThumbnail) => {
      if (!selectedMarker) {
        return;
      }
      closeNearbyFeedsModal();
      onOpenFeed(buildVideoMarker(item, selectedMarker));
    },
    [closeNearbyFeedsModal, onOpenFeed, selectedMarker],
  );

  const handleOpenNearbyImage = useCallback(
    (item: HomeImageThumbnail) => {
      closeNearbyFeedsModal();
      onOpenImage(item);
    },
    [closeNearbyFeedsModal, onOpenImage],
  );

  const modalFeedSummary = useMemo(
    () => [
      {
        key: 'ALL' as const,
        label: '전체',
        icon: 'apps-outline' as const,
        count: nearbyFeedVideos.length + nearbyFeedImages.length,
      },
      {
        key: 'VIDEO' as const,
        label: '영상',
        icon: 'videocam-outline' as const,
        count: nearbyFeedVideos.length,
      },
      {
        key: 'IMAGE' as const,
        label: '이미지',
        icon: 'images-outline' as const,
        count: nearbyFeedImages.length,
      },
    ],
    [nearbyFeedImages.length, nearbyFeedVideos.length],
  );

  const modalFeedEntries = useMemo<NearbyFeedListEntry[]>(() => {
    const entries: NearbyFeedListEntry[] = [];

    if (nearbyFeedTab !== 'IMAGE') {
      entries.push({
        key: 'header-video',
        type: 'HEADER',
        title: '근처 영상',
        count: nearbyFeedVideos.length,
      });
      if (nearbyFeedVideos.length > 0) {
        nearbyFeedVideos.forEach((item, index) => {
          entries.push({
            key: `video-${item.storeId}-${item.placeId ?? item.updatedAt ?? item.createdAt ?? 'none'}-${index}`,
            type: 'VIDEO',
            item,
          });
        });
      } else {
        entries.push({
          key: 'empty-video',
          type: 'EMPTY',
          message: '근처 영상 피드가 아직 없어요.',
        });
      }
    }

    if (nearbyFeedTab !== 'VIDEO') {
      entries.push({
        key: 'header-image',
        type: 'HEADER',
        title: '근처 이미지',
        count: nearbyFeedImages.length,
      });
      if (nearbyFeedImages.length > 0) {
        nearbyFeedImages.forEach((item, index) => {
          entries.push({
            key: `image-${item.feedNo}-${index}`,
            type: 'IMAGE',
            item,
          });
        });
      } else {
        entries.push({
          key: 'empty-image',
          type: 'EMPTY',
          message: '근처 이미지 피드가 아직 없어요.',
        });
      }
    }

    return entries;
  }, [nearbyFeedImages, nearbyFeedTab, nearbyFeedVideos]);

  const renderModalFeedEntry = useCallback(
    ({ item }: { item: NearbyFeedListEntry }) => {
      switch (item.type) {
        case 'HEADER':
          return (
            <View style={styles.modalSectionHeader}>
              <Text style={styles.modalSectionTitle}>{item.title}</Text>
              <Text style={styles.modalSectionCount}>{item.count}</Text>
            </View>
          );
        case 'VIDEO': {
          const thumbnailUri =
            buildHomeVideoThumbUrl(
              item.item.thumbnail,
              item.item.createdAt ?? item.item.updatedAt,
            ) ?? '';
          return (
            <TouchableOpacity
              style={styles.modalFeedCard}
              onPress={() => handleOpenNearbyVideo(item.item)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`영상 피드 ${item.item.storeName?.trim() || item.item.title?.trim() || '근처 영상'}`}
              accessibilityHint="선택하면 영상 피드 화면으로 이동합니다."
            >
              <View style={styles.modalFeedMedia}>
                {thumbnailUri ? (
                  <Image
                    source={{ uri: thumbnailUri }}
                    style={styles.modalFeedThumb}
                    fadeDuration={0}
                  />
                ) : (
                  <View style={styles.modalFeedThumbFallback}>
                    <Ionicons
                      name="videocam-outline"
                      size={22}
                      color={HOME_COLORS.textMutedAlt}
                    />
                  </View>
                )}
                <View style={styles.modalFeedOverlayRow}>
                  <View style={styles.modalFeedBadge}>
                    <Text style={styles.modalFeedBadgeText}>영상</Text>
                  </View>
                  <Text style={styles.modalFeedTimeOverlay}>
                    {formatTimeAgo(item.item.createdAt ?? item.item.updatedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalFeedContent}>
                <Text style={styles.modalFeedTitle} numberOfLines={2}>
                  {item.item.storeName?.trim() || item.item.title?.trim() || '근처 영상'}
                </Text>
                <Text style={styles.modalFeedSub} numberOfLines={1}>
                  {item.item.address?.trim() || '주소 정보 없음'}
                </Text>
                <View style={styles.modalFeedFooter}>
                  <Text style={styles.modalFeedHint}>이 식당 영상 피드 열기</Text>
                  <View style={styles.modalFeedAction}>
                    <Text style={styles.modalFeedActionText}>열기</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={HOME_COLORS.textPrimary}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }
        case 'IMAGE': {
          const thumbnailUri = buildFeedImageUrl(item.item.thumbFileName);
          return (
            <TouchableOpacity
              style={styles.modalFeedCard}
              onPress={() => handleOpenNearbyImage(item.item)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`이미지 피드 ${item.item.storeName?.trim() || item.item.title?.trim() || '근처 이미지'}`}
              accessibilityHint="선택하면 이미지 피드 화면으로 이동합니다."
            >
              <View style={styles.modalFeedMedia}>
                {thumbnailUri ? (
                  <Image
                    source={{ uri: thumbnailUri }}
                    style={styles.modalFeedThumb}
                    fadeDuration={0}
                  />
                ) : (
                  <View style={styles.modalFeedThumbFallback}>
                    <Ionicons
                      name="images-outline"
                      size={22}
                      color={HOME_COLORS.textMutedAlt}
                    />
                  </View>
                )}
                <View style={styles.modalFeedOverlayRow}>
                  <View style={styles.modalFeedBadgeSoft}>
                    <Text style={styles.modalFeedBadgeSoftText}>이미지</Text>
                  </View>
                  <Text style={styles.modalFeedTimeOverlay}>
                    {formatTimeAgo(item.item.createdAt ?? item.item.updatedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalFeedContent}>
                <Text style={styles.modalFeedTitle} numberOfLines={2}>
                  {item.item.storeName?.trim() || item.item.title?.trim() || '근처 이미지'}
                </Text>
                <Text style={styles.modalFeedSub} numberOfLines={1}>
                  {item.item.address?.trim() || '주소 정보 없음'}
                </Text>
                <View style={styles.modalFeedFooter}>
                  <Text style={styles.modalFeedHint}>이 식당 이미지 피드 열기</Text>
                  <View style={styles.modalFeedAction}>
                    <Text style={styles.modalFeedActionText}>열기</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={HOME_COLORS.textPrimary}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }
        case 'EMPTY':
          return (
            <View style={styles.modalEmptyCard}>
              <Text style={styles.modalEmptyText}>{item.message}</Text>
            </View>
          );
        default:
          return null;
      }
    },
    [handleOpenNearbyImage, handleOpenNearbyVideo],
  );

  return (
    <View style={styles.shell}>
      <NearbyMapCanvas
        style={StyleSheet.absoluteFill}
        isActive={isFocused}
        mode={experienceMode === 'LIKES' ? 'likes' : 'nearby'}
        category={experienceMode === 'LIKES' ? undefined : effectiveNearbyCategory}
        externalMarkers={experienceMode === 'LIKES' ? visibleLikedMarkers : undefined}
        externalLoading={experienceMode === 'LIKES' ? likedLoading : undefined}
        externalError={experienceMode === 'LIKES' ? likedError : undefined}
        selectedMarkerKey={selectedMarkerKey}
        focusedMarker={focusedMarkerRequest}
        onSelectMarker={handleSelectMarkerFromMap}
        onPressMap={handlePressBackgroundMap}
        onNearbyStateChange={setNearbyState}
        onRequestCenterUser={handleRegisterCenterUser}
        onRequestRefreshMarkers={handleRegisterRefreshMarkers}
        onLocationStatusChange={onLocationStatusChange}
        onUserLocationResolved={onUserLocationResolved}
        onViewportCenterChange={onViewportCenterChange}
      />

      <View pointerEvents="none" style={styles.mapAtmosphere}>
        <View style={styles.atmosphereBottom} />
      </View>

      <View style={styles.edgeSwipeOverlay} pointerEvents="box-none">
        <GestureDetector gesture={leftEdgeGesture}>
          <View style={styles.edgeSwipeZoneLeft} />
        </GestureDetector>
        <GestureDetector gesture={rightEdgeGesture}>
          <View style={styles.edgeSwipeZoneRight} />
        </GestureDetector>
      </View>

      <View style={styles.topOverlay} pointerEvents="box-none">
        {showSortPanel ? (
          <View style={styles.sortPanel}>
            {SORT_OPTIONS.map((option) => {
              const active = sortType === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => onSelectSort(option.key)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} 보기`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <View style={styles.modeRail}>
          <TouchableOpacity
            style={[styles.modeChip, experienceMode === 'NEARBY' && styles.modeChipActive]}
            onPress={() => setExperienceMode('NEARBY')}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="내 주변 보기"
            accessibilityState={{ selected: experienceMode === 'NEARBY' }}
          >
            <Text
              style={[
                styles.modeChipText,
                experienceMode === 'NEARBY' && styles.modeChipTextActive,
              ]}
            >
              주변
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, experienceMode === 'LIKES' && styles.modeChipActive]}
            onPress={() => setExperienceMode('LIKES')}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="좋아요 맵 보기"
            accessibilityState={{ selected: experienceMode === 'LIKES' }}
          >
            <Text
              style={[
                styles.modeChipText,
                experienceMode === 'LIKES' && styles.modeChipTextActive,
              ]}
            >
              좋아요 맵
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.utilityRow}>
          {experienceMode === 'LIKES' ? (
            <View style={styles.likesSummaryPill}>
              <Ionicons name="heart-outline" size={14} color={HOME_COLORS.textPrimary} />
              <Text style={styles.likesSummaryText}>
                장소 {filteredLikedPlaces.length} · 영상 {likedVideos.length} · 이미지 {likedImages.length}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.utilityButton}
              onPress={() => recenterToUser?.()}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="내 위치로 이동"
              accessibilityHint="현재 위치 기준으로 지도를 다시 맞춥니다."
            >
              <Ionicons name="navigate" size={14} color={HOME_COLORS.textPrimary} />
              <Text style={styles.utilityButtonText}>내 위치</Text>
            </TouchableOpacity>
          )}

          {utilityStatusLabel ? (
            <View style={styles.utilityStatusGroup}>
              <View style={[styles.utilityStatusPill, hasAlertStatus && styles.utilityStatusPillAlert]}>
                <Text
                  style={[
                    styles.utilityStatusText,
                    !isRefreshingNearby && hasAlertStatus && styles.utilityStatusTextAlert,
                  ]}
                  numberOfLines={1}
                >
                  {utilityStatusLabel}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.utilitySummaryRefresh}
                onPress={handleRefreshNearby}
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel="근처 가게 새로고침"
                accessibilityHint="주변 피드와 가게 정보를 다시 불러옵니다."
                disabled={isRefreshingNearby}
              >
                {isRefreshingNearby ? (
                  <ActivityIndicator size="small" color={HOME_COLORS.textPrimary} />
                ) : (
                  <Ionicons name="refresh-outline" size={15} color={HOME_COLORS.textPrimary} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.utilitySummaryRefresh}
              onPress={handleRefreshNearby}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="근처 가게 새로고침"
              accessibilityHint="주변 피드와 가게 정보를 다시 불러옵니다."
              disabled={isRefreshingNearby}
            >
              {isRefreshingNearby ? (
                <ActivityIndicator size="small" color={HOME_COLORS.textPrimary} />
              ) : (
                <Ionicons name="refresh-outline" size={15} color={HOME_COLORS.textPrimary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {showNearbyCategoryRail ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRail}
          >
            {NEARBY_CATEGORY_OPTIONS.map((option) => {
              const selected = selectedNearbyCategoryKey === option.key;
              const count =
                selected
                  ? sortedMarkers.length
                  : selectedNearbyCategoryKey === 'ALL' && hasNearbyCategoryCounts
                    ? nearbyCategoryCounts[option.key]
                    : null;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setSelectedNearbyCategoryKey(option.key)}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label}${typeof count === 'number' ? ` ${count}` : ''}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                  >
                    {option.label}
                  </Text>
                  {typeof count === 'number' ? (
                    <Text
                      style={[
                        styles.categoryChipCount,
                        selected && styles.categoryChipCountSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={[styles.bottomOverlay, { bottom: bottomDockOffset }]} pointerEvents="box-none">
        {!isDockHidden && !isDockExpanded && !selectedMarker && spotlightPlaces.length > 0 ? (
          <Animated.View style={railAnimatedStyle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotRail}
            >
              {spotlightPlaces.map((marker, index) => {
                const markerKey = buildMarkerKey(marker);
                const selected = markerKey === selectedMarkerKey;
                const markerThumbUri = buildImageUrl(marker.thumbnail);
                return (
                  <TouchableOpacity
                    key={`${markerKey}-${index}`}
                    style={[styles.spotChip, selected && styles.spotChipSelected]}
                    onPress={() => {
                      setSelectedMarkerKey(markerKey);
                      setFocusedMarkerRequest(marker);
                      setDockMode('expanded');
                    }}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityLabel={`${marker.storeName?.trim() || '이름 없는 가게'}, ${formatDistance(marker.distanceM)}, 피드 ${marker.feedCount ?? 0}개`}
                    accessibilityHint="선택하면 가게 정보가 열립니다."
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.spotChipThumbWrap}>
                      {markerThumbUri ? (
                        <Image
                          source={{ uri: markerThumbUri }}
                          style={styles.spotChipThumb}
                        />
                      ) : (
                        <View style={styles.spotChipThumbFallback}>
                          <Ionicons
                            name="storefront-outline"
                            size={16}
                            color={HOME_COLORS.textMutedAlt}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.spotChipBody}>
                      <Text
                        style={[styles.spotChipTitle, selected && styles.spotChipTitleSelected]}
                        numberOfLines={1}
                      >
                        {marker.storeName?.trim() || '이름 없는 가게'}
                      </Text>
                      <View style={styles.spotChipMetaRow}>
                        <Text
                          style={[styles.spotChipSub, selected && styles.spotChipSubSelected]}
                        >
                          {formatDistance(marker.distanceM)}
                        </Text>
                        <Text
                          style={[styles.spotChipCount, selected && styles.spotChipCountSelected]}
                        >
                          {getMarkerMetaLabel(marker)}
                        </Text>
                      </View>
                      <Text
                        style={[styles.spotChipFoot, selected && styles.spotChipFootSelected]}
                        numberOfLines={1}
                      >
                        피드 {marker.feedCount ?? 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : null}

        {isDockHidden ? (
          <Animated.View style={hiddenDockAnimatedStyle}>
            <TouchableOpacity
              style={styles.hiddenDockButton}
              onPress={() => setDockMode(selectedMarker ? 'expanded' : 'peek')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`${hiddenDockLabel} 정보 열기`}
              accessibilityHint="선택한 가게의 요약 정보를 다시 엽니다."
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={15}
                color={HOME_COLORS.textPrimary}
              />
              <Text style={styles.hiddenDockButtonText} numberOfLines={1}>
                가게 정보 다시 보기
              </Text>
              <Ionicons name="chevron-up" size={14} color={HOME_COLORS.textPrimary} />
            </TouchableOpacity>
          </Animated.View>
        ) : isDockExpanded && selectedMarker ? (
          <Animated.View style={dockAnimatedStyle}>
            <View style={styles.dockCard}>
              <View style={styles.dockBody}>
                <TouchableOpacity
                  style={styles.dockCloseButton}
                  onPress={() => setDockMode('hidden')}
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityLabel="가게 정보 닫기"
                >
                  <Ionicons name="close" size={14} color={HOME_COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.dockIdentityRow}>
                  <View style={styles.dockIdentityMedia}>
                    {selectedHeroImage ? (
                      <Image source={{ uri: selectedHeroImage }} style={styles.dockImage} />
                    ) : (
                      <View style={styles.dockImageFallback}>
                        <Ionicons
                          name="storefront-outline"
                          size={28}
                          color={HOME_COLORS.textMutedAlt}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.dockIdentityCopy}>
                    <Text style={styles.dockEyebrow}>선택한 가게</Text>
                    <Text style={styles.dockTitle} numberOfLines={2}>
                      {selectedMarker.storeName?.trim() || '이름 없는 가게'}
                    </Text>
                    <Text style={styles.dockAddress} numberOfLines={2}>
                      {selectedMarker.address?.trim() || '주소 정보 없음'}
                    </Text>
                    <View style={styles.dockBadgeRow}>
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceBadgeText}>
                          {formatDistance(selectedMarker.distanceM)}
                        </Text>
                      </View>
                      <View style={styles.softBadge}>
                        <Text style={styles.softBadgeText}>{getMarkerMetaLabel(selectedMarker)}</Text>
                      </View>
                      <View style={styles.softBadge}>
                        <Text style={styles.softBadgeText}>피드 {selectedMarker.feedCount ?? 0}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.dockSummaryRow}>
                  <View style={styles.dockSummaryBlock}>
                    <View style={styles.dockInfoList}>
                      <View style={styles.dockInfoRow}>
                        <Text style={styles.dockInfoLabel}>유형</Text>
                        <Text style={styles.dockInfoValue}>
                          {getMarkerMetaLabel(selectedMarker)}
                        </Text>
                      </View>
                      <View style={styles.dockInfoRow}>
                        <Text style={styles.dockInfoLabel}>콘텐츠</Text>
                        <Text style={styles.dockInfoValue}>
                          영상 {matchingVideos.length} · 이미지 {matchingImages.length}
                        </Text>
                      </View>
                      <View style={styles.dockInfoRow}>
                        <Text style={styles.dockInfoLabel}>전체 피드</Text>
                        <Text style={styles.dockInfoValue}>
                          {selectedMarker.feedCount ?? 0}개
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.summaryHint}>
                      {experienceMode === 'LIKES'
                        ? '좋아요한 콘텐츠를 먼저 열고, 같은 장소에 남긴 기록은 모아보기에서 다시 볼 수 있어요.'
                        : '먼저 이 식당 피드를 보고, 더 넓게 보려면 주변 모아보기를 열어보세요.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={handleOpenSelectedFeed}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="이 식당 피드 보기"
                    accessibilityHint="선택한 식당에 연결된 피드 화면을 바로 엽니다."
                  >
                    <Text style={styles.primaryActionTextPrimary}>
                      {experienceMode === 'LIKES' ? '최근 좋아요 열기' : '식당 피드 보기'}
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={openNearbyFeedsModal}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="이 주변 피드 모아보기"
                    accessibilityHint="선택한 식당 주변에 올라온 영상과 이미지 피드를 모아 봅니다."
                  >
                    <Text style={styles.secondaryActionText}>
                      {experienceMode === 'LIKES' ? '좋아요 모아보기' : '주변 모아보기'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : selectedMarker ? (
          <Animated.View style={dockAnimatedStyle}>
            <View style={styles.peekCard}>
            <TouchableOpacity
              style={styles.peekCloseButton}
              onPress={() => setDockMode('hidden')}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="가게 정보 접기"
            >
              <Ionicons name="close" size={13} color={HOME_COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.peekHandle} />
            <TouchableOpacity
              style={styles.peekBody}
              onPress={() => setDockMode('expanded')}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${selectedMarker.storeName?.trim() || '이름 없는 가게'} 정보 보기`}
              accessibilityHint="선택한 가게의 자세한 정보를 엽니다."
            >
              <View style={styles.peekThumbWrap}>
                {selectedHeroImage ? (
                  <Image source={{ uri: selectedHeroImage }} style={styles.peekThumb} />
                ) : (
                  <View style={styles.peekThumbFallback}>
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={HOME_COLORS.textMutedAlt}
                    />
                  </View>
                )}
              </View>
              <View style={styles.peekCopy}>
                <Text style={styles.peekEyebrow}>
                  {experienceMode === 'LIKES' ? '내가 좋아요한 스팟' : '지금 많이 보는 스팟'}
                </Text>
                <View style={styles.peekMetaRow}>
                  <View style={styles.peekDistanceBadge}>
                    <Text style={styles.peekDistanceBadgeText}>
                      {experienceMode === 'LIKES'
                        ? '좋아요'
                        : formatDistance(selectedMarker.distanceM)}
                    </Text>
                  </View>
                  <View style={styles.peekSoftBadge}>
                    <Text style={styles.peekSoftBadgeText}>
                      피드 {selectedMarker.feedCount ?? 0}
                    </Text>
                  </View>
                </View>
                <Text style={styles.peekTitle} numberOfLines={1}>
                  {selectedMarker.storeName?.trim() || '이름 없는 가게'}
                </Text>
                <Text style={styles.peekSub} numberOfLines={1}>
                  {experienceMode === 'LIKES' ? '좋아요한 기록' : getMarkerMetaLabel(selectedMarker)} · 영상 {matchingVideos.length} · 이미지 {matchingImages.length}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.peekAction}
              onPress={handleOpenSelectedFeed}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="이 식당 피드 보기"
            >
              <Text style={styles.peekActionText}>피드 보기</Text>
              <Ionicons name="arrow-forward" size={14} color={HOME_COLORS.textPrimary} />
            </TouchableOpacity>
            </View>
          </Animated.View>
        ) : shouldShowIdleDock ? (
          <Animated.View style={dockAnimatedStyle}>
            <View style={[styles.peekCard, styles.peekCardIdle]}>
            <View style={styles.peekHandle} />
            <View style={styles.emptyDock}>
              <View style={styles.emptyDockIcon}>
                <Ionicons name="compass-outline" size={20} color={HOME_COLORS.textPrimary} />
              </View>
              <View style={styles.emptyDockBody}>
                <Text style={styles.emptyDockTitle}>
                  {experienceMode === 'LIKES'
                    ? user?.username
                      ? isLikedSearchEmpty
                        ? '좋아요한 장소를 찾지 못했어요'
                        : likedLoading
                        ? '좋아요한 장소를 모으는 중이에요'
                        : '좋아요한 장소가 아직 없어요'
                      : '로그인하면 좋아요 맵을 볼 수 있어요'
                    : isSearchEmpty
                    ? '검색한 가게를 찾지 못했어요'
                    : isCategoryEmpty
                    ? `${selectedNearbyCategory.label} 스팟이 아직 없어요`
                    : nearbyState.loading
                    ? '지금 근처 스팟을 찾는 중이에요'
                    : '지도를 움직여 가게를 골라보세요'}
                </Text>
                <Text style={styles.emptyDockSub}>
                  {experienceMode === 'LIKES'
                    ? user?.username
                      ? isLikedSearchEmpty
                        ? '검색어를 조금 바꾸거나 좋아요한 다른 장소를 찾아보세요.'
                        : likedError
                        ? likedError
                        : '좋아요한 영상과 이미지를 장소 단위로 모아 보여드려요.'
                      : '좋아요한 장소는 로그인한 사용자에게만 제공돼요.'
                    : isSearchEmpty
                    ? '검색어를 조금 바꾸거나 지도를 다른 지역으로 옮겨서 다시 찾아보세요.'
                    : isCategoryEmpty
                    ? '다른 카테고리를 보거나 전체 보기로 돌아가서 다시 살펴보세요.'
                    : nearbyState.error
                    ? nearbyState.error
                    : '지도는 넓게 보고, 핀을 누르면 가게 정보가 다시 열립니다.'}
                </Text>
              </View>
                <TouchableOpacity
                  style={styles.emptyDockButton}
                  onPress={() => {
                    if (experienceMode === 'LIKES') {
                      loadLikedPlaces();
                      return;
                    }
                    if (isCategoryEmpty) {
                      setSelectedNearbyCategoryKey('ALL');
                      return;
                    }
                    recenterToUser?.();
                  }}
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityLabel={
                    experienceMode === 'LIKES'
                      ? '좋아요한 장소 새로고침'
                      : isCategoryEmpty
                      ? '전체 카테고리 보기'
                      : '내 위치로 이동'
                  }
                >
                  <Text style={styles.emptyDockButtonText}>
                    {experienceMode === 'LIKES'
                      ? '다시 불러오기'
                      : isCategoryEmpty
                      ? '전체 보기'
                      : '내 위치'}
                  </Text>
                </TouchableOpacity>
            </View>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <Modal
        visible={nearbyFeedsVisible}
        transparent
        animationType="fade"
        hardwareAccelerated
        onRequestClose={closeNearbyFeedsModal}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeNearbyFeedsModal} />
          <Animated.View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + 18 },
              {
                opacity: modalEntrance,
                transform: [
                  {
                    translateY: modalEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [42, 0],
                    }),
                  },
                  {
                    scale: modalEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBody}>
                <Text style={styles.modalEyebrow}>
                  {experienceMode === 'LIKES' ? '내가 남긴 좋아요' : '선택한 스팟 근처 피드'}
                </Text>
                <Text style={styles.modalTitle}>
                  {selectedMarker?.storeName?.trim() || '근처 가게'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedMarker?.address?.trim() ||
                    (experienceMode === 'LIKES'
                      ? '좋아요한 영상과 이미지를 장소 기준으로 모아봤어요.'
                      : '주변에 올라온 영상과 이미지 피드를 모아봤어요.')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeNearbyFeedsModal}
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel="피드 모달 닫기"
              >
                <Ionicons name="close" size={18} color={HOME_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTabGrid}>
              {modalFeedSummary.map((tab) => {
                const active = nearbyFeedTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.modalTabChip, active && styles.modalTabChipActive]}
                    onPress={() => setNearbyFeedTab(tab.key)}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    accessibilityLabel={`${tab.label} 피드 필터`}
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={active ? '#4a433c' : '#726a63'}
                    />
                    <Text style={[styles.modalTabText, active && styles.modalTabTextActive]}>
                      {tab.label}
                    </Text>
                    <View
                      style={[styles.modalTabCountPill, active && styles.modalTabCountPillActive]}
                    >
                      <Text
                        style={[styles.modalTabCountText, active && styles.modalTabCountTextActive]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {nearbyFeedsLoading ? (
              <View style={styles.modalStateCard}>
                <ActivityIndicator size="small" color={HOME_COLORS.textPrimary} />
                <Text style={styles.modalStateTitle}>근처 피드를 모으는 중이에요</Text>
              </View>
            ) : nearbyFeedsError ? (
              <View style={styles.modalStateCard}>
                <Text style={styles.modalStateTitle}>{nearbyFeedsError}</Text>
                <TouchableOpacity
                  style={styles.modalRetryButton}
                  onPress={() => {
                    if (!selectedMarker) {
                      return;
                    }
                    loadNearbyFeeds(selectedMarker, { force: true }).catch(() => undefined);
                  }}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel="근처 피드 다시 불러오기"
                >
                  <Text style={styles.modalRetryButtonText}>다시 불러오기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={modalFeedEntries}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyExtractor={(item) => item.key}
                renderItem={renderModalFeedEntry}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={32}
                windowSize={6}
                removeClippedSubviews={Platform.OS === 'android'}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default NearbyHomeExperience;

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: HOME_COLORS.surface,
  },
  mapAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  edgeSwipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  edgeSwipeZoneLeft: {
    width: 5,
    height: '100%',
  },
  edgeSwipeZoneRight: {
    width: 5,
    height: '100%',
  },
  atmosphereBottom: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    gap: 10,
  },
  sortPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sortChip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: 'transparent',
    borderBottomColor: HOME_COLORS.textPrimary,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: HOME_COLORS.textMutedAlt,
  },
  sortChipTextActive: {
    color: NEARBY_ACCENT,
    fontWeight: '900',
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modeRail: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modeChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modeChipActive: {
    backgroundColor: HOME_COLORS.textPrimary,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textMutedAlt,
  },
  modeChipTextActive: {
    color: HOME_COLORS.surface,
  },
  utilityButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  utilityButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  likesSummaryPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  likesSummaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  utilityStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityStatusPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  utilityStatusPillAlert: {
    borderColor: HOME_COLORS.borderStrong,
  },
  utilityStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  utilityStatusTextAlert: {
    color: NEARBY_ACCENT,
  },
  utilitySummaryRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  categoryRail: {
    gap: 8,
    paddingRight: 4,
  },
  categoryChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  categoryChipSelected: {
    backgroundColor: HOME_COLORS.textPrimary,
    borderColor: HOME_COLORS.textPrimary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  categoryChipTextSelected: {
    color: HOME_COLORS.surface,
  },
  categoryChipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textMutedAlt,
  },
  categoryChipCountSelected: {
    color: 'rgba(255,255,255,0.84)',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 10,
  },
  hiddenDockButton: {
    alignSelf: 'center',
    maxWidth: '92%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: NEARBY_SURFACE_STRONG,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  hiddenDockButtonText: {
    maxWidth: 180,
    fontSize: 13,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  spotRail: {
    gap: 8,
    paddingRight: 4,
  },
  spotChip: {
    width: 166,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: NEARBY_SURFACE,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  spotChipSelected: {
    backgroundColor: HOME_COLORS.surface,
    borderColor: HOME_COLORS.textPrimary,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  spotChipThumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surface,
  },
  spotChipThumb: {
    width: '100%',
    height: '100%',
  },
  spotChipThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
  },
  spotChipBody: {
    flex: 1,
    minWidth: 0,
  },
  spotChipTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  spotChipTitleSelected: {
    color: NEARBY_ACCENT,
  },
  spotChipMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  spotChipSub: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textMutedAlt,
  },
  spotChipSubSelected: {
    color: NEARBY_ACCENT,
  },
  spotChipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textMutedAlt,
  },
  spotChipCountSelected: {
    color: HOME_COLORS.textPrimary,
  },
  spotChipFoot: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  spotChipFootSelected: {
    color: HOME_COLORS.textPrimary,
  },
  peekCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    paddingRight: 52,
    paddingBottom: 14,
    paddingLeft: 14,
    borderRadius: 24,
    backgroundColor: NEARBY_SURFACE_STRONG,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  peekCardIdle: {
    paddingBottom: 12,
  },
  peekHandle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.borderMuted,
  },
  peekBody: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  peekCloseButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
  },
  peekMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  peekThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surface,
  },
  peekThumb: {
    width: '100%',
    height: '100%',
  },
  peekThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekCopy: {
    flex: 1,
    minWidth: 0,
  },
  peekEyebrow: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: HOME_COLORS.textMutedAlt,
  },
  peekDistanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  peekDistanceBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  peekSoftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  peekSoftBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textMutedAlt,
  },
  peekTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  peekSub: {
    marginTop: 4,
    fontSize: 12,
    color: HOME_COLORS.textMutedAlt,
  },
  peekAction: {
    minWidth: 74,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: HOME_COLORS.surface,
  },
  peekActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  dockCard: {
    position: 'relative',
    borderRadius: 28,
    backgroundColor: NEARBY_SURFACE_STRONG,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  dockCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
  },
  dockImage: {
    width: '100%',
    height: '100%',
  },
  dockImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  dockIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 36,
  },
  dockIdentityMedia: {
    width: 96,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  dockIdentityCopy: {
    flex: 1,
    minWidth: 0,
  },
  dockEyebrow: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: HOME_COLORS.textMutedAlt,
  },
  distanceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  softBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  softBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textMutedAlt,
  },
  dockTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
    lineHeight: 24,
  },
  dockAddress: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: HOME_COLORS.textMutedAlt,
  },
  dockBadgeRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dockSummaryRow: {
    marginTop: 12,
    gap: 10,
  },
  dockSummaryBlock: {
    gap: 8,
  },
  dockInfoList: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surface,
  },
  dockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: HOME_COLORS.borderMuted,
  },
  dockInfoLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textLight,
  },
  dockInfoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 17,
    color: HOME_COLORS.textMutedAlt,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: HOME_COLORS.textPrimary,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryActionTextPrimary: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  emptyDock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyDockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  emptyDockBody: {
    flex: 1,
  },
  emptyDockTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  emptyDockSub: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: HOME_COLORS.textMutedAlt,
  },
  emptyDockButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  emptyDockButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  modalSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: HOME_COLORS.surfacePanel,
    paddingTop: 12,
    paddingHorizontal: 18,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.borderMuted,
  },
  modalHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalHeaderBody: {
    flex: 1,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textMutedAlt,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: HOME_COLORS.textMutedAlt,
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modalTabGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
  },
  modalTabChip: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalTabChipActive: {
    backgroundColor: HOME_COLORS.textPrimary,
    borderColor: HOME_COLORS.textPrimary,
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textMutedAlt,
    textAlign: 'center',
  },
  modalTabTextActive: {
    color: HOME_COLORS.surface,
  },
  modalTabCountPill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalTabCountPillActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  modalTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.textMutedAlt,
    textAlign: 'center',
  },
  modalTabCountTextActive: {
    color: HOME_COLORS.surface,
  },
  modalStateCard: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 26,
    borderRadius: 24,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  modalRetryButton: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderStrong,
  },
  modalRetryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalScroll: {
    marginTop: 10,
  },
  modalScrollContent: {
    paddingBottom: 10,
    gap: 16,
  },
  modalSection: {
    gap: 10,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalSectionCount: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textMutedAlt,
  },
  modalFeedCard: {
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modalFeedMedia: {
    height: 196,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  modalFeedThumb: {
    width: '100%',
    height: '100%',
  },
  modalFeedThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFeedOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalFeedContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 8,
  },
  modalFeedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.textPrimary,
  },
  modalFeedBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: HOME_COLORS.surface,
  },
  modalFeedBadgeSoft: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.surfacePanel,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalFeedBadgeSoftText: {
    fontSize: 10,
    fontWeight: '900',
    color: HOME_COLORS.textMutedAlt,
  },
  modalFeedTimeOverlay: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.surface,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalFeedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
    lineHeight: 22,
  },
  modalFeedSub: {
    fontSize: 12,
    color: HOME_COLORS.textMutedAlt,
  },
  modalFeedFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalFeedHint: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
    flex: 1,
  },
  modalFeedAction: {
    minWidth: 60,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 19,
    backgroundColor: HOME_COLORS.surfacePanel,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },
  modalFeedActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalImageCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalImageCountBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  modalEmptyCard: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: NEARBY_BORDER,
  },
  modalEmptyText: {
    fontSize: 12,
    color: HOME_COLORS.textMutedAlt,
  },
});
