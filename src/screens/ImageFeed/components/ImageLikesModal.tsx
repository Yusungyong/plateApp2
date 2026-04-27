// src/screens/ImageFeed/components/ImageLikesModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { fetchImageFeedLikedUsers, ImageFeedLikeUser } from '../../../api/imageFeedLikesApi';
import { buildProfileUri } from '../../../utils/profileImage';
import { useProfileNavigation } from '../../../hooks/useProfileNavigation';
import { formatDateTime } from '../../../utils/dateTime';

type Props = {
  visible: boolean;
  onClose: () => void;
  feedId?: number;
};

const PAGE_SIZE = 20;

const ImageLikesModal: React.FC<Props> = ({ visible, onClose, feedId }) => {
  const [users, setUsers] = useState<ImageFeedLikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { navigateToProfile } = useProfileNavigation();
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastAppendOffsetRef = useRef<number | null>(null);

  const loadUsers = useCallback(
    async (append = false, reset = false) => {
      if (!feedId) {
        setUsers([]);
        return;
      }
      if (append && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;

      if (reset) {
        offsetRef.current = 0;
        hasMoreRef.current = true;
        lastAppendOffsetRef.current = null;
        setHasMore(true);
      }

      const currentOffset = append ? offsetRef.current : 0;
      if (append && lastAppendOffsetRef.current === currentOffset) {
        return;
      }
      if (append) {
        lastAppendOffsetRef.current = currentOffset;
      }
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        loadingRef.current = true;
        setLoading(true);
      }

      try {
        const data = await fetchImageFeedLikedUsers(feedId, {
          limit: PAGE_SIZE,
          offset: currentOffset,
        });
        setUsers(prev => {
          if (!append) return data;
          const existingIds = new Set(prev.map(item => item.userId));
          const uniqueItems = data.filter(item => !existingIds.has(item.userId));
          if (uniqueItems.length === 0) {
            hasMoreRef.current = false;
            setHasMore(false);
            return prev;
          }
          return [...prev, ...uniqueItems];
        });
        offsetRef.current = currentOffset + data.length;
        const nextHasMore = data.length === PAGE_SIZE;
        if (nextHasMore) {
          hasMoreRef.current = true;
          setHasMore(true);
        }
        setError(null);
      } catch (e) {
        setError('좋아요한 사용자를 불러오지 못했어요.');
      } finally {
        if (append) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [feedId],
  );

  const handleRefresh = useCallback(async () => {
    if (!feedId) return;
    setRefreshing(true);
    try {
      await loadUsers(false, true);
    } finally {
      setRefreshing(false);
    }
  }, [feedId, loadUsers]);

  useEffect(() => {
    if (!visible) return;
    loadUsers(false, true);
  }, [visible, loadUsers]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    if (users.length < PAGE_SIZE) return;
    loadUsers(true);
  }, [hasMore, loading, loadingMore, refreshing, users.length, loadUsers]);

  const renderItem = useCallback(({ item }: { item: ImageFeedLikeUser }) => {
    const profileUri = buildProfileUri(item.username, item.profileImageUrl);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigateToProfile(item.username)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          <Image source={{ uri: profileUri }} style={styles.avatar} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.username} numberOfLines={1}>
            @{item.username}
          </Text>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname ?? '닉네임 없음'}
          </Text>
        </View>
        <View style={styles.metaText}>
          {item.activeRegion ? (
            <Text style={styles.region} numberOfLines={1}>
              {item.activeRegion}
            </Text>
          ) : null}
          {item.likedAt ? (
            <Text style={styles.time}>{formatDateTime(item.likedAt)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, [navigateToProfile]);

  const listEmptyComponent = useMemo(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>아직 좋아요한 사용자가 없어요.</Text>
      </View>
    );
  }, [loading, error]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>좋아요한 사용자</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color="#111" />
            </TouchableOpacity>
          </View>
          {loading && users.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item, index) => `${item.userId}_${index}`}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 32 }}
              ListEmptyComponent={listEmptyComponent}
              onEndReached={hasMore ? handleLoadMore : undefined}
              onEndReachedThreshold={0.5}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f2f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceef2',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  nickname: {
    marginTop: 2,
    color: '#6f7782',
    fontSize: 12,
  },
  metaText: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  region: {
    fontSize: 12,
    color: '#4b5563',
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: '#a0a4b0',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6f7782',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default ImageLikesModal;
