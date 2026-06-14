import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import type { ListRenderItem } from 'react-native';
import type { ViewToken } from 'react-native';

import type { HomeContentFeedItem } from '../mockContentFeedData';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import HomeContentFeedImageCard from './HomeContentFeedImageCard';
import HomeContentFeedVideoCard from './HomeContentFeedVideoCard';

type Props = {
  items: HomeContentFeedItem[];
  header?: React.ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  loadingMore?: boolean;
  errorMsg?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  onRetry?: (() => void) | null;
  onRefresh?: (() => void) | null;
  onPressItem?: ((item: HomeContentFeedItem) => void) | null;
  onPressComment?: ((item: HomeContentFeedItem) => void) | null;
  onToggleLike?: (
    item: HomeContentFeedItem,
  ) => Promise<{
    likeCount?: number;
    commentCount?: number;
    likedByMe?: boolean;
  } | void> | void;
  onEndReached?: (() => void) | null;
  onViewableItemsChanged?: ((info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void);
};

const SKELETON_KEYS = ['skeleton-1', 'skeleton-2', 'skeleton-3'];

const StateCard: React.FC<{
  title: string;
  body: string;
  actionLabel?: string;
  onPressAction?: (() => void) | null;
}> = ({ title, body, actionLabel, onPressAction }) => (
  <View style={styles.stateCard}>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateBody}>{body}</Text>
    {actionLabel && onPressAction ? (
      <TouchableOpacity
        onPress={onPressAction}
        activeOpacity={0.88}
        style={styles.stateButton}
      >
        <Text style={styles.stateButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const SkeletonCard = memo(() => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonHeaderCopy}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineTiny} />
      </View>
      <View style={styles.skeletonTypeChip} />
    </View>
    <View style={styles.skeletonMedia} />
    <View style={styles.skeletonFooter}>
      <View style={styles.skeletonLineWide} />
      <View style={styles.skeletonLineMedium} />
      <View style={styles.skeletonMetaRow}>
        <View style={styles.skeletonMetaChip} />
        <View style={styles.skeletonMetaChip} />
        <View style={styles.skeletonMetaPill} />
      </View>
    </View>
  </View>
));

const FeedItemSeparator = memo(() => <View style={styles.itemSeparator} />);

const HomeContentFeedPreview: React.FC<Props> = ({
  items,
  header,
  loading = false,
  refreshing = false,
  loadingMore = false,
  errorMsg = null,
  emptyTitle = '아직 보여줄 컨텐츠가 없어요',
  emptyBody = '영상과 이미지가 쌓이면 이 탭은 하나의 세로 피드처럼 동작하게 됩니다.',
  onRetry = null,
  onRefresh = null,
  onPressItem = null,
  onPressComment = null,
  onToggleLike = null,
  onEndReached = null,
  onViewableItemsChanged,
}) => {
  const { width } = useWindowDimensions();
  const mediaWidth = width - 20;
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  });
  const [socialOverrides, setSocialOverrides] = useState<
    Record<
      string,
      {
        likeCount: number;
        commentCount: number;
        likedByMe?: boolean;
      }
    >
  >({});
  const [likePendingKeys, setLikePendingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSocialOverrides((prev) => {
      const next: Record<
        string,
        { likeCount: number; commentCount: number; likedByMe?: boolean }
      > = {};
      items.forEach((item) => {
        next[item.feedKey] = prev[item.feedKey] ?? item.stats;
      });
      return next;
    });
  }, [items]);

  const resolvedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        stats: socialOverrides[item.feedKey] ?? item.stats,
      })),
    [items, socialOverrides],
  );

  const handlePressLike = useCallback(
    async (item: HomeContentFeedItem) => {
      if (!onToggleLike || item.isMock) {
        return;
      }
      const current = socialOverrides[item.feedKey] ?? item.stats;
      const optimisticLiked = !current.likedByMe;
      const optimistic = {
        likeCount: Math.max(
          0,
          current.likeCount + (optimisticLiked ? 1 : -1),
        ),
        commentCount: current.commentCount,
        likedByMe: optimisticLiked,
      };

      setLikePendingKeys((prev) => ({ ...prev, [item.feedKey]: true }));
      setSocialOverrides((prev) => ({ ...prev, [item.feedKey]: optimistic }));

      try {
        const result = await onToggleLike(item);
        if (result) {
          setSocialOverrides((prev) => ({
            ...prev,
            [item.feedKey]: {
              likeCount:
                typeof result.likeCount === 'number'
                  ? result.likeCount
                  : optimistic.likeCount,
              commentCount:
                typeof result.commentCount === 'number'
                  ? result.commentCount
                  : optimistic.commentCount,
              likedByMe:
                typeof result.likedByMe === 'boolean'
                  ? result.likedByMe
                  : optimistic.likedByMe,
            },
          }));
        }
      } catch {
        setSocialOverrides((prev) => ({ ...prev, [item.feedKey]: current }));
      } finally {
        setLikePendingKeys((prev) => {
          const next = { ...prev };
          delete next[item.feedKey];
          return next;
        });
      }
    },
    [onToggleLike, socialOverrides],
  );

  const renderItem = useCallback<ListRenderItem<HomeContentFeedItem>>(
    ({ item }) =>
      item.contentType === 'VIDEO' ? (
        <HomeContentFeedVideoCard
          item={item}
          mediaWidth={mediaWidth}
          likePending={!!likePendingKeys[item.feedKey]}
          onPressLike={() => handlePressLike(item)}
          onPressComment={
            item.isMock || !onPressComment ? null : () => onPressComment(item)
          }
          onPressOpen={onPressItem ? () => onPressItem(item) : null}
        />
      ) : (
        <HomeContentFeedImageCard
          item={item}
          mediaWidth={mediaWidth}
          likePending={!!likePendingKeys[item.feedKey]}
          onPressLike={() => handlePressLike(item)}
          onPressComment={
            item.isMock || !onPressComment ? null : () => onPressComment(item)
          }
          onPressOpen={onPressItem ? () => onPressItem(item) : null}
        />
      ),
    [handlePressLike, likePendingKeys, mediaWidth, onPressComment, onPressItem],
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonList}>
          {SKELETON_KEYS.map((key) => (
            <SkeletonCard key={key} />
          ))}
        </View>
      );
    }

    if (errorMsg) {
      return (
        <StateCard
          title="컨텐츠 피드를 불러오지 못했어요"
          body={errorMsg}
          actionLabel={onRetry ? '다시 불러오기' : undefined}
          onPressAction={onRetry}
        />
      );
    }

    return (
        <StateCard
          title={emptyTitle}
          body={emptyBody}
        />
      );
  }, [emptyBody, emptyTitle, errorMsg, loading, onRetry]);

  const renderHeader = useCallback(
    () => (header ? <View style={styles.headerStack}>{header}</View> : null),
    [header],
  );

  const renderFooter = useCallback(
    () => (
      <>
        {loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={HOME_COLORS.textMuted} />
          </View>
        ) : null}
        <View style={styles.bottomSpacer} />
      </>
    ),
    [loadingMore],
  );

  return (
    <FlatList
      data={resolvedItems}
      keyExtractor={(item) => item.feedKey}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.contentContainer}
      ItemSeparatorComponent={FeedItemSeparator}
      showsVerticalScrollIndicator={false}
      bounces
      alwaysBounceVertical
      nestedScrollEnabled
      overScrollMode="always"
      removeClippedSubviews
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={HOME_COLORS.textMuted}
          />
        ) : undefined
      }
      onEndReached={onEndReached ?? undefined}
      onEndReachedThreshold={0.7}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfigRef.current}
    />
  );
};

