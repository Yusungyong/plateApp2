// src/screens/notifications/NotificationScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';

import AppLayout from '../../components/layout/AppLayout';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useAuth } from '../../auth/AuthProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  Notification as ApiNotification,
  NotificationType,
} from '../../api/notificationsApi';
import { subscribeNotificationEvents } from '../../notifications/notificationEvents';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<NotificationType, string> = {
  LIKE: '좋아요',
  COMMENT: '댓글',
  REPLY: '답글',
  FOLLOW: '팔로우',
  MENTION: '멘션',
  SYSTEM: '공지',
};

const formatRelative = (iso: string) => {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return '방금 전';
  const diffMs = Date.now() - created;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
};

const NotificationScreen: React.FC = () => {
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const navigation = useNavigation();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.username) return;
    requireLogin({
      message: '알림은 로그인 후 확인할 수 있어요.',
      onCancel: () => navigation.goBack(),
    });
  }, [navigation, requireLogin, user?.username]);

  const loadNotifications = useCallback(
    async ({ offset = 0, append = false } = {}) => {
      if (!user?.username) return;
      if (append) {
        setLoadingMore(true);
      } else if (offset === 0) {
        setLoading(true);
      }

      try {
        const data = await fetchNotifications({ limit: PAGE_SIZE, offset });
        setItems((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length >= PAGE_SIZE);
        setError(null);
      } catch (e) {
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
      if (!user?.username) return;
      void loadNotifications({ offset: 0, append: false });
      const unsubscribe = subscribeNotificationEvents((event) => {
        if (event.type === 'message') {
          void loadNotifications({ offset: 0, append: false });
        }
      });
      return unsubscribe;
    }, [loadNotifications, user?.username]),
  );

  const onRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    void loadNotifications({ offset: 0, append: false });
  }, [loadNotifications, refreshing]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    void loadNotifications({ offset: items.length, append: true });
  }, [hasMore, items.length, loading, loadingMore, loadNotifications]);

  const getTitle = useCallback((item: ApiNotification) => {
    const trimmed = item.title?.trim();
    if (trimmed) return trimmed;
    return TYPE_LABELS[item.type] ?? '알림';
  }, []);

  const getMessage = useCallback((item: ApiNotification) => {
    const trimmed = item.message?.trim();
    if (trimmed) return trimmed;
    if (item.actorUsername) {
      return `${item.actorUsername}님이 새로운 활동을 했어요.`;
    }
    return '새로운 알림이 도착했어요.';
  }, []);

  const handlePress = useCallback((item: ApiNotification) => {
    if (item.isRead) return;
    setItems((prev) =>
      prev.map((entry) =>
        entry.notificationId === item.notificationId
          ? { ...entry, isRead: true }
          : entry,
      ),
    );
    void markAsRead(item.notificationId);
  }, []);

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (e) {
      Alert.alert('알림', '읽음 처리에 실패했어요.');
    }
  }, []);

  const handleDeleteAll = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert('알림 삭제', '모든 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAllNotifications();
            setItems([]);
            setHasMore(false);
          } catch (e) {
            Alert.alert('알림', '삭제에 실패했어요.');
          }
        },
      },
    ]);
  }, [items.length]);

  const renderItem = ({ item }: { item: ApiNotification }) => (
    <TouchableOpacity
      style={[styles.card, item.isRead && styles.cardRead]}
      onPress={() => handlePress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{getTitle(item)}</Text>
        <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {getMessage(item)}
      </Text>
      {!item.isRead ? <View style={styles.badge} /> : null}
    </TouchableOpacity>
  );

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyBox}>
          <ActivityIndicator />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>새로운 알림이 없어요.</Text>
      </View>
    );
  }, [error, loading, onRefresh]);

  const listHeader = useMemo(() => {
    if (items.length === 0) return null;
    return (
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>최근 알림</Text>
        <View style={styles.listHeaderActions}>
          <TouchableOpacity onPress={handleMarkAll} style={styles.listActionBtn}>
            <Text style={styles.listActionText}>전체 읽음</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAll} style={styles.listActionBtn}>
            <Text style={styles.listActionText}>전체 삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleDeleteAll, handleMarkAll, items.length]);

  return (
    <AppLayout
      title="알림"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => `${item.notificationId}`}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  listHeader: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1c3d',
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listActionBtn: {
    marginLeft: 12,
  },
  listActionText: {
    fontSize: 12,
    color: '#4c566a',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e9f0',
  },
  cardRead: {
    backgroundColor: '#f7f8fb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f1c3d',
  },
  time: {
    fontSize: 12,
    color: '#8a93a8',
  },
  message: {
    fontSize: 13,
    color: '#4c566a',
  },
  badge: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3b5bff',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#7c859c',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c4cada',
  },
  retryText: {
    color: '#4c566a',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLoading: {
    paddingVertical: 16,
  },
});
