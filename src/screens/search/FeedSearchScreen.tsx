// src/screens/search/FeedSearchScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import { useTheme } from '../../styles/theme';
import { fetchSearch, type SearchItem } from '../../api/searchApi';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { useAuth } from '../../auth/AuthProvider';
import { buildHomeVideoThumbUrl } from '../home/utils/videoUtils';
import { buildFeedImageUrl } from '../../api/homeImageApi';
import { buildImageUrl } from '../home/utils/imageUtils';
import {
  clearRecentKeywords,
  loadRecentKeywords,
  removeRecentKeyword,
  saveRecentKeyword,
} from '../../utils/searchHistory';

const tabs = ['전체', '영상', '이미지'] as const;
const quickKeywords = ['#데이트', '#혼밥', '#가성비', '#뷰맛집', '#디저트', '#야식'];
const PAGE_SIZE = 20;
type SearchViewState = 'idle' | 'loading' | 'error' | 'empty' | 'results';

const getPlaceContentLabel = (contentType?: SearchItem extends infer T ? T extends { type: 'place' } ? T['contentType'] : never : never) => {
  if (contentType === 'BOTH') return '영상 + 이미지';
  if (contentType === 'IMAGE') return '이미지';
  return '영상';
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

const getTypePresentation = (item: SearchItem) => {
  if (item.type === 'video') {
    return {
      label: '영상',
      icon: 'play-circle-outline' as const,
      badgeBackground: 'rgba(255, 127, 80, 0.14)',
      badgeColor: '#FF7F50',
    };
  }
  if (item.type === 'image') {
    return {
      label: '이미지',
      icon: 'image-outline' as const,
      badgeBackground: 'rgba(63, 169, 245, 0.14)',
      badgeColor: '#3FA9F5',
    };
  }
  return {
    label: '장소',
    icon: 'location-outline' as const,
    badgeBackground: 'rgba(34, 197, 94, 0.14)',
    badgeColor: '#16A34A',
  };
};

const FeedSearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography],
  );
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('전체');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const totalRef = useRef(0);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [heroModalVisible, setHeroModalVisible] = useState(true);

  useEffect(() => {
    loadRecentKeywords()
      .then(setRecentKeywords)
      .catch(() => {});
  }, []);

  const searchType = useMemo(() => {
    if (activeTab === '영상') return 'video';
    if (activeTab === '이미지') return 'image';
    return 'all';
  }, [activeTab]);

  const runSearch = useCallback(
    async (keyword: string, nextPage: number, options: { append: boolean }) => {
      const requestId = requestSeqRef.current + 1;
      requestSeqRef.current = requestId;
      if (options.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setErrorMsg(null);
      }
      try {
        const res = await fetchSearch({
          q: keyword,
          type: searchType,
          page: nextPage,
          size: PAGE_SIZE,
        });
        if (requestId !== requestSeqRef.current) return;
        const items = res.items ?? [];
        const totalCount =
          typeof res.total === 'number'
            ? res.total
            : options.append
            ? totalRef.current
            : items.length;
        totalRef.current = totalCount;
        setTotal(totalCount);
        setPage(nextPage);
        setResults((prev) => {
          const next = options.append ? [...prev, ...items] : items;
          if (typeof res.total === 'number') {
            setHasMore(next.length < res.total);
          } else {
            setHasMore(items.length >= PAGE_SIZE);
          }
          return next;
        });
        if (!options.append) {
          setErrorMsg(null);
        }
      } catch {
        if (requestId !== requestSeqRef.current) return;
        setErrorMsg('검색 결과를 불러오는 데 실패했습니다.');
        if (!options.append) {
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
    [searchType],
  );

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setTotal(0);
      setPage(0);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setErrorMsg(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setPage(0);
      setHasMore(false);
      runSearch(keyword, 0, { append: false });
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, runSearch, searchType]);

  const handleClear = useCallback(() => setQuery(''), []);

  const getThumbnailUri = useCallback((item: SearchItem) => {
    if (item.type === 'video') {
      return buildHomeVideoThumbUrl(item.thumbnail ?? null, item.createdAt ?? null);
    }
    if (item.type === 'image') {
      return buildFeedImageUrl(item.thumbnail ?? null);
    }
    return buildImageUrl(item.thumbnail ?? null);
  }, []);

  const handlePressResult = useCallback((item: SearchItem) => {
    if (query.trim()) {
      saveRecentKeyword(query.trim()).then(setRecentKeywords).catch(() => {});
    }
    if (item.type === 'image' && 'feedId' in item) {
      navigation.navigate('ImageFeedViewer', { feedId: item.feedId });
      return;
    }
    if (item.type === 'video' && 'storeId' in item && item.storeId && item.placeId) {
      navigation.navigate('VideoFeedScreen', {
        storeId: item.storeId,
        placeId: item.placeId,
        username: user?.username ?? undefined,
      });
      return;
    }
    if (item.type === 'place') {
      navigation.navigate('FullScreenMap');
    }
  }, [navigation, query, user?.username]);

  const viewState: SearchViewState = useMemo(() => {
    if (!query.trim()) return 'idle';
    if (loading && results.length === 0) return 'loading';
    if (errorMsg && results.length === 0) return 'error';
    if (!loading && results.length === 0) return 'empty';
    return 'results';
  }, [errorMsg, loading, query, results.length]);

  const handleKeywordPress = useCallback((keyword: string) => {
    const cleaned = keyword.replace('#', '');
    setQuery(cleaned);
    saveRecentKeyword(cleaned).then(setRecentKeywords).catch(() => {});
  }, []);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    removeRecentKeyword(keyword)
      .then(setRecentKeywords)
      .catch(() => {});
  }, []);

  const handleSubmitEditing = useCallback(() => {
    const keyword = query.trim();
    if (!keyword) return;
    saveRecentKeyword(keyword).then(setRecentKeywords).catch(() => {});
  }, [query]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    const keyword = query.trim();
    if (!keyword) return;
    runSearch(keyword, page + 1, { append: true });
  }, [hasMore, loading, loadingMore, page, query, runSearch]);

  const resultLabel = useMemo(
    () => (query.length > 0 ? `'${query}' 결과` : '요즘 뜨는 피드'),
    [query],
  );
  const listData = viewState === 'results' ? results : [];

  const renderResultItem = useCallback(
    ({ item }: { item: SearchItem }) => {
      const thumbnailUri = getThumbnailUri(item);
      const typePresentation = getTypePresentation(item);
      const title =
        item.type === 'video'
          ? item.title || item.storeName || '제목 없는 영상'
          : item.type === 'image'
          ? item.storeName || '이미지 피드'
          : item.storeName || '가게명 없음';
      const infoChips =
        item.type === 'place'
          ? [
              `피드 ${item.feedCount ?? 0}`,
              getPlaceContentLabel(item.contentType),
              formatDistance(item.distanceM),
            ].filter(Boolean)
          : [item.type === 'video' ? '영상 피드' : '이미지 피드'];

      return (
        <TouchableOpacity
          key={
            item.type === 'image'
              ? `image-${item.feedId}`
              : item.type === 'video'
              ? `video-${item.storeId}`
              : `place-${item.placeId}`
          }
          style={styles.resultCard}
          onPress={() => handlePressResult(item)}
          activeOpacity={0.88}
        >
          <View style={styles.thumbFrame}>
            <View style={styles.thumb}>
              {thumbnailUri ? (
                <Image source={{ uri: thumbnailUri as string }} style={styles.thumbImage} />
              ) : (
                <View style={styles.thumbFallback}>
                  <Ionicons name={typePresentation.icon} size={22} color="#fff" />
                  <Text style={styles.thumbLabel}>{typePresentation.label}</Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: typePresentation.badgeBackground },
              ]}
            >
              <Ionicons
                name={typePresentation.icon}
                size={11}
                color={typePresentation.badgeColor}
              />
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: typePresentation.badgeColor },
                ]}
              >
                {typePresentation.label}
              </Text>
            </View>
          </View>

          <View style={styles.resultInfo}>
            <View style={styles.resultTitleRow}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {title}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
                style={styles.resultArrow}
              />
            </View>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.resultMeta} numberOfLines={2}>
                {item.address ?? '주소 정보 없음'}
              </Text>
            </View>

            <View style={styles.infoChipRow}>
              {infoChips.map((chip) => (
                <View key={`${title}-${chip}`} style={styles.infoChip}>
                  <Text style={styles.infoChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors.textMuted, getThumbnailUri, handlePressResult, styles],
  );

  return (
    <AppLayout title="검색" showBack={false} showNotification={false} footer={<FooterTabBar />}>
      <FlatList
        data={listData}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) =>
          item.type === 'image'
            ? `image-${item.feedId}`
            : item.type === 'video'
            ? `video-${item.storeId}`
            : `place-${item.placeId}`
        }
        renderItem={renderResultItem}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.searchPanel}>
              <SearchBar
                query={query}
                activeTab={activeTab}
                onChangeQuery={setQuery}
                onClear={handleClear}
                placeholderColor={colors.textMuted}
                onSubmitEditing={handleSubmitEditing}
                colors={colors}
                styles={styles}
              />

              <SearchTabs
                tabs={tabs}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                styles={styles}
              />
            </View>

            {viewState === 'idle' && (
              <SuggestionPanel
                quickKeywords={quickKeywords}
                recentKeywords={recentKeywords}
                onPressKeyword={handleKeywordPress}
                onClearRecent={() => {
                  clearRecentKeywords()
                    .then(() => setRecentKeywords([]))
                    .catch(() => {});
                }}
                onRemoveKeyword={handleRemoveKeyword}
                colors={colors}
                styles={styles}
              />
            )}

            {viewState !== 'idle' && (
              <View style={styles.sectionHeaderCard}>
                <View style={styles.sectionHeaderTextBox}>
                  <Text style={styles.sectionEyebrow}>RESULTS</Text>
                  <Text style={styles.sectionTitle}>{resultLabel}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {activeTab === '전체'
                      ? '장소, 영상, 이미지 결과를 함께 정렬했어요.'
                      : `${activeTab} 결과만 모아서 보여주고 있어요.`}
                  </Text>
                </View>
                <View style={styles.resultCountPill}>
                  <Text style={styles.resultCount}>{total}개</Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          viewState === 'loading' ? (
            <StateCard styles={styles} text="검색 중..." />
          ) : viewState === 'error' ? (
            <StateCard
              styles={styles}
              text={errorMsg ?? '검색 결과를 불러오는 데 실패했습니다.'}
              isError
            />
          ) : viewState === 'empty' ? (
            <EmptyState styles={styles} />
          ) : null
        }
        ListFooterComponent={
          viewState === 'results' ? (
            errorMsg ? (
              <View style={styles.inlineError}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : loadingMore ? (
              <View style={styles.loadMoreBox}>
                <ActivityIndicator />
                <Text style={styles.stateText}>더 불러오는 중...</Text>
              </View>
            ) : hasMore ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>더 보기</Text>
              </TouchableOpacity>
            ) : null
          ) : null
        }
        onEndReached={viewState === 'results' ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
      />
      <SearchHeroModal
        visible={heroModalVisible}
        query={query}
        activeTab={activeTab}
        total={total}
        recentCount={recentKeywords.length}
        viewState={viewState}
        onClose={() => setHeroModalVisible(false)}
        styles={styles}
      />
    </AppLayout>
  );
};

