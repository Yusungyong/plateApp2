// src/screens/search/FeedSearchScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { fetchSearch, type SearchItem } from '../../api/searchApi';
import { buildFeedImageUrl } from '../../api/homeImageApi';
import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { useTheme } from '../../styles/theme';
import { getAndroidCurrentPosition } from '../../native/plateLocation';
import { buildImageUrl } from '../home/utils/imageUtils';
import { buildHomeVideoThumbUrl } from '../home/utils/videoUtils';

type SearchViewState = 'idle' | 'loading' | 'error' | 'empty' | 'results';
type SearchType = 'all' | 'video' | 'image';
type SearchSort = 'RECENT' | 'POPULAR' | 'DISTANCE';
type ThemeColors = ReturnType<typeof useTheme>['colors'];
type ThemeSpacing = ReturnType<typeof useTheme>['spacing'];
type ThemeRadius = ReturnType<typeof useTheme>['radius'];

type SearchCoordinate = {
  latitude: number;
  longitude: number;
};

type SearchFilters = {
  sort: SearchSort;
  radius: number;
};

type GroupedSearchResult = {
  groupKey: string;
  representative: SearchItem;
  items: SearchItem[];
  storeName: string;
  address: string | null;
  thumbnailUri: string;
  totalCount: number;
  videoCount: number;
  imageCount: number;
  placeCount: number;
  distanceLabel: string | null;
};

type GridEntry = {
  cardKey: string;
  group: GroupedSearchResult;
  thumbnailUri: string;
  mediaHeight: number;
  totalHeight: number;
};

type SearchScreenCache = {
  query: string;
  searchType: SearchType;
  filters: SearchFilters;
  results: SearchItem[];
  total: number;
  page: number;
  hasMore: boolean;
  errorMsg: string | null;
  aspectMap: Record<string, number>;
  scrollOffset: number;
  userLocation: SearchCoordinate | null;
};

const PAGE_SIZE = 20;
const GRID_GAP = 10;
const SEARCH_TYPE_OPTIONS: Array<{ key: SearchType; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'video', label: '영상' },
  { key: 'image', label: '이미지' },
];
const SEARCH_SORT_OPTIONS: Array<{ key: SearchSort; label: string }> = [
  { key: 'RECENT', label: '최신순' },
  { key: 'POPULAR', label: '인기순' },
  { key: 'DISTANCE', label: '가까운순' },
];
const SEARCH_RADIUS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: '전체' },
  { value: 1000, label: '1km' },
  { value: 3000, label: '3km' },
  { value: 5000, label: '5km' },
];
const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  sort: 'RECENT',
  radius: 0,
};
const createInitialSearchScreenCache = (): SearchScreenCache => ({
  query: '',
  searchType: 'all',
  filters: DEFAULT_SEARCH_FILTERS,
  results: [],
  total: 0,
  page: 0,
  hasMore: false,
  errorMsg: null,
  aspectMap: {},
  scrollOffset: 0,
  userLocation: null,
});
let searchScreenCache: SearchScreenCache = createInitialSearchScreenCache();

const normalizeGroupText = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const hasMeaningfulSearchTerm = (value: string) =>
  /[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value);

const cleanSearchText = (value?: string | null) => {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.toLowerCase() === 'undefined') {
    return null;
  }
  return normalized;
};

const formatCompactAddress = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/^대한민국\s+/, '');
  const commaSegments = normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(
      (segment) =>
        segment &&
        !/^south korea$/i.test(segment) &&
        !/^대한민국$/.test(segment),
    );

  if (commaSegments.length >= 3) {
    return commaSegments.slice(-2).join(' · ');
  }

  const segments = normalized.split(/\s+/).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  return segments.slice(0, 2).join(' ');
};