export default memo(HomeContentFeedPreview);

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 28,
  },
  headerStack: {
    marginBottom: 18,
  },
  itemSeparator: {
    height: 18,
  },
  stateCard: {
    marginTop: 4,
    borderRadius: HOME_RADII.cardSmall,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: HOME_COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  stateBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: HOME_COLORS.textMuted,
  },
  stateButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.ink,
  },
  stateButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
  skeletonList: {
    gap: 18,
  },
  skeletonCard: {
    borderRadius: HOME_RADII.card,
    backgroundColor: HOME_COLORS.surface,
    overflow: 'hidden',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonHeaderCopy: {
    flex: 1,
    marginLeft: 10,
    gap: 6,
  },
  skeletonLineShort: {
    width: '40%',
    height: 12,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.skeletonLine,
  },
  skeletonLineTiny: {
    width: '28%',
    height: 10,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonTypeChip: {
    width: 44,
    height: 26,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonMedia: {
    height: 360,
    borderRadius: HOME_RADII.image,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonFooter: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 2,
  },
  skeletonLineWide: {
    width: '76%',
    height: 18,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.skeletonLine,
  },
  skeletonLineMedium: {
    width: '42%',
    height: 12,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.skeleton,
    marginTop: 8,
  },
  skeletonMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  skeletonMetaChip: {
    width: 52,
    height: 30,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.skeleton,
  },
  skeletonMetaPill: {
    marginLeft: 'auto',
    width: 94,
    height: 30,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.skeleton,
  },
  loadingMore: {
    paddingTop: 6,
    paddingBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 12,
  },
});