export default FeedSearchScreen;

type SearchBarProps = {
  query: string;
  activeTab: (typeof tabs)[number];
  onChangeQuery: (next: string) => void;
  onClear: () => void;
  placeholderColor: string;
  onSubmitEditing: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
};

const SearchBar: React.FC<SearchBarProps> = ({
  query,
  activeTab,
  onChangeQuery,
  onClear,
  placeholderColor,
  onSubmitEditing,
  colors,
  styles,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.searchBox, focused && styles.searchBoxFocused]}>
      <View style={[styles.searchIconBox, focused && styles.searchIconBoxFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={focused ? colors.brandPrimary : colors.textMuted}
        />
      </View>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={onChangeQuery}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        placeholder="피드, 가게, 지역을 검색해보세요"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.brandPrimary}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={16} color={placeholderColor} />
        </TouchableOpacity>
      )}
      <View style={styles.scopeBadge}>
        <Text style={styles.scopeBadgeText}>{activeTab}</Text>
      </View>
    </View>
  );
};

type SearchHeroProps = {
  query: string;
  activeTab: (typeof tabs)[number];
  total: number;
  recentCount: number;
  viewState: SearchViewState;
  styles: ReturnType<typeof createStyles>;
};

const SearchHero: React.FC<SearchHeroProps> = ({
  query,
  activeTab,
  total,
  recentCount,
  viewState,
  styles,
}) => {
  const keyword = query.trim();
  const title = keyword
    ? `'${keyword}'${activeTab === '전체' ? '' : ` · ${activeTab}`} 탐색 중`
    : '오늘 끌리는 맛집을\n빠르게 찾아보세요';
  const subtitle = keyword
    ? viewState === 'loading'
      ? '검색 범위를 좁혀가며 결과를 불러오고 있어요.'
      : viewState === 'error'
      ? '검색 연결이 흔들렸어요. 잠시 후 다시 시도해보세요.'
      : `${activeTab === '전체' ? '장소, 영상, 이미지' : activeTab} 기준으로 맛집 단서를 정리하고 있어요.`
    : '가게 이름, 동네, 분위기 키워드까지 한 화면에서 탐색할 수 있어요.';

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroOrbPrimary} />
      <View style={styles.heroOrbSecondary} />
      <View style={styles.heroTopRow}>
        <View style={styles.heroEyebrow}>
          <Ionicons name="sparkles-outline" size={12} color="#FF7F50" />
          <Text style={styles.heroEyebrowText}>PLATE SEARCH</Text>
        </View>
        <View style={styles.heroMiniPill}>
          <Text style={styles.heroMiniPillText}>
            {keyword ? `${total}개 후보` : `최근 ${recentCount}개`}
          </Text>
        </View>
      </View>

      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>

      <View style={styles.heroMetricsRow}>
        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricLabel}>탐색 범위</Text>
          <Text style={styles.heroMetricValue}>{activeTab}</Text>
        </View>
        <View style={styles.heroMetricDivider} />
        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricLabel}>추천 키워드</Text>
          <Text style={styles.heroMetricValue}>{quickKeywords.length}개</Text>
        </View>
        <View style={styles.heroMetricDivider} />
        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricLabel}>검색 기록</Text>
          <Text style={styles.heroMetricValue}>{recentCount}개</Text>
        </View>
      </View>
    </View>
  );
};