const formatDistance = (distanceM?: number) => {
  if (typeof distanceM !== 'number' || Number.isNaN(distanceM) || distanceM <= 0) {
    return null;
  }
  if (distanceM < 1000) {
    return `${Math.round(distanceM)}m`;
  }
  const km = distanceM / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)}km`;
};

const formatRadiusLabel = (radius: number) => {
  if (!radius) {
    return '반경 전체';
  }
  if (radius < 1000) {
    return `반경 ${radius}m`;
  }
  return `반경 ${radius / 1000}km`;
};

const buildFilterSummary = (filters: SearchFilters) => {
  const labels: string[] = [];
  if (filters.sort === 'POPULAR') {
    labels.push('인기순');
  } else if (filters.sort === 'DISTANCE') {
    labels.push('가까운순');
  }
  if (filters.radius > 0) {
    labels.push(formatRadiusLabel(filters.radius));
  }
  return labels.join(' · ');
};

const needsLocationForFilters = (filters: SearchFilters) =>
  filters.sort === 'DISTANCE' || filters.radius > 0;

const getStableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash);
};

const getEditorialMediaHeight = (params: {
  aspect: number;
  columnWidth: number;
  group: GroupedSearchResult;
}) => {
  const { aspect, columnWidth, group } = params;

  if (group.placeCount > 0 && group.videoCount === 0 && group.imageCount === 0) {
    return 152;
  }

  const boundedAspect = Math.min(Math.max(aspect, 0.52), 1.9);
  let baseHeight = columnWidth / boundedAspect;

  if (boundedAspect < 0.85) {
    baseHeight += columnWidth * 0.26;
  } else if (boundedAspect > 1.35) {
    baseHeight -= columnWidth * 0.1;
  } else {
    baseHeight += columnWidth * 0.12;
  }

  const editorialOffsets = [-20, 8, 26, -6, 16];
  const offset = editorialOffsets[getStableHash(group.groupKey) % editorialOffsets.length];
  const contentBias =
    group.imageCount > 0 && group.videoCount === 0
      ? 12
      : group.videoCount > 0 && group.imageCount === 0
        ? -8
        : 0;

  return Math.round(Math.min(Math.max(baseHeight + offset + contentBias, 144), 368));
};

const getResultKey = (item: SearchItem, index: number) => {
  if (item.type === 'image') {
    return `image-${item.feedId}-${item.placeId ?? 'none'}-${index}`;
  }
  if (item.type === 'video') {
    return `video-${item.storeId}-${item.placeId ?? 'none'}-${item.createdAt ?? 'none'}-${index}`;
  }
  return `place-${item.placeId}-${item.storeId ?? 'none'}-${index}`;
};

const getGroupKey = (item: SearchItem, index: number) => {
  if (item.placeId) {
    return `place:${item.placeId}`;
  }
  if ('storeId' in item && item.storeId) {
    return `store:${item.storeId}`;
  }

  const normalizedStoreName = normalizeGroupText(item.storeName);
  const normalizedAddress = normalizeGroupText(item.address);
  if (normalizedStoreName || normalizedAddress) {
    return `storeName:${normalizedStoreName}|${normalizedAddress}`;
  }

  return getResultKey(item, index);
};

const getThumbnailUri = (item: SearchItem) => {
  if (item.type === 'video') {
    return buildHomeVideoThumbUrl(item.thumbnail ?? null, item.createdAt ?? null) ?? '';
  }
  if (item.type === 'image') {
    return buildFeedImageUrl(item.thumbnail ?? null) ?? '';
  }
  return buildImageUrl(item.thumbnail ?? null) ?? '';
};

const getSearchItemTitle = (item: SearchItem) =>
  cleanSearchText((item as SearchItem & { title?: string | null }).title);

const getTypeAccent = (item: SearchItem) => {
  if (item.type === 'video') {
    return {
      label: '영상',
      icon: 'play-circle-outline' as const,
      color: '#2F80ED',
      backgroundColor: '#EAF3FF',
    };
  }
  if (item.type === 'image') {
    return {
      label: '이미지',
      icon: 'image-outline' as const,
      color: '#6B7684',
      backgroundColor: '#EEF2F6',
    };
  }
  return {
    label: '장소',
    icon: 'location-outline' as const,
    color: '#4E5968',
    backgroundColor: '#EEF2F6',
  };
};

const buildGroupBadgeLabels = (group: GroupedSearchResult) => {
  const labels: string[] = [];
  if (group.videoCount > 0) {
    labels.push(`영상 ${group.videoCount}`);
  }
  if (group.imageCount > 0) {
    labels.push(`이미지 ${group.imageCount}`);
  }
  if (labels.length === 0 && group.placeCount > 0) {
    labels.push('장소');
  }
  if (group.totalCount > 1) {
    labels.push(`결과 ${group.totalCount}`);
  }
  return labels;
};

const groupSearchResults = (items: SearchItem[]): GroupedSearchResult[] => {
  const groups = new Map<
    string,
    {
      items: SearchItem[];
      firstIndex: number;
    }
  >();

  items.forEach((item, index) => {
    const key = getGroupKey(item, index);
    const current = groups.get(key);
    if (current) {
      current.items.push(item);
      return;
    }
    groups.set(key, {
      items: [item],
      firstIndex: index,
    });
  });

  return Array.from(groups.entries())
    .sort((a, b) => a[1].firstIndex - b[1].firstIndex)
    .map(([groupKey, value]) => {
      const representative =
        value.items.find(
          (item) => item.type !== 'place' && Boolean(getThumbnailUri(item)),
        ) ??
        value.items.find((item) => item.type !== 'place') ??
        value.items.find((item) => Boolean(getThumbnailUri(item))) ??
        value.items[0];

      const fallbackPlace = value.items.find((item) => item.type === 'place');
      const titleName = value.items.map(getSearchItemTitle).find(Boolean);
      const storeName =
        titleName ??
        cleanSearchText(representative.storeName) ??
        fallbackPlace?.storeName ??
        value.items.map((item) => cleanSearchText(item.storeName)).find(Boolean) ??
        '이름 없는 장소';
      const address =
        representative.address ??
        fallbackPlace?.address ??
        value.items.find((item) => item.address)?.address ??
        null;
      const thumbnailSource =
        value.items.find((item) => Boolean(getThumbnailUri(item))) ?? representative;
      const thumbnailUri = getThumbnailUri(thumbnailSource);
      const videoCount = value.items.filter((item) => item.type === 'video').length;
      const imageCount = value.items.filter((item) => item.type === 'image').length;
      const placeCount = value.items.filter((item) => item.type === 'place').length;
      const distanceLabel = fallbackPlace ? formatDistance(fallbackPlace.distanceM) : null;

      return {
        groupKey,
        representative,
        items: value.items,
        storeName,
        address: formatCompactAddress(address),
        thumbnailUri,
        totalCount: value.items.length,
        videoCount,
        imageCount,
        placeCount,
        distanceLabel,
      };
    });
};

const FeedSearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { colors, spacing, radius } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, radius),
    [colors, spacing, radius],
  );

  const [query, setQuery] = useState(() => searchScreenCache.query);
  const [searchType, setSearchType] = useState<SearchType>(() => searchScreenCache.searchType);
  const [draftSearchType, setDraftSearchType] = useState<SearchType>(
    () => searchScreenCache.searchType,
  );
  const [filters, setFilters] = useState<SearchFilters>(() => searchScreenCache.filters);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(() => searchScreenCache.filters);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(() => searchScreenCache.results);
  const [total, setTotal] = useState(() => searchScreenCache.total);
  const [page, setPage] = useState(() => searchScreenCache.page);
  const [hasMore, setHasMore] = useState(() => searchScreenCache.hasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(() => searchScreenCache.errorMsg);
  const [aspectMap, setAspectMap] = useState<Record<string, number>>(
    () => searchScreenCache.aspectMap,
  );
  const [userLocation, setUserLocation] = useState<SearchCoordinate | null>(
    () => searchScreenCache.userLocation,
  );
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const requestSeqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(searchScreenCache.scrollOffset);
  const restoredFromCacheRef = useRef(
    Boolean(searchScreenCache.query.trim()) || searchScreenCache.results.length > 0,
  );
  const pendingScrollRestoreRef = useRef(searchScreenCache.scrollOffset > 0);

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const isMeaningfulQuery = useMemo(
    () => hasMeaningfulSearchTerm(trimmedQuery),
    [trimmedQuery],
  );
  const groupedResults = useMemo(() => groupSearchResults(results), [results]);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchType !== 'all') {
      count += 1;
    }
    if (filters.sort !== DEFAULT_SEARCH_FILTERS.sort) {
      count += 1;
    }
    if (filters.radius !== DEFAULT_SEARCH_FILTERS.radius) {
      count += 1;
    }
    return count;
  }, [filters, searchType]);
  const filterSummary = useMemo(() => {
    const labels: string[] = [];
    if (searchType === 'video') {
      labels.push('영상만');
    } else if (searchType === 'image') {
      labels.push('이미지만');
    }
    const extraSummary = buildFilterSummary(filters);
    if (extraSummary) {
      labels.push(extraSummary);
    }
    return labels.join(' · ');
  }, [filters, searchType]);
  const columnWidth = useMemo(() => {
    const horizontalPadding = spacing.lg * 2;
    return Math.floor((width - horizontalPadding - GRID_GAP) / 2);
  }, [spacing.lg, width]);

  const viewState: SearchViewState = useMemo(() => {
    if (!trimmedQuery || !isMeaningfulQuery) {
      return 'idle';
    }
    if (loading && results.length === 0) {
      return 'loading';
    }
    if (errorMsg && results.length === 0) {
      return 'error';
    }
    if (!loading && results.length === 0) {
      return 'empty';
    }
    return 'results';
  }, [errorMsg, isMeaningfulQuery, loading, results.length, trimmedQuery]);

  const resolveCurrentLocation = useCallback(async (): Promise<SearchCoordinate | null> => {
    setResolvingLocation(true);
    try {
      if (Platform.OS === 'android') {
        const nativePosition = await getAndroidCurrentPosition();
        if (nativePosition) {
          setUserLocation(nativePosition);
          return nativePosition;
        }
      }

      type GeoPosition = {
        coords: {
          latitude: number;
          longitude: number;
        };
      };

      type GeoError = {
        code?: number;
      };

      type GeolocationLike = {
        getCurrentPosition: (
          success: (position: GeoPosition) => void,
          error?: (error: GeoError) => void,
          options?: {
            enableHighAccuracy?: boolean;
            timeout?: number;
            maximumAge?: number;
          },
        ) => void;
      };

      const geo = (
        globalThis as {
          navigator?: { geolocation?: GeolocationLike };
        }
      ).navigator?.geolocation;
      if (!geo?.getCurrentPosition) {
        return null;
      }

      const position = await new Promise<SearchCoordinate | null>((resolve) => {
        geo.getCurrentPosition(
          (nextPosition) =>
            resolve({
              latitude: nextPosition.coords.latitude,
              longitude: nextPosition.coords.longitude,
            }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
        );
      });

      if (position) {
        setUserLocation(position);
      }
      return position;
    } finally {
      setResolvingLocation(false);
    }
  }, []);

  const runSearch = useCallback(
    async (keyword: string, nextPage: number, append: boolean) => {
      const requestId = requestSeqRef.current + 1;
      requestSeqRef.current = requestId;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setErrorMsg(null);
      }

      try {
        let resolvedLocation = userLocation;
        if (needsLocationForFilters(filters) && !resolvedLocation) {
          resolvedLocation = await resolveCurrentLocation();
          if (!resolvedLocation) {
            if (!append) {
              setErrorMsg('위치 권한을 확인한 뒤 다시 시도해 주세요.');
              setResults([]);
              setTotal(0);
              setHasMore(false);
            }
            return;
          }
        }

        const response = await fetchSearch({
          q: keyword,
          type: searchType,
          page: nextPage,
          size: PAGE_SIZE,
          sort: filters.sort,
          radius: filters.radius || undefined,
          lat: resolvedLocation?.latitude,
          lng: resolvedLocation?.longitude,
        });

        if (requestId !== requestSeqRef.current) {
          return;
        }

        const nextItems = response.items ?? [];
        const nextTotal =
          typeof response.total === 'number' ? response.total : nextItems.length;

        setTotal(nextTotal);
        setPage(nextPage);
        setResults((prev) => {
          const next = append ? [...prev, ...nextItems] : nextItems;
          setHasMore(next.length < nextTotal);
          return next;
        });
      } catch {
        if (requestId !== requestSeqRef.current) {
          return;
        }
        setErrorMsg('검색 결과를 불러오지 못했습니다.');
        if (!append) {
          setResults([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestSeqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, resolveCurrentLocation, searchType, userLocation],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!trimmedQuery || !isMeaningfulQuery) {
      requestSeqRef.current += 1;
      setResults([]);
      setTotal(0);
      setPage(0);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setErrorMsg(null);
      return;
    }

    if (restoredFromCacheRef.current) {
      restoredFromCacheRef.current = false;
      return;
    }

    debounceRef.current = setTimeout(() => {
      setPage(0);
      setHasMore(false);
      runSearch(trimmedQuery, 0, false);
    }, 220);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isMeaningfulQuery, runSearch, searchType, trimmedQuery]);

  useEffect(() => {
    searchScreenCache = {
      query,
      searchType,
      filters,
      results,
      total,
      page,
      hasMore,
      errorMsg,
      aspectMap,
      scrollOffset: scrollOffsetRef.current,
      userLocation,
    };
  }, [aspectMap, errorMsg, filters, hasMore, page, query, results, searchType, total, userLocation]);

  useEffect(() => {
    groupedResults.forEach((group) => {
      const cardKey = group.groupKey;
      const uri = group.thumbnailUri;

      if (!uri || aspectMap[cardKey]) {
        return;
      }

      Image.getSize(
        uri,
        (imageWidth, imageHeight) => {
          if (!imageWidth || !imageHeight) {
            return;
          }
          setAspectMap((prev) =>
            prev[cardKey]
              ? prev
              : {
                  ...prev,
                  [cardKey]: imageWidth / imageHeight,
                },
          );
        },
        () => {
          setAspectMap((prev) =>
            prev[cardKey]
              ? prev
              : {
                  ...prev,
                  [cardKey]: group.videoCount > 0 ? 16 / 9 : 1,
                },
          );
        },
      );
    });
  }, [aspectMap, groupedResults]);

  useEffect(() => {
    if (!pendingScrollRestoreRef.current || !scrollViewRef.current || viewState !== 'results') {
      return;
    }
    const nextOffset = searchScreenCache.scrollOffset;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
      pendingScrollRestoreRef.current = false;
    });
  }, [groupedResults.length, viewState]);

  const masonryColumns = useMemo(() => {
    const left: GridEntry[] = [];
    const right: GridEntry[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    groupedResults.forEach((group) => {
      const cardKey = group.groupKey;
      const thumbnailUri = group.thumbnailUri;
      const aspect = aspectMap[cardKey] ?? (group.videoCount > 0 ? 16 / 9 : 1);
      const mediaHeight = getEditorialMediaHeight({
        aspect,
        columnWidth,
        group,
      });
      const totalHeight = mediaHeight;
      const entry: GridEntry = {
        cardKey,
        group,
        thumbnailUri,
        mediaHeight,
        totalHeight,
      };

      if (leftHeight <= rightHeight) {
        left.push(entry);
        leftHeight += totalHeight + GRID_GAP;
      } else {
        right.push(entry);
        rightHeight += totalHeight + GRID_GAP;
      }
    });

    return { left, right };
  }, [aspectMap, columnWidth, groupedResults]);

  const handlePressGroup = useCallback(
    (group: GroupedSearchResult) => {
      const primaryItem =
        group.items.find((item) => item.type === 'video') ??
        group.items.find((item) => item.type === 'image') ??
        group.items.find((item) => item.type === 'place') ??
        group.representative;

      if (primaryItem.type === 'image') {
        navigation.navigate('ImageFeedViewer', { feedId: primaryItem.feedId });
        return;
      }

      if (primaryItem.type === 'video' && primaryItem.storeId && primaryItem.placeId) {
        navigation.navigate('VideoFeedScreen', {
          storeId: primaryItem.storeId,
          placeId: primaryItem.placeId,
        });
        return;
      }

      if (primaryItem.type === 'place') {
        navigation.navigate('FullScreenMap');
      }
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!trimmedQuery || loading || loadingMore || !hasMore) {
      return;
    }
    runSearch(trimmedQuery, page + 1, true);
  }, [hasMore, loading, loadingMore, page, runSearch, trimmedQuery]);

  const handleOpenFilters = useCallback(() => {
    setDraftSearchType(searchType);
    setDraftFilters(filters);
    setFilterModalVisible(true);
  }, [filters, searchType]);

  const handleResetFilters = useCallback(() => {
    setDraftSearchType('all');
    setDraftFilters(DEFAULT_SEARCH_FILTERS);
  }, []);

  const handleApplyFilters = useCallback(async () => {
    if (needsLocationForFilters(draftFilters) && !userLocation) {
      const nextLocation = await resolveCurrentLocation();
      if (!nextLocation) {
        Alert.alert(
          '위치가 필요해요',
          '가까운순이나 반경 필터를 쓰려면 위치 권한이 필요해요.',
        );
        return;
      }
    }

    setSearchType(draftSearchType);
    setFilters(draftFilters);
    setFilterModalVisible(false);
  }, [draftFilters, draftSearchType, resolveCurrentLocation, userLocation]);

  return (
    <AppLayout
      title=""
      showBack
      headerBorderless
      onPressBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('Home');
      }}
      showNotification={false}
      footer={<FooterTabBar />}
    >
      <View style={styles.screen}>
        <View style={styles.topArea}>
          <View style={styles.searchControlRow}>
            <View style={[styles.searchField, focused && styles.searchFieldFocused]}>
              <View style={[styles.searchIconWrap, focused && styles.searchIconWrapFocused]}>
                <Ionicons
                  name="search"
                  size={17}
                  color={focused ? '#2F80ED' : colors.textMuted}
                />
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                style={styles.input}
                placeholder="검색어를 입력하세요"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#2F80ED"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  style={styles.clearButton}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                >
                  <Ionicons name="close-circle" size={18} color="#9AA4B2" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={handleOpenFilters}
              style={[
                styles.modalFilterButton,
                activeFilterCount > 0 && styles.modalFilterButtonActive,
              ]}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="검색 필터 열기"
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={activeFilterCount > 0 ? '#191F28' : '#6B7684'}
              />
              <Text
                style={[
                  styles.modalFilterButtonText,
                  activeFilterCount > 0 && styles.modalFilterButtonTextActive,
                ]}
              >
                필터
              </Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
          {filterSummary ? (
            <Text style={styles.filterSummaryText}>{filterSummary}</Text>
          ) : null}
        </View>

        <View style={styles.contentArea}>
          {viewState === 'idle' ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  {trimmedQuery && !isMeaningfulQuery ? '검색어를 조금 더 입력해 주세요' : '검색'}
                </Text>
                <Text style={styles.stateText}>
                  {trimmedQuery && !isMeaningfulQuery
                    ? '가게명이나 음식명이 포함된 검색어를 입력하면 결과가 표시됩니다.'
                    : '가게명, 음식명, 피드 내용을 검색해 보세요.'}
                </Text>
              </View>
            </View>
          ) : viewState === 'loading' ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateCard}>
                <ActivityIndicator />
                <Text style={styles.stateText}>검색 중...</Text>
              </View>
            </View>
          ) : viewState === 'error' ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateCard}>
                <Text style={styles.errorText}>{errorMsg ?? '검색 결과를 불러오지 못했습니다.'}</Text>
              </View>
            </View>
          ) : viewState === 'empty' ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>검색 결과가 없습니다.</Text>
              </View>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.resultsScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                searchScreenCache = {
                  ...searchScreenCache,
                  scrollOffset: scrollOffsetRef.current,
                };
              }}
              scrollEventThrottle={16}
            >
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsHeaderTitle} numberOfLines={1}>
                  {trimmedQuery ? `${trimmedQuery} 결과` : '식당 결과'}
                </Text>
                <Text
                  style={styles.resultsHeaderCount}
                >{`${groupedResults.length}곳 · 결과 ${total}개`}</Text>
              </View>

              <View style={styles.masonryRow}>
                <View style={styles.column}>
                  {masonryColumns.left.map((entry) => (
                    <GridCard
                      key={entry.cardKey}
                      entry={entry}
                      styles={styles}
                      onPress={handlePressGroup}
                    />
                  ))}
                </View>
                <View style={styles.column}>
                  {masonryColumns.right.map((entry) => (
                    <GridCard
                      key={entry.cardKey}
                      entry={entry}
                      styles={styles}
                      onPress={handlePressGroup}
                    />
                  ))}
                </View>
              </View>

              {loadingMore ? (
                <View style={styles.footerState}>
                  <ActivityIndicator />
                  <Text style={styles.footerStateText}>더 불러오는 중...</Text>
                </View>
              ) : hasMore ? (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  style={styles.loadMoreButton}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="검색 결과 더 보기"
                >
                  <Text style={styles.loadMoreText}>더 보기</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.footerState}>
                  <Text style={styles.footerStateText}>여기까지 확인했어요.</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>검색 필터</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="필터 닫기"
              >
                <Ionicons name="close" size={18} color="#6B7684" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>콘텐츠</Text>
              <View style={styles.modalOptionRow}>
                {SEARCH_TYPE_OPTIONS.map((option) => {
                  const selected = draftSearchType === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setDraftSearchType(option.key)}
                      style={[
                        styles.modalOptionChip,
                        selected && styles.modalOptionChipSelected,
                      ]}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.label} 결과`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>정렬</Text>
              <View style={styles.modalOptionRow}>
                {SEARCH_SORT_OPTIONS.map((option) => {
                  const selected = draftFilters.sort === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          sort: option.key,
                        }))
                      }
                      style={[
                        styles.modalOptionChip,
                        selected && styles.modalOptionChipSelected,
                      ]}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.label} 정렬`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>반경</Text>
              <View style={styles.modalOptionRow}>
                {SEARCH_RADIUS_OPTIONS.map((option) => {
                  const selected = draftFilters.radius === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          radius: option.value,
                        }))
                      }
                      style={[
                        styles.modalOptionChip,
                        selected && styles.modalOptionChipSelected,
                      ]}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.label} 반경`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.modalHintText}>
                가까운순과 반경 필터는 현재 위치를 사용할 수 있을 때 적용됩니다.
              </Text>
              {resolvingLocation ? (
                <Text style={styles.modalStatusText}>현재 위치 확인 중...</Text>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleResetFilters}
                style={styles.modalSecondaryButton}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="필터 초기화"
              >
                <Text style={styles.modalSecondaryButtonText}>초기화</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApplyFilters}
                style={styles.modalPrimaryButton}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="필터 적용"
              >
                <Text style={styles.modalPrimaryButtonText}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
};

