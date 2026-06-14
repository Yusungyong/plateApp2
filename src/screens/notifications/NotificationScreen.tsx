import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../components/layout/AppLayout';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  Notification as ApiNotification,
  NotificationType,
} from '../../api/notificationsApi';
import { fetchImageFeedViewer } from '../../api/imageFeedApi';
import { emitNotificationEvent, subscribeNotificationEvents } from '../../notifications/notificationEvents';
import { buildProfileUri } from '../../utils/profileImage';
import { formatTimeAgo } from '../../utils/dateTime';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<NotificationType, string> = {
  LIKE: '좋아요',
  COMMENT: '댓글',
  REPLY: '답글',
  FOLLOW: '친구 요청',
  MENTION: '언급',
  SYSTEM: '안내',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const mergeNotificationPages = (
  prev: ApiNotification[],
  next: ApiNotification[],
) => {
  const merged = new Map<number, ApiNotification>();
  prev.forEach((item) => {
    merged.set(item.notificationId, item);
  });
  next.forEach((item) => {
    merged.set(item.notificationId, item);
  });
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

const getTitle = (item: ApiNotification) => {
  const trimmed = item.title?.trim();
  if (trimmed && trimmed.toUpperCase() !== item.type) {
    return trimmed;
  }
  return TYPE_LABELS[item.type] ?? '알림';
};

const getMessage = (item: ApiNotification) => {
  const trimmed = item.message?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (item.actorUsername) {
    return `${item.actorUsername}님이 새로운 활동을 남겼어요.`;
  }
  return '새로운 알림이 도착했어요.';
};

type NotificationTarget =
  | { kind: 'friends' }
  | { kind: 'image'; feedId: number }
  | { kind: 'video'; storeId: number; placeId: string }
  | { kind: 'unknown'; reason: string };

const normalizeTargetType = (value?: string | null) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveNotificationTarget = (item: ApiNotification): NotificationTarget => {
  if (item.type === NotificationType.FOLLOW) {
    return { kind: 'friends' };
  }

  const data = (item.data ?? {}) as Record<string, unknown>;
  const normalizedTargetType = normalizeTargetType(
    item.targetType ?? asString(data.targetType),
  );

  if (
    normalizedTargetType === 'image' ||
    normalizedTargetType === 'image_feed' ||
    normalizedTargetType === 'imagefeed'
  ) {
    const feedId = asNumber(item.targetId) ?? asNumber(data.feedId);
    if (!feedId) {
      return { kind: 'unknown', reason: 'missing-image-feed-id' };
    }
    return { kind: 'image', feedId };
  }

  if (
    normalizedTargetType === 'video' ||
    normalizedTargetType === 'video_feed' ||
    normalizedTargetType === 'videofeed' ||
    normalizedTargetType === 'store'
  ) {
    const storeId = asNumber(data.storeId) ?? asNumber(item.targetId);
    const placeId = asString(data.placeId);
    if (!storeId || !placeId) {
      return { kind: 'unknown', reason: 'missing-video-target' };
    }
    return { kind: 'video', storeId, placeId };
  }

  return { kind: 'unknown', reason: 'unsupported-or-missing-target-type' };
};

const isOpenableTarget = (item: ApiNotification) =>
  resolveNotificationTarget(item).kind !== 'unknown';

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const requireLogin = useRequireLogin();
  const { user } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.username) {
      return;
    }
    requireLogin({
      message: '알림은 로그인 후 확인할 수 있어요.',
      onCancel: () => navigation.goBack(),
    });
  }, [navigation, requireLogin, user?.username]);

  const loadNotifications = useCallback(
    async ({ offset = 0, append = false }: { offset?: number; append?: boolean } = {}) => {
      if (!user?.username) {
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else if (offset === 0) {
        setLoading(true);
      }

      try {
        const nextItems = await fetchNotifications({ limit: PAGE_SIZE, offset });
        setItems((prev) => (append ? mergeNotificationPages(prev, nextItems) : nextItems));
        setHasMore(nextItems.length >= PAGE_SIZE);
        setError(null);
      } catch {
        setError('알림을 불러오지 못했어요.');
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
    [user?.username],
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.username) {
        return;
      }
      loadNotifications({ offset: 0, append: false }).catch(() => undefined);
      const unsubscribe = subscribeNotificationEvents((event) => {
        if (event.type !== 'message') {
          return;
        }
        loadNotifications({ offset: 0, append: false }).catch(() => undefined);
      });
      return unsubscribe;
    }, [loadNotifications, user?.username]),
  );

  const openImageTarget = useCallback(
    async (feedId: number) => {
      const detail = await fetchImageFeedViewer(feedId);
      if (!detail?.feedId) {
        return false;
      }
      navigation.navigate('ImageFeedViewer', { feedId: detail.feedId });
      return true;
    },
    [navigation],
  );

  const openVideoTarget = useCallback(
    async (storeId: number, placeId: string) => {
      navigation.navigate('VideoFeedScreen', {
        storeId,
        placeId,
      });
      return true;
    },
    [navigation],
  );

  const openNotificationTarget = useCallback(
    async (item: ApiNotification) => {
      const resolved = resolveNotificationTarget(item);

      if (resolved.kind === 'friends') {
        navigation.navigate('MyFriends', { initialTab: 'requests' });
        return true;
      }

      if (resolved.kind === 'image') {
        return openImageTarget(resolved.feedId);
      }

      if (resolved.kind === 'video') {
        return openVideoTarget(resolved.storeId, resolved.placeId);
      }

      return false;
    },
    [navigation, openImageTarget, openVideoTarget],
  );

  const getOpenFailureMessage = useCallback((item: ApiNotification) => {
    const resolved = resolveNotificationTarget(item);
    if (resolved.kind !== 'unknown') {
      return '대상 콘텐츠 정보를 아직 찾지 못했어요.';
    }
    if (resolved.reason === 'missing-video-target') {
      return '알림에 영상 위치 정보가 부족해서 아직 정확한 콘텐츠를 열 수 없어요.';
    }
    if (resolved.reason === 'missing-image-feed-id') {
      return '알림에 이미지 피드 정보가 부족해서 아직 정확한 콘텐츠를 열 수 없어요.';
    }
    return '알림 대상 정보가 아직 충분하지 않아 정확한 콘텐츠를 열 수 없어요.';
  }, []);

  const onRefresh = useCallback(() => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    loadNotifications({ offset: 0, append: false }).catch(() => undefined);
  }, [loadNotifications, refreshing]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    loadNotifications({ offset: items.length, append: true }).catch(() => undefined);
  }, [hasMore, items.length, loadNotifications, loading, loadingMore]);

  const markItemAsReadLocally = useCallback((notificationId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.notificationId === notificationId
          ? { ...item, isRead: true }
          : item,
      ),
    );
  }, []);

  const syncUnreadChange = useCallback(() => {
    emitNotificationEvent({ type: 'refresh' });
  }, []);

  const handlePress = useCallback(
    async (item: ApiNotification) => {
      if (openingId === item.notificationId) {
        return;
      }
      setOpeningId(item.notificationId);

      try {
        if (!item.isRead) {
          markItemAsReadLocally(item.notificationId);
          try {
            await markAsRead(item.notificationId);
            syncUnreadChange();
          } catch {
            // local state 유지
          }
        }

        const opened = await openNotificationTarget(item);
        if (!opened) {
          Alert.alert('열 수 없어요', getOpenFailureMessage(item));
        }
      } finally {
        setOpeningId(null);
      }
    },
    [getOpenFailureMessage, markItemAsReadLocally, openNotificationTarget, openingId, syncUnreadChange],
  );

  const handleDeleteOne = useCallback(
    async (notificationId: number) => {
      try {
        await deleteNotification(notificationId);
        setItems((prev) => prev.filter((item) => item.notificationId !== notificationId));
        syncUnreadChange();
      } catch {
        Alert.alert('알림', '삭제에 실패했어요.');
      }
    },
    [syncUnreadChange],
  );

  const handleLongPress = useCallback(
    (item: ApiNotification) => {
      const actions: Array<{
        text: string;
        style?: 'default' | 'cancel' | 'destructive';
        onPress?: () => void;
      }> = [];

      if (!item.isRead) {
        actions.push({
          text: '읽음 처리',
          onPress: () => {
            markItemAsReadLocally(item.notificationId);
            (async () => {
              try {
                await markAsRead(item.notificationId);
                syncUnreadChange();
              } catch {
                Alert.alert('알림', '읽음 처리에 실패했어요.');
              }
            })().catch(() => undefined);
          },
        });
      }

      actions.push(
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            handleDeleteOne(item.notificationId).catch(() => undefined);
          },
        },
        { text: '닫기', style: 'cancel' },
      );

      Alert.alert(getTitle(item), '이 알림으로 무엇을 할까요?', [
        ...actions,
      ]);
    },
    [handleDeleteOne, markItemAsReadLocally, syncUnreadChange],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      syncUnreadChange();
    } catch {
      Alert.alert('알림', '전체 읽음 처리에 실패했어요.');
    }
  }, [syncUnreadChange]);

  const handleDeleteAll = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    Alert.alert('모든 알림 삭제', '알림 목록을 모두 비울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAllNotifications();
            setItems([]);
            setHasMore(false);
            syncUnreadChange();
          } catch {
            Alert.alert('알림', '전체 삭제에 실패했어요.');
          }
        },
      },
    ]);
  }, [items.length, syncUnreadChange]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiNotification }) => {
      const avatarUri = buildProfileUri(
        item.actorUsername ?? undefined,
        item.actorProfileImageUrl ?? null,
      );
      const busy = openingId === item.notificationId;
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            handlePress(item).catch(() => undefined);
          }}
          onLongPress={() => handleLongPress(item)}
          style={[styles.card, item.isRead && styles.cardRead]}
        >
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardLabelRow}>
                <View
                  style={[
                    styles.typeChip,
                    item.isRead ? styles.typeChipRead : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      item.isRead ? styles.typeChipTextRead : null,
                    ]}
                  >
                    {TYPE_LABELS[item.type] ?? '알림'}
                  </Text>
                </View>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.title}>{getTitle(item)}</Text>
            <Text style={styles.message}>{getMessage(item)}</Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.actor} numberOfLines={1}>
                {item.actorUsername?.trim() || 'plate'}
              </Text>
              {isOpenableTarget(item) ? (
                <Text style={styles.metaHint}>대상 콘텐츠 보기</Text>
              ) : null}
            </View>
          </View>
          {busy ? (
            <View style={styles.busyWrap}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [handleLongPress, handlePress, openingId],
  );

  const listHeader = useMemo(() => {
    if (items.length === 0) {
      return null;
    }
    return (
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listEyebrow}>Notification</Text>
          <Text style={styles.listHeaderTitle}>
            읽지 않은 알림 {unreadCount}개
          </Text>
        </View>
        <View style={styles.listHeaderActions}>
          <TouchableOpacity
            onPress={() => {
              handleMarkAll().catch(() => undefined);
            }}
            style={styles.headerActionButton}
          >
            <Text style={styles.headerActionText}>전체 읽음</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAll}
            style={styles.headerActionButton}
          >
            <Text style={styles.headerActionText}>전체 삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleDeleteAll, handleMarkAll, items.length, unreadCount]);

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>알림을 불러오지 못했어요.</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>새로운 알림이 없어요.</Text>
        <Text style={styles.stateDescription}>
          댓글, 좋아요, 친구 요청이 오면 여기에 표시됩니다.
        </Text>
      </View>
    );
  }, [error, loading, onRefresh]);

  return (
    <AppLayout
      title="알림"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.notificationId}`}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 ? styles.listContentEmpty : null,
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
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

export default NotificationScreen;

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
  },
  listContentEmpty: {
    justifyContent: 'center',
  },
  listHeader: {
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  listEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  card: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  cardRead: {
    backgroundColor: '#f8fafc',
    borderColor: '#edf2f7',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eef2f7',
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  typeChipRead: {
    backgroundColor: '#f1f5f9',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  typeChipTextRead: {
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  actor: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  metaHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  busyWrap: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stateDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  footerLoading: {
    paddingVertical: 16,
  },
});
