// src/screens/my/MyPostsScreen.tsx
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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FEED_IMAGE_BUCKET } from '../../config/buckets';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  fetchUserVideos,
  fetchUserImages,
  UserVideoItem,
  UserImageItem,
} from '../../api/userPostsApi';
import type { VideoFeedItem } from '../../api/videoFeedApi';
import { deleteImageFeed } from '../../api/imageFeedApi';
import { deleteVideoPost } from '../../api/videoFeedApi';
import { formatDate } from '../../utils/dateTime';
import { useTheme } from '../../styles/theme';
import FallbackImage from '../../components/common/FallbackImage';
import { buildVideoAssetUrl, buildVideoThumbnailUrl } from '../../utils/videoAsset';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MyPosts'>;
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
const buildDisplay = (
  title?: string | null,
  storeName?: string | null,
  address?: string | null,
) => {
  let trimmedTitle = title?.trim();
  const trimmedStore = storeName?.trim();
  const trimmedAddress = address?.trim();

  if (trimmedTitle && (trimmedTitle === trimmedStore || trimmedTitle === trimmedAddress)) {
    trimmedTitle = '';
  }

  if (trimmedTitle) {
    const subtitle =
      [trimmedStore, trimmedAddress].filter(Boolean).join(' · ') || '위치 정보 없음';
    return { title: trimmedTitle, subtitle };
  }

  if (trimmedStore) {
    return { title: trimmedStore, subtitle: trimmedAddress || '위치 정보 없음' };
  }

  if (trimmedAddress) {
    const parts = trimmedAddress.split(' ');
    const addressTitle = parts[0] ?? trimmedAddress;
    const addressSubtitle = parts.slice(1).join(' ').trim() || trimmedAddress;
    return { title: addressTitle, subtitle: addressSubtitle };
  }

  return { title: '제목 없음', subtitle: '위치 정보 없음' };
};
const buildVideoFileUrl = (value?: string | null, createdAt?: string | null) => {
  return buildVideoAssetUrl(value, createdAt) ?? null;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MyPostsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<TabKey>(route.params?.initialTab ?? 'video');
  const [videos, setVideos] = useState<UserVideoItem[]>([]);
  const [images, setImages] = useState<UserImageItem[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingMoreVideo, setLoadingMoreVideo] = useState(false);
  const [loadingMoreImage, setLoadingMoreImage] = useState(false);
  const [videoOffset, setVideoOffset] = useState(0);
  const [imageOffset, setImageOffset] = useState(0);
  const [videoHasMore, setVideoHasMore] = useState(true);
  const [imageHasMore, setImageHasMore] = useState(true);
  const prevUsernameRef = useRef<string | undefined>(undefined);

  const loadVideos = useCallback(
    async (append = false) => {
      if (!user?.username) return;
      if (append && (loadingVideo || loadingMoreVideo || !videoHasMore)) return;

      append ? setLoadingMoreVideo(true) : setLoadingVideo(true);
      const offset = append ? videoOffset : 0;
      try {
        const data = await fetchUserVideos(user.username, { limit: PAGE_SIZE, offset });
        if (append) await sleep(1000);
        setVideos((prev) => (append ? [...prev, ...data] : data));
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

  const loadImages = useCallback(
    async (append = false) => {
      if (!user?.username) return;
      if (append && (loadingImage || loadingMoreImage || !imageHasMore)) return;

      append ? setLoadingMoreImage(true) : setLoadingImage(true);
      const offset = append ? imageOffset : 0;
      try {
        const data = await fetchUserImages(user.username, { limit: PAGE_SIZE, offset });
        if (append) await sleep(1000);
        setImages((prev) => (append ? [...prev, ...data] : data));
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

    setVideos([]);
    setImages([]);
    setVideoOffset(0);
    setImageOffset(0);
    setVideoHasMore(true);
    setImageHasMore(true);

    loadVideos();
    loadImages();
  }, [user?.username, loadVideos, loadImages]);

  const handleDeleteVideo = useCallback(async (storeId: number) => {
    Alert.alert('삭제할까요?', '이 동영상을 삭제합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVideoPost(storeId);
            setVideos(prev => prev.filter(video => video.storeId !== storeId));
          } catch {
            }
        },
      },
    ]);
  }, []);

  const handleDeleteImage = useCallback(async (feedId: number) => {
    Alert.alert('삭제할까요?', '이 이미지 피드를 삭제합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteImageFeed(feedId);
            setImages(prev => prev.filter(image => image.feedId !== feedId));
          } catch {
            }
        },
      },
    ]);
  }, []);

  const handleVideoMenu = useCallback(
    (item: UserVideoItem) => {
      Alert.alert('동영상 관리', '원하는 작업을 선택하세요.', [
        {
          text: '수정',
          onPress: () =>
            navigation.navigate('VideoPostEditor', {
              storeId: item.storeId,
              initialStoreName: item.storeName ?? '',
              initialPlaceId: item.placeId ?? '',
              initialAddress: item.address ?? '',
              initialVideoUrl: buildVideoFileUrl(item.fileName, item.createdAt) ?? '',
            }),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => handleDeleteVideo(item.storeId),
        },
        { text: '취소', style: 'cancel' },
      ]);
    },
    [handleDeleteVideo, navigation],
  );

  const handleImageMenu = useCallback(
    (item: UserImageItem) => {
      Alert.alert('이미지 관리', '원하는 작업을 선택하세요.', [
        {
          text: '수정',
          onPress: () =>
            navigation.navigate('ImageFeedEditor', {
              feedId: item.feedId,
              initialStoreName: item.storeName ?? '',
              initialPlaceId: item.placeId ?? '',
            }),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => handleDeleteImage(item.feedId),
        },
        { text: '취소', style: 'cancel' },
      ]);
    },
    [handleDeleteImage, navigation],
  );

  const videoContextItems = React.useMemo<VideoFeedItem[]>(
    () =>
      videos.map((item) => ({
        storeId: item.storeId,
        placeId: item.placeId,
        title: item.title ?? null,
        storeName: item.storeName ?? null,
        address: item.address ?? null,
        fileName: item.fileName ?? null,
        thumbnail: item.thumbnail ?? null,
        videoDuration: item.videoDuration ?? null,
        username: user?.username ?? null,
        createdAt: item.createdAt ?? null,
      })),
    [videos, user?.username],
  );

  const renderVideoItem = ({ item, index }: { item: UserVideoItem; index: number }) => {
    const thumbUrl = buildVideoThumbUrl(item.thumbnail);
    const display = buildDisplay(item.title, item.storeName, item.address);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('VideoFeedScreen', {
            storeId: item.storeId,
            placeId: item.placeId,
            username: user?.username,
            context: 'myPosts',
            contextItems: videoContextItems,
            contextIndex: index,
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
          <Text style={styles.cardTitle} numberOfLines={1}>
            {display.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {display.subtitle}
          </Text>
          <View style={styles.cardMetaRow}>
            <Icon name="play" size={12} color="#a0a4b0" style={styles.cardMetaIcon} />
            <Text style={styles.cardMeta}>
              {Math.round(item.videoDuration)}초 · {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleVideoMenu(item)}
          hitSlop={8}
        >
          <Icon name="ellipsis-horizontal" size={18} color="#6f7782" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderImageItem = ({ item }: { item: UserImageItem; index: number }) => {
    const thumbUrl = buildFeedImageUrl(item.thumbnail);
    const display = buildDisplay(item.title, item.storeName, item.address);
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
          <FallbackImage
            uri={thumbUrl}
            style={styles.thumb}
            placeholderText="이미지 없음"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>이미지 없음</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {display.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {display.subtitle}
          </Text>
          <Text style={styles.cardMeta}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleImageMenu(item)}
          hitSlop={8}
        >
          <Icon name="ellipsis-horizontal" size={18} color="#6f7782" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout
      title="내 게시물"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
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

      {tab === 'video' ? (
        <FlatList<UserVideoItem>
          data={videos}
          keyExtractor={(item, index) => `video_${item.storeId}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderVideoItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>등록된 동영상 게시물이 없습니다.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loadingVideo} onRefresh={() => loadVideos(false)} />
          }
          onEndReached={() => loadVideos(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreVideo ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : videoHasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadVideos(true)}
              >
                <Text style={styles.loadMoreText}>더 보기</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <FlatList<UserImageItem>
          data={images}
          keyExtractor={(item, index) => `image_${item.feedId}_${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderImageItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>등록된 이미지 게시물이 없습니다.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loadingImage} onRefresh={() => loadImages(false)} />
          }
          onEndReached={() => loadImages(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreImage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : imageHasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadImages(true)}
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

export default MyPostsScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
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
    paddingTop: 16,
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
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
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
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  menuButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignSelf: 'flex-start',
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
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardMetaIcon: {
    alignSelf: 'center',
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  emptyBox: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
  },
  });
