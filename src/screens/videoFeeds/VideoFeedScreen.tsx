// src/screens/VideoFeed/VideoFeedScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { useIsFocused } from '@react-navigation/native';

import { VideoFeedItem } from '../../api/videoFeedApi';
import { useAuth } from '../../auth/AuthProvider';
import VideoReelItem from './components/VideoReelItem';

import { useTwoPlayerVideoEngine } from './hooks/useTwoPlayerVideoEngine';
import { useVideoFeedData } from './hooks/useVideoFeedData';

import VideoUnderlay from './components/VideoUnderlay';
import VideoOverlayList from './components/VideoOverlayList';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FILE_BASE_URL = Config.VIDEO_BUCKET;

type VideoFeedScreenRouteParams = {
  username?: string;
  storeId: number;
  placeId: string;
};

type Props = {
  route: { params: VideoFeedScreenRouteParams };
  navigation: any;
};

const joinUrl = (base?: string, path?: string | null) => {
  if (!base || !path) return undefined;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

const buildUrl = (fileName?: string | null) => joinUrl(FILE_BASE_URL, fileName);

const VideoFeedScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const { storeId: initialStoreId, placeId: initialPlaceId } = route.params;
  const username = route.params.username ?? user?.username ?? '';

  const listRef = useRef<Animated.FlatList<VideoFeedItem> | null>(null);

  const safeScrollToIndex = useCallback((index: number) => {
    const ref = listRef.current;
    if (!ref) return;
    try {
      (ref as any).scrollToIndex({ index, animated: false });
    } catch (e) {
      console.warn('[VideoFeed] scrollToIndex threw', e);
    }
  }, []);

  const data = useVideoFeedData({ username, initialStoreId, initialPlaceId });

  const getPosterOf = useCallback((it?: VideoFeedItem) => {
    if (!it) return undefined;
    return it.thumbnail ? buildUrl(it.thumbnail) : buildUrl(it.fileName);
  }, []);

  const getVideoUriOf = useCallback((it?: VideoFeedItem) => {
    if (!it) return undefined;
    return buildUrl(it.fileName);
  }, []);

  const engine = useTwoPlayerVideoEngine<VideoFeedItem>({
    items: data.videos,
    screenHeight: SCREEN_HEIGHT,
    isFocused,
    getUri: getVideoUriOf,
    getPoster: getPosterOf,
    onIndexSettled: data.maybeTriggerLoadMore,
  });

  const keyExtractor = useCallback(
    (item: VideoFeedItem) => `${item.storeId}_${item.placeId}`,
    [],
  );

  const getItemLayout = useCallback(
    (_: VideoFeedItem[] | null | undefined, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      console.log('[VideoFeed] onScrollToIndexFailed', info);
      setTimeout(() => {
        const fallback = Math.max(0, info.highestMeasuredFrameIndex);
        safeScrollToIndex(fallback);
      }, 50);
    },
    [safeScrollToIndex],
  );

  const pendingInitialScrollRef = useRef(false);
  const pendingInitialIndexRef = useRef(0);
  const lastInitKeyRef = useRef<string | null>(null);

  const initKey = useMemo(
    () => `${username}_${initialStoreId}_${initialPlaceId}`,
    [username, initialStoreId, initialPlaceId],
  );

  useEffect(() => {
    if (lastInitKeyRef.current === initKey) return;
    lastInitKeyRef.current = initKey;

    pendingInitialScrollRef.current = false;
    pendingInitialIndexRef.current = 0;

    let mounted = true;
    (async () => {
      const result = await data.loadInitial();
      if (!mounted) return;

      pendingInitialIndexRef.current = result.startIndex;
      pendingInitialScrollRef.current = true;

      engine.primeForIndex(result.startIndex);
    })();

    return () => {
      mounted = false;
    };
  }, [initKey, data.loadInitial, engine.primeForIndex]);

  const onContentSizeChange = useCallback(() => {
    if (!pendingInitialScrollRef.current) return;
    if (data.videosRef.current.length === 0) return;

    pendingInitialScrollRef.current = false;

    const idx = Math.min(
      pendingInitialIndexRef.current,
      Math.max(0, data.videosRef.current.length - 1),
    );

    safeScrollToIndex(idx);

    const preloadIdx = idx + 1 < data.videosRef.current.length ? idx + 1 : -1;
    engine.configureAt(idx, preloadIdx);
  }, [data.videosRef, engine.configureAt, safeScrollToIndex]);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoFeedItem; index: number }) => {
      const isActive = index === engine.currentIndex;

      return (
        <View style={{ height: SCREEN_HEIGHT }}>
          <VideoReelItem
            item={item}
            isActive={isActive}
            paused={!isActive ? true : engine.paused}
            buffering={isActive ? engine.activeState.buffering : false}
            currentTime={isActive ? engine.activeState.time : 0}
            loadedDuration={isActive ? engine.activeState.duration : 0}
            errorMsg={isActive ? engine.activeState.error : null}
            onTogglePause={engine.togglePause}
            thumbnailOpacity={engine.getThumbnailOpacity(index)}
          />
        </View>
      );
    },
    [engine],
  );

  const headerTopPad = Platform.OS === 'ios' ? 54 : 18;
  const headerButtonSize = 40;
  const headerBottomPad = 8;

  const errorTop = headerTopPad + headerButtonSize + headerBottomPad;

  if (data.loading && data.videos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>동영상 불러오는 중…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <VideoUnderlay
        a={engine.aPlayer}
        b={engine.bPlayer}
        screenHeight={SCREEN_HEIGHT}
        globalPaused={engine.paused}
        enablePrebuffer
      />

      <VideoOverlayList<VideoFeedItem>
        data={data.videos}
        screenHeight={SCREEN_HEIGHT}
        onRef={ref => (listRef.current = ref)}
        renderItem={renderItem as any}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScroll={engine.onScroll}
        onMomentumScrollEnd={engine.onMomentumScrollEnd}
        onContentSizeChange={onContentSizeChange}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />

      <View style={[styles.header, { paddingTop: headerTopPad, paddingBottom: headerBottomPad }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {data.errorMsg && (
        <View style={[styles.errorBox, { top: errorTop }]}>
          <Text style={styles.errorText}>{data.errorMsg}</Text>
        </View>
      )}

      {data.loadingMore && (
        <View style={styles.moreLoadingBox}>
          <Text style={styles.moreLoadingText}>다음 영상 준비 중…</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: 'white', fontSize: 16 },

  errorBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 31,
    padding: 8,
    backgroundColor: 'rgba(255,0,0,0.2)',
  },
  errorText: { color: 'white', textAlign: 'center' },

  moreLoadingBox: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  moreLoadingText: { color: 'white', fontSize: 12 },
});

export default VideoFeedScreen;