type GridCardProps = {
  entry: GridEntry;
  styles: ReturnType<typeof createStyles>;
  onPress: (group: GroupedSearchResult) => void;
};

const GridCard: React.FC<GridCardProps> = ({ entry, styles, onPress }) => {
  const { group, thumbnailUri, mediaHeight } = entry;
  const accent = getTypeAccent(group.representative);
  const overlayMeta = [group.distanceLabel, ...buildGroupBadgeLabels(group)].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => onPress(group)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${group.storeName} 결과`}
    >
      <View style={[styles.gridMedia, { height: mediaHeight }]}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.gridMediaImage} />
        ) : (
          <View style={styles.gridMediaFallback}>
            <Ionicons name={accent.icon} size={22} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.mediaScrim} pointerEvents="none" />
        <View style={styles.mediaInfoOverlay}>
          <Text style={styles.mediaTitle} numberOfLines={2}>
            {group.storeName}
          </Text>
          <Text style={styles.mediaSubtitle} numberOfLines={2}>
            {group.address ?? '주소 정보가 없습니다.'}
          </Text>
          {overlayMeta.length > 0 ? (
            <View style={styles.overlayPillsRow}>
              {overlayMeta.map((label) => (
                <View key={`${group.groupKey}-${label}`} style={styles.overlayPill}>
                  <Text style={styles.overlayPillText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default FeedSearchScreen;

const createStyles = (colors: ThemeColors, spacing: ThemeSpacing, radius: ThemeRadius) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    topArea: {
      paddingHorizontal: spacing.lg,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#EEF2F6',
    },
    searchControlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchField: {
      flex: 1,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 26,
      borderWidth: 1.5,
      borderColor: '#E5E8EB',
      backgroundColor: '#FFFFFF',
      shadowColor: '#0F172A',
      shadowOpacity: 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    searchFieldFocused: {
      borderColor: '#2F80ED',
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    searchIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F2F4F6',
    },
    searchIconWrapFocused: {
      backgroundColor: '#EAF3FF',
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      fontSize: 15,
      fontWeight: '600',
      color: '#191F28',
    },
    clearButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 12,
    },
    filterChip: {
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E5E8EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipSelected: {
      borderColor: '#191F28',
      backgroundColor: '#191F28',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7684',
    },
    filterChipTextSelected: {
      color: '#FFFFFF',
    },
    modalFilterButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: '#E5E8EB',
      backgroundColor: '#FFFFFF',
    },
    modalFilterButtonActive: {
      borderColor: '#D7E6FF',
      backgroundColor: '#F4F8FF',
    },
    modalFilterButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7684',
    },
    modalFilterButtonTextActive: {
      color: '#191F28',
    },
    filterCountBadge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#191F28',
    },
    filterCountBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    filterSummaryText: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: '#6B7684',
    },
    contentArea: {
      flex: 1,
      minHeight: 0,
      backgroundColor: '#FFFFFF',
    },
    stateWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      backgroundColor: '#FFFFFF',
    },
    stateCard: {
      minHeight: 140,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#EEF2F6',
      backgroundColor: '#FAFBFC',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 24,
    },
    stateTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#191F28',
    },
    stateText: {
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      color: '#6B7684',
    },
    errorText: {
      fontSize: 13,
      textAlign: 'center',
      color: '#B04343',
    },
    resultsScrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 168,
      backgroundColor: '#FFFFFF',
      gap: 12,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    resultsHeaderTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#191F28',
    },
    resultsHeaderCount: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7684',
    },
    masonryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: GRID_GAP,
    },
    column: {
      flex: 1,
    },
    gridCard: {
      marginBottom: GRID_GAP,
      shadowColor: '#0F172A',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 1,
    },
    gridMedia: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: '#DDE3EA',
    },
    gridMediaImage: {
      width: '100%',
      height: '100%',
    },
    gridMediaFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4E5968',
    },
    mediaScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 118,
      backgroundColor: 'rgba(15, 23, 42, 0.42)',
    },
    mediaInfoOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 11,
      paddingTop: 10,
      paddingBottom: 11,
      gap: 5,
    },
    mediaTitle: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      textShadowColor: 'rgba(15, 23, 42, 0.52)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    mediaSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255, 255, 255, 0.84)',
      textShadowColor: 'rgba(15, 23, 42, 0.52)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    overlayPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    overlayPill: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    overlayPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#191F28',
    },
    footerState: {
      paddingTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    footerStateText: {
      fontSize: 12,
      color: '#8B95A1',
    },
    loadMoreButton: {
      marginTop: 4,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg ?? 18,
      borderWidth: 1,
      borderColor: '#E9EDF2',
      backgroundColor: '#FFFFFF',
    },
    loadMoreText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4E5968',
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 23, 42, 0.22)',
    },
    modalBackdropDismiss: {
      flex: 1,
    },
    modalSheet: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: '#FFFFFF',
      gap: 18,
    },
    modalHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#D8DEE5',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#191F28',
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F6F8FA',
    },
    modalSection: {
      gap: 12,
    },
    modalSectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#191F28',
    },
    modalOptionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modalOptionChip: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E5E8EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOptionChipSelected: {
      borderColor: '#191F28',
      backgroundColor: '#191F28',
    },
    modalOptionText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7684',
    },
    modalOptionTextSelected: {
      color: '#FFFFFF',
    },
    modalHintText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#8B95A1',
    },
    modalStatusText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2F80ED',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    modalSecondaryButton: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg ?? 18,
      borderWidth: 1,
      borderColor: '#E5E8EB',
      backgroundColor: '#FFFFFF',
    },
    modalSecondaryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4E5968',
    },
    modalPrimaryButton: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg ?? 18,
      backgroundColor: '#191F28',
    },
    modalPrimaryButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
