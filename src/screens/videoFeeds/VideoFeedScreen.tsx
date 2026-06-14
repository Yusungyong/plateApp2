// src/screens/VideoFeed/VideoFeedScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
  FlatList,
  type ViewToken,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  VideoFeedItem,
  deleteVideoPost,
  fetchVideoFeedSocialMeta,
} from '../../api/videoFeedApi';
import { useAuth } from '../../auth/AuthProvider';
import { getDeviceInfo } from '../../auth/deviceInfo';
import VideoReelItem from './components/VideoReelItem';

import { useVideoFeedData } from './hooks/useVideoFeedData';
import type { EnginePlayerState } from './hooks/useSinglePlayerVideoEngine';
import VideoFriendActivityPanel from './components/VideoFriendActivityPanel';
import { fetchStoreFriendActivity, type StoreFriendActivityItem } from '../../api/friendVisitApi';
import {
  startWatchSession,
  updateWatchProgress,
  completeWatchSession,
} from '../../api/videoWatchApi';
import { buildVideoAssetUrl, buildVideoThumbnailUrl } from '../../utils/videoAsset';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROGRESS_INTERVAL_MS = 10000;
const PROGRESS_MIN_GAP_MS = 8000;
const PROGRESS_MIN_DELTA_SEC = 2;

const buildCommentTargetKey = (storeId: number, placeId: string) =>
  `${storeId}:${placeId}`;

type VideoFeedScreenRouteParams = {
  storeId: number;
  placeId: string;
  openComments?: boolean;
  context?: 'myPosts';
  contextItems?: VideoFeedItem[];
  contextIndex?: number;
};

type Props = {
  route: { params: VideoFeedScreenRouteParams };
  navigation: any;
};

const initialPlaybackState: EnginePlayerState = {
  ready: false,
  buffering: true,
  duration: 0,
  time: 0,
  error: null,
  naturalSize: undefined,
};

const VideoFeedScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const { storeId: initialStoreId, placeId: initialPlaceId } = route.params;
  const initialOpenComments = route.params.openComments === true;
  const authRequestKey = user?.username ?? 'guest';
  const contextItems = route.params.contextItems;
  const contextIndex = route.params.contextIndex;
  const limitToContext = route.params.context === 'myPosts';

  const listRef = useRef<FlatList<VideoFeedItem> | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const resolvedRouteStartIndex = useMemo(() => {
    if (!contextItems?.length) {
      return 0;
    }
    if (typeof contextIndex === 'number' && Number.isFinite(contextIndex)) {
      return Math.max(0, Math.min(contextIndex, contextItems.length - 1));
    }
    const foundIndex = contextItems.findIndex(
      item => item.storeId === initialStoreId && item.placeId === initialPlaceId,
    );
    return foundIndex >= 0 ? foundIndex : 0;
  }, [contextIndex, contextItems, initialPlaceId, initialStoreId]);
  const [activeIndex, setActiveIndex] = useState(resolvedRouteStartIndex);
  const activeIndexRef = useRef(0);
  const [pausedUser, setPausedUser] = useState(false);
  const [activeState, setActiveState] = useState<EnginePlayerState>(initialPlaybackState);
  const [commentOpenRequest, setCommentOpenRequest] = useState<{
    signal: number;
    targetKey: string | null;
  }>({
    signal: 0,
    targetKey: null,
  });
  const transitionStartRef = useRef<{ index: number; storeId: number; at: number } | null>(null);
  const initialCommentOpenedRef = useRef(false);
  const [friendActivity, setFriendActivity] = useState<StoreFriendActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const lastFriendStoreIdRef = useRef<number | null>(null);
  const lastFriendRequestAtRef = useRef(0);
  const socialMetaLoadingRef = useRef(new Set<number>());
  const allowHydrateRealignRef = useRef(false);

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef(new Map<number, { lastAt: number; lastPos: number }>());
  const lastPlaybackRef = useRef<{ storeId: number | null; time: number; duration: number }>({
    storeId: null,
    time: 0,
    duration: 0,
  });
  const prevStoreIdRef = useRef<number | null>(null);
  const sessionByStoreRef = useRef(new Map<number, string>());
  const completedByStoreRef = useRef(new Set<number>());
  const startInFlightRef = useRef(new Set<number>());
  const deviceInfoRef = useRef<string | null>(null);

  const safeScrollToIndex = useCallback((index: number) => {
    const ref = listRef.current;
    if (!ref) return;
    try {
      (ref as any).scrollToIndex({ index, animated: false });
    } catch {}
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (isFocused) setPausedUser(false);
  }, [isFocused]);

  const {
    videos,
    videosRef,
    loading,
    loadingMore,
    errorMsg,
    loadInitial,
    maybeTriggerLoadMore,
    setVideos,
  } = useVideoFeedData({
    initialStoreId,
    initialPlaceId,
    seedItems: contextItems,
    seedIndex: contextIndex,
    disableLoadMore: limitToContext,
    onHydrated: ({ startIndex }) => {
      if (!allowHydrateRealignRef.current) {
        return;
      }
      allowHydrateRealignRef.current = false;
      pendingHydratedIndexRef.current = startIndex;
      setActiveIndex(startIndex);
      setActiveState(initialPlaybackState);
    },
  });

  useEffect(() => {
    maybeTriggerLoadMore(activeIndex);
  }, [activeIndex, maybeTriggerLoadMore]);

  const getPosterOf = useCallback((it?: VideoFeedItem) => {
    if (!it) return undefined;
    const thumbnail = it.thumbnail ? buildVideoThumbnailUrl(it.thumbnail, it.createdAt) : undefined;
    return thumbnail ?? buildVideoAssetUrl(it.fileName, it.createdAt);
  }, []);

  const getVideoUriOf = useCallback((it?: VideoFeedItem) => {
    if (!it) return undefined;
    return buildVideoAssetUrl(it.fileName, it.createdAt);
  }, []);

  useEffect(() => {
    if (videos.length === 0) {
      return;
    }
    if (activeIndex < videos.length) {
      return;
    }
    const nextIndex = Math.max(0, videos.length - 1);
    setActiveIndex(nextIndex);
    setActiveState(initialPlaybackState);
  }, [activeIndex, videos.length]);

  useEffect(() => {
    if (!initialOpenComments || initialCommentOpenedRef.current) {
      return;
    }
    const activeItem = videos[activeIndex];
    if (!activeItem) {
      return;
    }
    if (
      activeItem.storeId !== initialStoreId ||
      activeItem.placeId !== initialPlaceId
    ) {
      return;
    }
    initialCommentOpenedRef.current = true;
    setCommentOpenRequest(prev => ({
      signal: prev.signal + 1,
      targetKey: buildCommentTargetKey(activeItem.storeId, activeItem.placeId),
    }));
  }, [activeIndex, initialOpenComments, initialPlaceId, initialStoreId, videos]);

  const prefetchPoster = useCallback(
    (it?: VideoFeedItem) => {
      const uri = getPosterOf(it);
      if (!uri) return;
      Image.prefetch(uri).catch(() => undefined);
    },
    [getPosterOf],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 90,
    minimumViewTime: 80,
    waitForInteraction: true,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<VideoFeedItem>> }) => {
      const next = viewableItems.find(item => item.isViewable && item.index != null);
      if (next?.index == null) return;
      if (next.index === activeIndexRef.current) return;
      setActiveIndex(next.index);
      setActiveState(initialPlaybackState);
      setPausedUser(false);
    },
  ).current;

  const keyExtractor = useCallback((item: VideoFeedItem) => {
    const slug = item.fileName || item.thumbnail || item.title || 'video';
    return `${item.placeId}_${item.storeId}_${slug}`;
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<VideoFeedItem> | null | undefined, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      setTimeout(() => {
        const fallback = Math.max(0, info.highestMeasuredFrameIndex);
        safeScrollToIndex(fallback);
      }, 50);
    },
    [safeScrollToIndex],
  );

  const pendingInitialScrollRef = useRef(false);
  const pendingInitialIndexRef = useRef(0);
  const pendingHydratedIndexRef = useRef<number | null>(null);
  const lastInitKeyRef = useRef<string | null>(null);

  const initKey = useMemo(
    () => `${authRequestKey}_${initialStoreId}_${initialPlaceId}`,
    [authRequestKey, initialStoreId, initialPlaceId],
  );
  const effectKey = `${initKey}_${reloadCount}`;

  useEffect(() => {
    if (lastInitKeyRef.current === effectKey) return;
    lastInitKeyRef.current = effectKey;

    allowHydrateRealignRef.current = Boolean(contextItems?.length);
    pendingInitialScrollRef.current = Boolean(contextItems?.length);
    pendingInitialIndexRef.current = resolvedRouteStartIndex;
    pendingHydratedIndexRef.current = null;
    setActiveIndex(resolvedRouteStartIndex);
    setActiveState(initialPlaybackState);

    let mounted = true;
    (async () => {
      const result = await loadInitial();
      if (!mounted) return;

      pendingInitialIndexRef.current = result.startIndex;
      pendingInitialScrollRef.current = true;
      setActiveIndex(result.startIndex);
      setActiveState(initialPlaybackState);
    })();

    return () => {
      mounted = false;
    };
  }, [contextItems?.length, effectKey, loadInitial, resolvedRouteStartIndex]);

  const handleUserScrollBegin = useCallback(() => {
    allowHydrateRealignRef.current = false;
    pendingHydratedIndexRef.current = null;
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (pendingHydratedIndexRef.current != null && videosRef.current.length > 0) {
      const idx = Math.min(
        pendingHydratedIndexRef.current,
        Math.max(0, videosRef.current.length - 1),
      );
      pendingHydratedIndexRef.current = null;
      safeScrollToIndex(idx);
      return;
    }

    if (!pendingInitialScrollRef.current) return;
    if (videosRef.current.length === 0) return;

    pendingInitialScrollRef.current = false;

    const idx = Math.min(
      pendingInitialIndexRef.current,
      Math.max(0, videosRef.current.length - 1),
    );

    safeScrollToIndex(idx);
    setActiveIndex(idx);
    setActiveState(initialPlaybackState);
  }, [safeScrollToIndex, videosRef]);

  const baseTopPad = Platform.OS === 'ios' ? 54 : 18;
  const headerTopPad = Math.max(baseTopPad, insets.top + 12);
  const headerButtonSize = 40;
  const headerBottomPad = 8;
  const errorTop = headerTopPad + headerButtonSize + headerBottomPad;
  const initialScrollIndex = useMemo(() => {
    if (videos.length === 0) {
      return 0;
    }
    return Math.min(resolvedRouteStartIndex, Math.max(0, videos.length - 1));
  }, [resolvedRouteStartIndex, videos.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoFeedItem; index: number }) => {
      const isActive = index === activeIndex;
      const state = isActive
        ? activeState
        : { buffering: false, ready: false, error: null };
      const isOwner = Boolean(user?.username && item.username === user.username);
      const posterUri = getPosterOf(item);
      const videoUri = getVideoUriOf(item);
      const thumbnailOpacity = isActive && state.ready && !state.buffering ? 0 : 1;
      const isPaused = !isFocused || pausedUser || !isActive;
      const shouldPreload = Math.abs(index - activeIndex) === 1;
      const itemCommentTargetKey = buildCommentTargetKey(item.storeId, item.placeId);
      const shouldOpenCommentsForItem =
        isActive && commentOpenRequest.targetKey === itemCommentTargetKey;

      return (
        <View style={{ height: SCREEN_HEIGHT }}>
          <VideoReelItem
            item={item}
            isActive={isActive}
            commentOpenSignal={shouldOpenCommentsForItem ? commentOpenRequest.signal : 0}
            onConsumeCommentOpen={
              shouldOpenCommentsForItem
                ? () =>
                    setCommentOpenRequest(prev => ({
                      ...prev,
                      targetKey: null,
                    }))
                : undefined
            }
            paused={isPaused}
            preload={shouldPreload}
            videoUri={videoUri}
            posterUri={posterUri}
            buffering={state.buffering}
            ready={state.ready}
            errorMsg={state.error ?? null}
            playTime={isActive ? activeState.time : 0}
            thumbnailOpacity={thumbnailOpacity}
            onTogglePause={() => setPausedUser(p => !p)}
            onLoadStart={() => {
              if (!isActive) return;
              transitionStartRef.current = { index, storeId: item.storeId, at: Date.now() };
              setActiveState(prev => ({ ...prev, buffering: true, error: null }));
            }}
            onLoad={(meta) => {
              if (!isActive) return;
              const width = Number(meta.naturalSize?.width ?? 0);
              const height = Number(meta.naturalSize?.height ?? 0);
              const orientation = meta.naturalSize?.orientation as
                | 'landscape'
                | 'portrait'
                | undefined;
              setActiveState(prev => ({
                ...prev,
                duration: meta.duration || 0,
                buffering: false,
                ready: true,
                error: null,
                naturalSize: { width, height, orientation },
              }));
            }}
            onProgress={(progress) => {
              if (!isActive) return;
              setActiveState(prev => ({
                ...prev,
                time: progress.currentTime,
                buffering: false,
                ready: true,
              }));
            }}
            onBuffer={(meta) => {
              if (!isActive) return;
              setActiveState(prev => ({ ...prev, buffering: meta.isBuffering }));
            }}
            onReadyForDisplay={() => {
              if (!isActive) return;
              setActiveState(prev => ({ ...prev, ready: true, buffering: false, error: null }));
            }}
            onError={() => {
              if (!isActive) return;
              setActiveState(prev => ({
                ...prev,
                buffering: false,
                error: '영상을 불러오지 못했어요.',
              }));
            }}
            canDelete={isOwner}
            onEdit={() => {
              if (!isOwner) return;
              navigation.navigate('VideoPostEditor', {
                storeId: item.storeId,
                initialTitle: item.title ?? undefined,
                initialStoreName: item.storeName ?? undefined,
                initialPlaceId: item.placeId ?? undefined,
                initialVideoUrl: getVideoUriOf(item) ?? undefined,
                initialAddress: item.address ?? undefined,
              });
            }}
            onDelete={async (storeId) => {
              try {
                await deleteVideoPost(storeId);
                let nextLength = 0;
                setVideos(prev => {
                  const next = prev.filter(v => v.storeId !== storeId);
                  nextLength = next.length;
                  return next;
                });
                requestAnimationFrame(() => {
                  if (nextLength === 0) {
                    navigation.goBack();
                    return;
                  }
                  const nextIndex = Math.min(activeIndexRef.current, nextLength - 1);
                  setActiveIndex(nextIndex);
                  safeScrollToIndex(nextIndex);
                });
              } catch {}
            }}
            safeTopInset={insets.top}
            safeBottomInset={insets.bottom}
          />
        </View>
      );
    },
    [
      activeIndex,
      activeState,
      getPosterOf,
      getVideoUriOf,
      insets.bottom,
      insets.top,
      isFocused,
      commentOpenRequest,
      navigation,
      pausedUser,
      safeScrollToIndex,
      setVideos,
      user?.username,
    ],
  );

  const handleRetryInitial = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const loadFriendActivity = useCallback(
    async (storeId: number | undefined) => {
      if (!user?.username || !storeId) {
        setFriendActivity([]);
        return;
      }
      if (activityLoading) return;
      if (lastFriendStoreIdRef.current === storeId) return;
      const now = Date.now();
      if (now - lastFriendRequestAtRef.current < 10000) return;
      try {
        setActivityLoading(true);
        lastFriendStoreIdRef.current = storeId;
        lastFriendRequestAtRef.current = now;
        const res = await fetchStoreFriendActivity({
          username: user.username,
          storeId,
          limit: 5,
        });
        setFriendActivity(res ?? []);
      } catch {
        setFriendActivity([]);
      } finally {
        setActivityLoading(false);
      }
    },
    [activityLoading, user?.username],
  );

  useEffect(() => {
    const current = videos[activeIndex];
    loadFriendActivity(current?.storeId);
    prefetchPoster(current);
    prefetchPoster(videos[activeIndex + 1]);
    prefetchPoster(videos[activeIndex - 1]);
  }, [activeIndex, loadFriendActivity, prefetchPoster, videos]);

  useEffect(() => {
    const current = videos[activeIndex];
    if (!user?.username || !current?.storeId) {
      return;
    }

    const needsSocialMeta =
      current.likeCount == null || current.commentCount == null || current.likedByMe == null;
    if (!needsSocialMeta) {
      return;
    }
    if (socialMetaLoadingRef.current.has(current.storeId)) {
      return;
    }

    socialMetaLoadingRef.current.add(current.storeId);
    fetchVideoFeedSocialMeta(current.storeId)
      .then((meta) => {
        setVideos((prev) =>
          prev.map((video) =>
            video.storeId !== current.storeId
              ? video
              : {
                  ...video,
                  likeCount: meta.likeCount,
                  commentCount: meta.commentCount,
                  likedByMe: meta.isLiked,
                },
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        socialMetaLoadingRef.current.delete(current.storeId);
      });
  }, [activeIndex, setVideos, user?.username, videos]);

  const activeItem = videos[activeIndex];
  const activeStoreId = activeItem?.storeId;
  const activeTime = activeState.time || 0;
  const activeDuration = activeState.duration || 0;
  const activeSize = activeState.naturalSize;

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const getVideoQuality = useCallback(() => {
    const height = activeSize?.height ?? 0;
    if (!height) return undefined;
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    return '360p';
  }, [activeSize?.height]);

  useEffect(() => {
    const loadDeviceInfo = async () => {
      const info = await getDeviceInfo();
      deviceInfoRef.current = JSON.stringify(info);
    };
    loadDeviceInfo().catch(() => {});
  }, []);

  const ensureSessionForStore = useCallback(
    async (storeId: number, timeSec: number, durationSec: number) => {
      if (!user?.username) return null;
      if (sessionByStoreRef.current.has(storeId)) {
        return sessionByStoreRef.current.get(storeId) ?? null;
      }
      if (startInFlightRef.current.has(storeId)) return null;
      if (!durationSec || durationSec <= 0) return null;
      if (timeSec / durationSec < 0.3) return null;

      startInFlightRef.current.add(storeId);
      try {
        const payload = {
          deviceInfo: deviceInfoRef.current,
          videoQuality: getVideoQuality(),
        };
        const res = await startWatchSession(storeId, payload);
        if (res?.sessionId) {
          sessionByStoreRef.current.set(storeId, res.sessionId);
          completedByStoreRef.current.delete(storeId);
          return res.sessionId;
        }
      } catch {
      } finally {
        startInFlightRef.current.delete(storeId);
      }
      return null;
    },
    [getVideoQuality, user?.username],
  );

  const updateProgressForStore = useCallback(
    async (storeId: number, timeSec: number, durationSec: number, force = false) => {
      if (!user?.username) return;
      if (storeId == null) return;
      const sessionId =
        sessionByStoreRef.current.get(storeId) ??
        (await ensureSessionForStore(storeId, timeSec, durationSec));
      if (!sessionId) return;

      const now = Date.now();
      const currentTime = Math.floor(timeSec);
      if (!Number.isFinite(currentTime)) return;
      if (!force && currentTime <= 0) return;

      const last = lastSavedRef.current.get(storeId);
      if (!force && last) {
        if (now - last.lastAt < PROGRESS_MIN_GAP_MS) return;
        if (Math.abs(currentTime - last.lastPos) < PROGRESS_MIN_DELTA_SEC) return;
      }

      lastSavedRef.current.set(storeId, {
        lastAt: now,
        lastPos: currentTime,
      });

      try {
        await updateWatchProgress(storeId, {
          sessionId,
          durationWatched: currentTime,
          videoQuality: getVideoQuality(),
        });
      } catch {}
    },
    [ensureSessionForStore, getVideoQuality, user?.username],
  );

  useEffect(() => {
    if (activeStoreId == null) return;
    lastPlaybackRef.current = {
      storeId: activeStoreId,
      time: activeTime,
      duration: activeDuration,
    };
  }, [activeDuration, activeStoreId, activeTime]);

  useEffect(() => {
    const prev = prevStoreIdRef.current;
    if (prev != null && prev !== activeStoreId) {
      const snapshot = lastPlaybackRef.current;
      updateProgressForStore(prev, snapshot.time, snapshot.duration, true).catch(() => {});
    }
    prevStoreIdRef.current = activeStoreId ?? null;
  }, [activeStoreId, updateProgressForStore]);

  useEffect(() => {
    if (!user?.username) return;
    if (!activeStoreId && activeStoreId !== 0) {
      clearProgressTimer();
      return;
    }

    const activePaused = !isFocused || pausedUser;
    if (activePaused) {
      clearProgressTimer();
      const snapshot = lastPlaybackRef.current;
      updateProgressForStore(activeStoreId, snapshot.time, snapshot.duration, true).catch(
        () => {},
      );
      return;
    }

    if (!progressTimerRef.current) {
      progressTimerRef.current = setInterval(() => {
        const snapshot = lastPlaybackRef.current;
        updateProgressForStore(activeStoreId, snapshot.time, snapshot.duration, false).catch(
          () => {},
        );
      }, PROGRESS_INTERVAL_MS);
    }

    return () => {
      clearProgressTimer();
      const snapshot = lastPlaybackRef.current;
      updateProgressForStore(activeStoreId, snapshot.time, snapshot.duration, true).catch(
        () => {},
      );
    };
  }, [
    activeStoreId,
    clearProgressTimer,
    isFocused,
    pausedUser,
    updateProgressForStore,
    user?.username,
  ]);

  useEffect(() => {
    if (!user?.username) return;
    if (!activeStoreId && activeStoreId !== 0) return;
    if (!activeDuration || activeDuration <= 0) return;
    if (completedByStoreRef.current.has(activeStoreId)) return;

    const completionRate = activeTime / activeDuration;
    if (completionRate < 0.98) return;

    const completeSession = async () => {
      const sessionId =
        sessionByStoreRef.current.get(activeStoreId) ??
        (await ensureSessionForStore(activeStoreId, activeTime, activeDuration));
      if (!sessionId) return;

      completedByStoreRef.current.add(activeStoreId);
      completeWatchSession(activeStoreId, {
        sessionId,
        durationWatched: Math.floor(activeTime),
        completionStatus: true,
      }).catch(() => {
        completedByStoreRef.current.delete(activeStoreId);
      });
    };
    completeSession().catch(() => {});
  }, [activeDuration, activeStoreId, activeTime, ensureSessionForStore, user?.username]);

  if (loading && videos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>동영상 불러오는 중…</Text>
      </View>
    );
  }

  if (errorMsg && videos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetryInitial}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        key={effectKey}
        ref={ref => {
          listRef.current = ref;
        }}
        data={videos}
        keyExtractor={keyExtractor}
        renderItem={renderItem as any}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialScrollIndex}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={onContentSizeChange}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScrollBeginDrag={handleUserScrollBegin}
        onMomentumScrollBegin={handleUserScrollBegin}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        removeClippedSubviews={true}
        windowSize={7}
        maxToRenderPerBatch={5}
        initialNumToRender={3}
        scrollEventThrottle={16}
      />

      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: headerTopPad, paddingBottom: headerBottomPad }]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {errorMsg && (
        <View style={[styles.errorBox, { top: errorTop }]}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {loadingMore && (
        <View style={styles.moreLoadingBox}>
          <Text style={styles.moreLoadingText}>다음 영상 준비 중…</Text>
        </View>
      )}

      <VideoFriendActivityPanel
        items={friendActivity}
        loading={activityLoading}
        onRefresh={() => {
          const current = videos[activeIndex];
          loadFriendActivity(current?.storeId);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090806' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,11,9,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#090806',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: 'white', fontSize: 16 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

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
