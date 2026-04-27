// src/screens/recipe/RecipeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useTheme } from '../../styles/theme';
import { getUnreadCount } from '../../api/notificationsApi';
import { useAuth } from '../../auth/AuthProvider';
import { subscribeNotificationEvents } from '../../notifications/notificationEvents';
import {
  fetchRecipeCategories,
  fetchRecipes,
  RecipeCategory,
  RecipeListItem,
} from '../../api/recipeApi';
import type { RootStackParamList } from '../../navigation/MainNavigation';

const PAGE_SIZE = 20;

const RecipeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const requireLogin = useRequireLogin();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<'RECENT' | 'POPULAR'>('RECENT');

  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUnreadCount = useCallback(() => {
    if (!user?.username) {
      setUnreadCount(0);
      return;
    }
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    if (!isFocused) return;
    loadUnreadCount();
  }, [isFocused, loadUnreadCount]);

  useEffect(() => {
    if (!isFocused || !user?.username) return;
    const unsubscribe = subscribeNotificationEvents((event) => {
      if (event.type !== 'message') return;
      loadUnreadCount();
    });
    return unsubscribe;
  }, [isFocused, loadUnreadCount, user?.username]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetchRecipeCategories();
      setCategories(response);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadRecipes = useCallback(
    async ({ nextPage, append }: { nextPage: number; append: boolean }) => {
      if (append) {
        setLoadingMore(true);
      } else if (!refreshing) {
        setLoading(true);
      }
      try {
        const res = await fetchRecipes({
          categoryId: selectedCategoryId,
          sort,
          page: nextPage,
          size: PAGE_SIZE,
        });
        setTotal(res.total);
        setPage(nextPage);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        const nextCount = append ? items.length + res.items.length : res.items.length;
        setHasMore(nextCount < res.total);
        setError(null);
      } catch {
        setError('레시피를 불러오지 못했어요.');
        if (!append) {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [items.length, refreshing, selectedCategoryId, sort],
  );

  useEffect(() => {
    loadCategories().catch(() => {});
  }, [loadCategories]);

  useEffect(() => {
    loadRecipes({ nextPage: 0, append: false }).catch(() => {});
  }, [loadRecipes]);

  const onRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    loadRecipes({ nextPage: 0, append: false }).catch(() => {});
  }, [loadRecipes, refreshing]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadRecipes({ nextPage: page + 1, append: true }).catch(() => {});
  }, [hasMore, loadRecipes, loading, loadingMore, page]);

  const featuredItems = useMemo(() => items.slice(0, 4), [items]);

  const renderItem = ({ item }: { item: RecipeListItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {!!item.summary && (
          <Text style={styles.itemSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        )}
        <View style={styles.itemMetaRow}>
          {typeof item.cookTimeMin === 'number' && (
            <Text style={styles.itemMeta}>{item.cookTimeMin}분</Text>
          )}
          {!!item.difficulty && <Text style={styles.itemMeta}>{item.difficulty}</Text>}
          <Text style={styles.itemMeta}>좋아요 {item.likeCount ?? 0}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>레시피</Text>
        <Text style={styles.heroSubtitle}>카테고리별 인기 레시피를 확인해보세요.</Text>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>재료나 요리를 검색해보세요</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>카테고리</Text>
        <FlatList
          data={[{ id: -1, name: '전체' } as RecipeCategory, ...categories]}
          keyExtractor={(item) => `${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item }) => {
            const active =
              item.id === -1 ? selectedCategoryId === undefined : item.id === selectedCategoryId;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategoryId(item.id === -1 ? undefined : item.id)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>추천 레시피</Text>
          <View style={styles.sortTabs}>
            <TouchableOpacity
              style={[styles.sortChip, sort === 'RECENT' && styles.sortChipActive]}
              onPress={() => setSort('RECENT')}
            >
              <Text style={[styles.sortText, sort === 'RECENT' && styles.sortTextActive]}>최신순</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortChip, sort === 'POPULAR' && styles.sortChipActive]}
              onPress={() => setSort('POPULAR')}
            >
              <Text style={[styles.sortText, sort === 'POPULAR' && styles.sortTextActive]}>인기순</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          horizontal
          data={featuredItems}
          keyExtractor={(item) => `featured-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.featureTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.featureSummary} numberOfLines={2}>
                {item.summary ?? '설명이 없습니다.'}
              </Text>
              <View style={styles.featureMetaRow}>
                {typeof item.cookTimeMin === 'number' && (
                  <Text style={styles.featureMeta}>{item.cookTimeMin}분</Text>
                )}
                {!!item.difficulty && <Text style={styles.featureMeta}>{item.difficulty}</Text>}
              </View>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featureRow}
          ListEmptyComponent={
            loading ? null : <Text style={styles.emptySmall}>추천할 레시피가 없어요.</Text>
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>전체 레시피 ({total})</Text>
      </View>
    </View>
  );

  return (
    <AppLayout
      title="레시피"
      showBack={false}
      notificationCount={unreadCount}
      footer={<FooterTabBar />}
      onPressNotification={() => {
        if (!requireLogin({ message: '알림은 로그인 후 확인할 수 있어요.' })) return;
        navigation.navigate('Notification');
      }}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{error ?? '레시피가 없어요.'}</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </AppLayout>
  );
};

export default RecipeScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    content: {
      paddingBottom: 24,
    },
    hero: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      backgroundColor: colors.backgroundSoft,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
    },
    searchBar: {
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      gap: 8,
    },
    searchPlaceholder: {
      fontSize: 13,
      color: colors.textMuted,
    },
    section: {
      marginTop: 22,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    categoryRow: {
      marginTop: 8,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: colors.brandPrimary,
      borderColor: colors.brandPrimary,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: '#fff',
    },
    sortTabs: {
      flexDirection: 'row',
    },
    sortChip: {
      marginLeft: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    sortChipActive: {
      borderColor: colors.brandPrimary,
      backgroundColor: colors.backgroundSoft,
    },
    sortText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    sortTextActive: {
      color: colors.brandPrimary,
    },
    featureRow: {
      marginTop: 10,
      paddingBottom: 6,
    },
    featureCard: {
      width: 220,
      padding: 14,
      borderRadius: 14,
      marginRight: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    featureSummary: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
    },
    featureMetaRow: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 6,
    },
    featureMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.backgroundSoft,
    },
    emptySmall: {
      color: colors.textMuted,
      fontSize: 12,
      paddingVertical: 8,
    },
    itemCard: {
      marginHorizontal: 20,
      marginTop: 10,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      borderRadius: 12,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemLeft: {
      flex: 1,
      paddingRight: 8,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    itemSummary: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
    },
    itemMetaRow: {
      marginTop: 8,
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    itemMeta: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    emptyBox: {
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    footerLoading: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
