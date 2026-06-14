// src/screens/my/MyLikesScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FEED_IMAGE_BUCKET } from '../../config/buckets';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  fetchUserLikedVideos,
  fetchUserLikedImages,
  UserLikedVideo,
  UserLikedImage,
} from '../../api/userLikesApi';
import { formatDate } from '../../utils/dateTime';
import { useTheme } from '../../styles/theme';
import { buildVideoThumbnailUrl } from '../../utils/videoAsset';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type TabKey = 'video' | 'image';
const PAGE_SIZE = 10;
const buildUrl = (value?: string | null, baseUrl?: string) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return value;
  const base = baseUrl.replace(/\/+$/, '');
  const path = value.replace(/^\/+/, '');
  return `${base}/${path}`;
};

const buildVideoThumbUrl = (value?: string | null) =>
  buildVideoThumbnailUrl(value) ?? null;
const buildFeedImageUrl = (value?: string | null) =>
  buildUrl(value, FEED_IMAGE_BUCKET);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MyLikesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<TabKey>('video');
  const [videoLikes, setVideoLikes] = useState<UserLikedVideo[]>([]);
  const [imageLikes, setImageLikes] = useState<UserLikedImage[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingMoreVideo, setLoadingMoreVideo] = useState(false);
  const [loadingMoreImage, setLoadingMoreImage] = useState(false);
  const [videoOffset, setVideoOffset] = useState(0);
  const [imageOffset, setImageOffset] = useState(0);
  const [videoHasMore, setVideoHasMore] = useState(true);
  const [imageHasMore, setImageHasMore] = useState(true);
  const prevUsernameRef = useRef<string | undefined>(undefined);

  const loadVideoLikes = useCallback(
    async (append = false) => {
      if (!user?.username) return;
      if (append && (loadingVideo || loadingMoreVideo || !videoHasMore)) return;

      append ? setLoadingMoreVideo(true) : setLoadingVideo(true);
      const offset = append ? videoOffset : 0;
      try {
        const data = await fetchUserLikedVideos(user.username, { limit: PAGE_SIZE, offset });
        if (append) await sleep(1000);
        setVideoLikes((prev) => (append ? [...prev, ...data] : data));
        const nextOffset = offset + data.length;
        setVideoOffset(nextOffset);
        setVideoHasMore(data.length === PAGE_SIZE);
      } catch {
        } finally {
        append ? setLoadingMoreVideo(false) : setLoadingVideo(false);
      }
    },
    [user?.username, videoHasMore, loadingVideo, loadingMoreVideo, videoOffset],
  );

  const loadImageLikes = useCallback(
    async (append = false) => {
      if (!user?.username) return;
      if (append && (loadingImage || loadingMoreImage || !imageHasMore)) return;

      append ? setLoadingMoreImage(true) : setLoadingImage(true);
      const offset = append ? imageOffset : 0;
      try {
        const data = await fetchUserLikedImages(user.username, { limit: PAGE_SIZE, offset });
        if (append) await sleep(1000);
        setImageLikes((prev) => (append ? [...prev, ...data] : data));
        const nextOffset = offset + data.length;
        setImageOffset(nextOffset);
        setImageHasMore(data.length === PAGE_SIZE);
      } catch {
        } finally {
        append ? setLoadingMoreImage(false) : setLoadingImage(false);
      }
    },
    [user?.username, imageHasMore, loadingImage, loadingMoreImage, imageOffset],
  );

  useEffect(() => {
    if (!user?.username) {
      prevUsernameRef.current = undefined;
      return;
    }
    if (prevUsernameRef.current === user.username) return;
    prevUsernameRef.current = user.username;

    setVideoLikes([]);
    setImageLikes([]);
    setVideoOffset(0);
    setImageOffset(0);
    setVideoHasMore(true);
    setImageHasMore(true);

    loadVideoLikes();
    loadImageLikes();
  }, [user?.username, loadVideoLikes, loadImageLikes]);

  const renderVideoItem = ({ item }: { item: UserLikedVideo }) => {
    const thumbUrl = buildVideoThumbUrl(item.thumbnail);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('VideoFeedScreen', {
            storeId: item.storeId,
            placeId: item.placeId,
          })
        }
      >
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl, cache: 'force-cache' }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>썸네일 없음</Text>
          </View>
        )}
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.videoBadge]}>VIDEO</Text>
          <Text style={styles.badgeGhost}>{Math.round(item.videoDuration)}초</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? item.storeName ?? '제목 없음'}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.address ?? item.storeName ?? '위치 정보 없음'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary}>{item.storeName ?? '미등록 매장'}</Text>
          <Text style={styles.metaDate}>{formatDate(item.likedAt)}</Text>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  const renderImageItem = ({ item }: { item: UserLikedImage; index: number }) => {
    const thumbUrl = buildFeedImageUrl(item.thumbnail);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ImageFeedViewer', {
            feedId: item.feedId,
          })
        }
      >
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl, cache: 'force-cache' }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>이미지 없음</Text>
          </View>
        )}
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.imageBadge]}>IMAGE</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? item.storeName ?? '제목 없음'}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.storeName ?? '위치 정보 없음'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary}>{item.placeId}</Text>
          <Text style={styles.metaDate}>{formatDate(item.likedAt)}</Text>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout
      title="좋아요"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>내가 찜한 콘텐츠</Text>
        <Text style={styles.heroSubtitle}>
          마음에 들었던 동영상과 이미지들을 한 곳에서 다시 만나보세요.
        </Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'video' && styles.tabButtonActive]}
            onPress={() => setTab('video')}
          >
            <Text style={[styles.tabText, tab === 'video' && styles.tabTextActive]}>동영상</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'image' && styles.tabButtonActive]}
            onPress={() => setTab('image')}
          >
            <Text style={[styles.tabText, tab === 'image' && styles.tabTextActive]}>이미지</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'video' ? (
        <FlatList<UserLikedVideo>
          data={videoLikes}
          keyExtractor={(item, index) => `video_${item.storeId}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderVideoItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>아직 좋아요한 동영상이 없어요.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loadingVideo} onRefresh={() => loadVideoLikes(false)} />
          }
          onEndReached={() => loadVideoLikes(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreVideo ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : videoHasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadVideoLikes(true)}
              >
                <Text style={styles.loadMoreText}>더 보기</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <FlatList<UserLikedImage>
          data={imageLikes}
          keyExtractor={(item, index) => `image_${item.feedId}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderImageItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>아직 좋아요한 이미지가 없어요.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loadingImage} onRefresh={() => loadImageLikes(false)} />
          }
          onEndReached={() => loadImageLikes(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreImage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : imageHasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadImageLikes(true)}
              >
                <Text style={styles.loadMoreText}>더 보기</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </AppLayout>
  );
};

export default MyLikesScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: colors.backgroundSoft,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroSubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: colors.backgroundSoft,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.background,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.brandPrimary,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.borderDefault,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  badgeGhost: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSoft,
  },
  videoBadge: {
    backgroundColor: '#3c6ef0',
  },
  imageBadge: {
    backgroundColor: '#f35c86',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaPrimary: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metaDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emptyBox: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
  },
  });
