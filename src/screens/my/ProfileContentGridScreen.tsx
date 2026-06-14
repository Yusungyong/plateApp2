// src/screens/my/ProfileContentGridScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FEED_IMAGE_BUCKET } from '../../config/buckets';

import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { useAuth } from '../../auth/AuthProvider';
import {
  fetchUserVideos,
  fetchUserImages,
  UserVideoItem,
  UserImageItem,
} from '../../api/userPostsApi';
import {
  fetchUserLikedVideos,
  fetchUserLikedImages,
  UserLikedVideo,
  UserLikedImage,
} from '../../api/userLikesApi';
import { buildVideoThumbnailUrl } from '../../utils/videoAsset';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProfileContentGrid'>;
type ContentGridItem = UserVideoItem | UserImageItem | UserLikedVideo | UserLikedImage;

type TabKey = 'video' | 'image';
const PAGE_SIZE = 24;
const buildUrl = (value?: string | null, baseUrl?: string) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return value;
  const base = baseUrl.replace(/\/+$/, '');
  const path = value.replace(/^\/+/, '');
  return `${base}/${path}`;
};

const buildVideoThumbUrl = (value?: string | null) => buildVideoThumbnailUrl(value) ?? null;
const buildFeedImageUrl = (value?: string | null) => buildUrl(value, FEED_IMAGE_BUCKET);

const extractItems = <T,>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload.items)) return payload.items as T[];
  if (payload.content && Array.isArray(payload.content)) return payload.content as T[];
  if (payload.data && Array.isArray(payload.data)) return payload.data as T[];
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items as T[];
  if (payload.data && Array.isArray(payload.data.content)) return payload.data.content as T[];
  return [];
};

const ProfileContentGridScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { type, title, username: targetUsername } = route.params;
  const { user } = useAuth();
  const username = targetUsername ?? user?.username ?? '';
  const [tab, setTab] = useState<TabKey>('video');
  const [items, setItems] = useState<ContentGridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerTitle = useMemo(() => {
    if (title) return title;
    if (type === 'video') return '동영상';
    if (type === 'image') return '이미지';
    return '좋아요';
  }, [title, type]);

  const handleOpenItem = useCallback(
    (item: ContentGridItem) => {
      const isImageItem = type === 'image' || (type === 'like' && tab === 'image');
      if (isImageItem && 'feedId' in item) {
        navigation.navigate('ImageFeedViewer', {
          feedId: item.feedId,
        });
        return;
      }

      if ('storeId' in item) {
        navigation.navigate('VideoFeedScreen', {
          storeId: item.storeId,
          placeId: item.placeId,
        });
      }
    },
    [navigation, tab, type],
  );

  const fetchItems = useCallback(
    async (nextOffset: number, append = false) => {
      if (!username) {
        setItems([]);
        setHasMore(false);
        return;
      }
      const setBusy = append ? setLoadingMore : setLoading;
      setBusy(true);
      setError(null);
      try {
        let response: any;
        if (type === 'video') {
          response = await fetchUserVideos(username, {
            limit: PAGE_SIZE,
            offset: nextOffset,
          });
        } else if (type === 'image') {
          response = await fetchUserImages(username, {
            limit: PAGE_SIZE,
            offset: nextOffset,
          });
        } else if (tab === 'video') {
          response = await fetchUserLikedVideos(username, {
            limit: PAGE_SIZE,
            offset: nextOffset,
          });
        } else {
          response = await fetchUserLikedImages(username, {
            limit: PAGE_SIZE,
            offset: nextOffset,
          });
        }
        const nextItems = extractItems<ContentGridItem>(response);
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setHasMore(nextItems.length >= PAGE_SIZE);
        setOffset(nextOffset + nextItems.length);
      } catch {
        setError('데이터를 불러오지 못했어요.');
      } finally {
        setBusy(false);
      }
    },
    [tab, type, username],
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
  }, [fetchItems]);

  return (
    <AppLayout
      title={headerTitle}
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <Text style={styles.metaTitle}>그리드 보기</Text>
          {type === 'like' ? (
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'video' && styles.tabButtonActive]}
                onPress={() => setTab('video')}
              >
                <Text style={[styles.tabText, tab === 'video' && styles.tabTextActive]}>
                  동영상
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, tab === 'image' && styles.tabButtonActive]}
                onPress={() => setTab('image')}
              >
                <Text style={[styles.tabText, tab === 'image' && styles.tabTextActive]}>
                  이미지
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.metaSubtitle}>총 {items.length}개</Text>
          )}
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.centerText}>불러오는 중…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchItems(0, false)}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>표시할 항목이 없습니다.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) => `${type}-${tab}-${index}`}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            onEndReached={() => {
              if (!loadingMore && hasMore) {
                fetchItems(offset, true);
              }
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => {
              const thumb =
                type === 'image' || (type === 'like' && tab === 'image')
                  ? buildFeedImageUrl((item as UserImageItem | UserLikedImage).thumbnail)
                  : buildVideoThumbUrl((item as UserVideoItem | UserLikedVideo).thumbnail);
              return (
                <TouchableOpacity
                  style={styles.tile}
                  activeOpacity={0.85}
                  onPress={() => handleOpenItem(item)}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb, cache: 'force-cache' }} style={styles.tileImage} />
                  ) : (
                    <View style={styles.tileInner}>
                      <Text style={styles.tileLabel}>{type.toUpperCase()}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </AppLayout>
  );
};

export default ProfileContentGridScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  metaSubtitle: {
    fontSize: 12,
    color: '#8a909b',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f7',
    borderRadius: 18,
    padding: 4,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    color: '#6f7782',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#111',
  },
  grid: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  tile: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#f4f6f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e3e6ec',
    overflow: 'hidden',
  },
  tileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6c7380',
    letterSpacing: 0.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  centerText: {
    marginTop: 10,
    color: '#6f7782',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dfe3ea',
  },
  retryText: {
    color: '#111',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 16,
  },
});