type SearchHeroModalProps = SearchHeroProps & {
  visible: boolean;
  onClose: () => void;
};

const SearchHeroModal: React.FC<SearchHeroModalProps> = ({
  visible,
  onClose,
  query,
  activeTab,
  total,
  recentCount,
  viewState,
  styles,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalRoot}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalCardShell}>
        <SearchHero
          query={query}
          activeTab={activeTab}
          total={total}
          recentCount={recentCount}
          viewState={viewState}
          styles={styles}
        />
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={onClose}
          activeOpacity={0.88}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalActionButton}
          onPress={onClose}
          activeOpacity={0.9}
        >
          <Text style={styles.modalActionButtonText}>검색 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

type SearchTabsProps = {
  tabs: typeof tabs;
  activeTab: (typeof tabs)[number];
  onChangeTab: (tab: (typeof tabs)[number]) => void;
  styles: ReturnType<typeof createStyles>;
};

const SearchTabs: React.FC<SearchTabsProps> = ({
  tabs: tabOptions,
  activeTab,
  onChangeTab,
  styles,
}) => (
  <View style={styles.tabRail}>
    <View style={styles.tabRow}>
      {tabOptions.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => onChangeTab(tab)}
            activeOpacity={0.88}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

type SuggestionPanelProps = {
  quickKeywords: string[];
  recentKeywords: string[];
  onPressKeyword: (keyword: string) => void;
  onClearRecent: () => void;
  onRemoveKeyword: (keyword: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
};

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  quickKeywords: suggestedQuickKeywords,
  recentKeywords,
  onPressKeyword,
  onClearRecent,
  onRemoveKeyword,
  colors,
  styles,
}) => (
  <>
    <View style={styles.panelCard}>
      <View style={styles.panelHeader}>
        <View style={styles.panelIconWrap}>
          <Ionicons name="flash-outline" size={16} color={colors.brandPrimary} />
        </View>
        <View style={styles.panelTitleBox}>
          <Text style={styles.panelEyebrow}>TREND PICK</Text>
          <Text style={styles.panelTitle}>추천 키워드</Text>
        </View>
      </View>
      <Text style={styles.panelDescription}>분위기나 상황 키워드로 바로 탐색해보세요.</Text>
      <View style={styles.chipRow}>
        {suggestedQuickKeywords.map((keyword) => (
          <TouchableOpacity
            key={keyword}
            style={styles.keywordChip}
            onPress={() => onPressKeyword(keyword)}
            activeOpacity={0.88}
          >
            <View style={styles.keywordDot} />
            <Text style={styles.keywordText}>{keyword}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.panelCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.panelHeader}>
          <View style={styles.panelIconWrap}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          </View>
          <View style={styles.panelTitleBox}>
            <Text style={styles.panelEyebrow}>HISTORY</Text>
            <Text style={styles.panelTitle}>최근 검색</Text>
          </View>
        </View>
        {recentKeywords.length > 0 && (
          <TouchableOpacity onPress={onClearRecent} style={styles.clearRecentButton}>
            <Text style={styles.clearRecentText}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.recentList}>
        {recentKeywords.length === 0 ? (
          <View style={styles.recentEmptyBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <Text style={styles.recentEmptyText}>최근 검색 기록이 없습니다.</Text>
          </View>
        ) : (
          recentKeywords.map((keyword) => (
            <View key={keyword} style={styles.recentItem}>
              <TouchableOpacity
                style={styles.recentMainButton}
                onPress={() => onPressKeyword(keyword)}
                activeOpacity={0.88}
              >
                <View style={styles.recentLeft}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.recentText}>{keyword}</Text>
                </View>
                <Ionicons name="arrow-up-outline" size={14} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRemoveKeyword(keyword)}
                style={styles.recentRemoveButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  </>
);

type StateCardProps = {
  styles: ReturnType<typeof createStyles>;
  text: string;
  isError?: boolean;
};

const StateCard: React.FC<StateCardProps> = ({ styles, text, isError }) => (
  <View style={styles.stateBox}>
    <View style={styles.stateIconWrap}>
      {isError ? (
        <Ionicons name="alert-circle-outline" size={20} color="#D14343" />
      ) : (
        <ActivityIndicator />
      )}
    </View>
    <Text style={isError ? styles.errorText : styles.stateText}>{text}</Text>
  </View>
);

const EmptyState: React.FC<{ styles: ReturnType<typeof createStyles> }> = ({ styles }) => (
  <View style={styles.emptyBox}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="search-outline" size={20} color="#FF7F50" />
    </View>
    <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
    <Text style={styles.emptyDesc}>다른 키워드로 다시 찾아보세요.</Text>
  </View>
);

const createStyles = ({
  colors,
  spacing,
  radius,
  typography,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  radius: ReturnType<typeof useTheme>['radius'];
  typography: ReturnType<typeof useTheme>['typography'];
}) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    headerStack: {
      gap: spacing.lg,
      marginBottom: spacing.sm,
    },
    heroCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 28,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    heroOrbPrimary: {
      position: 'absolute',
      width: 164,
      height: 164,
      borderRadius: 82,
      top: -40,
      right: -32,
      backgroundColor: 'rgba(255, 127, 80, 0.13)',
    },
    heroOrbSecondary: {
      position: 'absolute',
      width: 118,
      height: 118,
      borderRadius: 59,
      bottom: -34,
      left: -18,
      backgroundColor: 'rgba(255, 197, 164, 0.22)',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    heroEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignSelf: 'flex-start',
    },
    heroEyebrowText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    heroMiniPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    heroMiniPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    heroTitle: {
      marginTop: spacing.md,
      ...typography.h1,
      lineHeight: 32,
      color: colors.textPrimary,
    },
    heroSubtitle: {
      marginTop: spacing.sm,
      ...typography.body,
      lineHeight: 21,
      color: colors.textSecondary,
      maxWidth: '88%',
    },
    heroMetricsRow: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroMetric: {
      flex: 1,
      gap: 4,
    },
    heroMetricDivider: {
      width: 1,
      alignSelf: 'stretch',
      marginHorizontal: spacing.sm,
      backgroundColor: colors.divider,
    },
    heroMetricLabel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    heroMetricValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(17, 20, 28, 0.48)',
    },
    modalCardShell: {
      position: 'relative',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17, 20, 28, 0.58)',
    },
    modalActionButton: {
      marginTop: spacing.md,
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: 13,
      borderRadius: radius.pill,
      backgroundColor: colors.brandPrimary,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    modalActionButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    searchPanel: {
      padding: spacing.md,
      borderRadius: 24,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSoft,
      borderRadius: 18,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    searchBoxFocused: {
      borderColor: colors.brandPrimary,
      backgroundColor: colors.background,
    },
    searchIconBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    searchIconBoxFocused: {
      backgroundColor: 'rgba(255, 127, 80, 0.12)',
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: 15,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      paddingLeft: 6,
    },
    scopeBadge: {
      marginLeft: spacing.xs,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255, 127, 80, 0.12)',
    },
    scopeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.brandPrimary,
    },
    tabRail: {
      marginTop: spacing.md,
      padding: 4,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
    tabButtonActive: {
      backgroundColor: colors.background,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
    },
    panelCard: {
      padding: spacing.lg,
      borderRadius: 24,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      gap: spacing.md,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    panelIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
    },
    panelTitleBox: {
      gap: 2,
    },
    panelEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    panelTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    panelDescription: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    clearRecentButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
    },
    clearRecentText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    keywordChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    keywordDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.brandPrimary,
    },
    keywordText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.brandPrimary,
    },
    recentList: {
      gap: spacing.sm,
    },
    recentEmptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    recentEmptyText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    recentMainButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 16,
      backgroundColor: colors.backgroundSoft,
    },
    recentLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    recentText: {
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    recentRemoveButton: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
    },
    sectionHeaderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    sectionHeaderTextBox: {
      flex: 1,
    },
    sectionEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    resultCountPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    resultCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    resultCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      borderRadius: 22,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      shadowColor: colors.textPrimary,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 1,
    },
    thumbFrame: {
      position: 'relative',
    },
    thumb: {
      width: 84,
      height: 84,
      borderRadius: 18,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbFallback: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    typeBadge: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    thumbLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    resultInfo: {
      flex: 1,
      gap: 8,
      justifyContent: 'center',
    },
    resultTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    resultArrow: {
      marginTop: 2,
    },
    resultTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
    },
    resultMeta: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    infoChipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    infoChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundSoft,
    },
    infoChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    emptyBox: {
      paddingVertical: 30,
      alignItems: 'center',
      gap: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    emptyIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 127, 80, 0.12)',
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyDesc: {
      fontSize: 12,
      color: colors.textMuted,
    },
    stateBox: {
      paddingVertical: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    stateIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    stateText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    errorText: {
      fontSize: 13,
      color: '#b00020',
    },
    inlineError: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.backgroundSoft,
    },
    loadMoreBox: {
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    loadMoreButton: {
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.backgroundSoft,
    },
    loadMoreText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
