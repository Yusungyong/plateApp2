import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import {
  HomeVideoThumbnail,
  createHomeVideoWatchHistory,
} from '../../../api/homeVideoApi';
import { useAuth } from '../../../auth/AuthProvider';
import {
  buildHomeVideoAssetUrl,
  buildHomeVideoThumbUrl,
  isRenderableHomeVideoThumbPath,
} from '../utils/videoUtils';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[HomeVideoPreviewRow]');

const formatMMSS = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

type MiniVideoCardProps = {
  video?: HomeVideoThumbnail | null;

  // ✅ “이식 포인트”: 300ms 지연 후 Video를 렌더하기 위한 플래그
  playReady: boolean;

  // ✅ 실제 재생 여부(홈 포커스 등)
  isPlaying: boolean;

  duration: number;

  onLoad: (data: OnLoadData) => void;
  onProgress: (data: OnProgressData) => void;
  onError: (error: any) => void;
  onPress?: () => void;
};

const MiniVideoCard: React.FC<MiniVideoCardProps> = ({
  video,
  playReady,
  isPlaying,
  duration,
  onLoad,
  onProgress,
  onError,
  onPress,
}) => {
  const createdAt = video?.createdAt ?? video?.updatedAt;
  const videoUrl = useMemo(
    () => buildHomeVideoAssetUrl(video?.fileName, createdAt),
    [createdAt, video?.fileName],
  );

  const thumbUrl = useMemo(
    () =>
      video?.thumbnail && isRenderableHomeVideoThumbPath(video.thumbnail)
        ? buildHomeVideoThumbUrl(video.thumbnail, createdAt)
        : undefined,
    [createdAt, video?.thumbnail],
  );

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [thumbLoadFailed, setThumbLoadFailed] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const displayTitle = video?.title?.trim() || video?.storeName?.trim() || '제목 없음';
  const displayAddress = video?.address ?? '';

  const totalSeconds =
    duration > 0
      ? Math.round(duration)
      : typeof video?.videoDuration === 'number'
      ? Math.round(video.videoDuration)
      : 0;

  const displayDuration = totalSeconds > 0 ? formatMMSS(totalSeconds) : '';

  useEffect(() => {
    if (thumbUrl) {
      logger.debug('thumbnail resolved', {
        storeId: video?.storeId,
        title: displayTitle,
        originalThumbnail: video?.thumbnail,
        createdAt,
        thumbUrl,
      });
    } else {
      logger.warn('thumbnail missing or skipped', {
        storeId: video?.storeId,
        title: displayTitle,
        originalThumbnail: video?.thumbnail,
        createdAt,
        renderable: isRenderableHomeVideoThumbPath(video?.thumbnail),
      });
    }
  }, [createdAt, displayTitle, thumbUrl, video?.storeId, video?.thumbnail]);

  const shouldRenderVideo = !!videoUrl && playReady;
  const paused = !isPlaying;

  useEffect(() => {
    setIsVideoLoaded(false);
    setThumbLoadFailed(false);
    videoOpacity.setValue(0);
  }, [videoUrl, playReady, videoOpacity]);

  useEffect(() => {
    if (!isVideoLoaded) return;
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isVideoLoaded, videoOpacity]);

  if (!video) {
    return (
      <View style={[styles.miniCard, styles.miniCardEmpty]}>
        <Text style={styles.miniEmptyEmoji}>🙈</Text>
        <Text style={styles.miniEmptyTitle}>비디오 없음</Text>
        <Text style={styles.miniEmptySub}>아직 등록된 영상이 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.miniCard}>
      <View style={styles.glowBorder} pointerEvents="none" />
      <TouchableOpacity activeOpacity={1} style={styles.miniVideoWrapper} onPress={onPress}>
        {thumbUrl && !thumbLoadFailed ? (
          <Image
            source={{ uri: thumbUrl, cache: 'force-cache' }}
            style={styles.video}
            resizeMode="cover"
            onError={(event) => {
              setThumbLoadFailed(true);
              logger.warn('thumbnail image load failed', {
                storeId: video?.storeId,
                thumbUrl,
                error: event.nativeEvent,
              });
            }}
          />
        ) : (
          <View style={[styles.video, styles.videoPlaceholder]}>
            <Icon name="videocam" size={28} color="rgba(255,255,255,0.7)" />
          </View>
        )}
        {shouldRenderVideo ? (
          <Animated.View style={[styles.video, { opacity: videoOpacity }]}>
            <Video
              source={{ uri: videoUrl! }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              repeat
              paused={paused}
              onLoad={(data) => {
                setIsVideoLoaded(true);
                onLoad(data);
              }}
              onProgress={onProgress}
              onError={(error) => {
                setIsVideoLoaded(false);
                videoOpacity.setValue(0);
                onError(error);
              }}
              progressUpdateInterval={500}
              muted
              volume={0}
              ignoreSilentSwitch="ignore"
              // @ts-ignore
              mixWithOthers="mix"
              // @ts-ignore
              disableFocus
              playInBackground={false}
              playWhenInactive={false}
              disableAudioSessionManagement={true}
              poster={thumbUrl}
              posterResizeMode="cover"
            />
          </Animated.View>
        ) : null}

        {displayDuration ? (
          <View style={styles.badgeDuration}>
            <Text style={styles.badgeDurationText}>{displayDuration}</Text>
          </View>
        ) : null}

        <View style={styles.bottomOverlay}>
          <View style={styles.bottomOverlayGradient} />
          <View style={styles.bottomTextContainer}>
            <Text style={styles.bottomTitleText} numberOfLines={1}>
              {displayTitle}
            </Text>
            {displayAddress ? (
              <Text style={styles.bottomAddressText} numberOfLines={1}>
                {displayAddress}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {/* Progress bar removed for cleaner tile */}
    </View>
  );
};

const LoadingState = () => (
  <View style={styles.stateBox}>
    <ActivityIndicator />
    <Text style={styles.stateText}>불러오는 중...</Text>
  </View>
);

const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <View style={styles.stateBox}>
    <Text style={styles.errorText}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>다시 시도</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const EmptyState = () => (
  <View style={styles.stateBox}>
    <Text style={styles.stateText}>표시할 영상이 없어요.</Text>
  </View>
);

type Props = {
  videos: HomeVideoThumbnail[];
  loading?: boolean;
  errorMsg?: string | null;
  onReload?: () => void;
  isFocused?: boolean;
  showHeader?: boolean;
  enableDualPreview?: boolean;
  autoPlay?: boolean;
};

const prefetchThumbs = (items: Array<HomeVideoThumbnail | undefined>) => {
  items.forEach((item) => {
    if (!item) return;
    const createdAt = item.createdAt ?? item.updatedAt;
    const thumbUrl = item.thumbnail && isRenderableHomeVideoThumbPath(item.thumbnail)
      ? buildHomeVideoThumbUrl((item as any).thumbnail, createdAt)
      : undefined;
    if (thumbUrl) {
      logger.debug('prefetch thumbnail', {
        storeId: item.storeId,
        originalThumbnail: item.thumbnail,
        createdAt,
        thumbUrl,
      });
      Image.prefetch(thumbUrl).catch((error) => {
        logger.warn('thumbnail prefetch failed', {
          storeId: item.storeId,
          thumbUrl,
          error,
        });
      });
    } else {
      logger.warn('prefetch skipped: thumbnail url missing', {
        storeId: item.storeId,
        originalThumbnail: item.thumbnail,
        createdAt,
      });
    }
  });
};

const HomeVideoPreviewRow: React.FC<Props> = ({
  videos,
  loading,
  errorMsg,
  onReload,
  isFocused = true,
  showHeader = true,
  enableDualPreview = false,
  autoPlay = true,
}) => {
  const user = useAuth()?.user;
  const navigation = useNavigation<any>();

  const previewVideos = useMemo(() => {
    return videos
      .map((video, index) => ({
        video,
        index,
        hasRenderableThumb: isRenderableHomeVideoThumbPath(video.thumbnail),
      }))
      .sort((a, b) => {
        if (a.hasRenderableThumb === b.hasRenderableThumb) {
          return a.index - b.index;
        }
        return a.hasRenderableThumb ? -1 : 1;
      })
      .map((entry) => entry.video);
  }, [videos]);

  const leftVideo = previewVideos[0];
  const rightVideo = previewVideos[1];
  const hasAnyVideo = videos.length > 0;
  const prefetchTargets = useMemo(() => previewVideos.slice(0, 4), [previewVideos]);

  // ✅ 두 썸네일 “동시 재생” 조건
  const shouldPlay = autoPlay && isFocused && hasAnyVideo;

  useEffect(() => {
    if (!prefetchTargets.length) return;
    prefetchThumbs(prefetchTargets);
  }, [prefetchTargets]);

  useEffect(() => {
    if (videos.length < 2) return;
    const leftChanged = leftVideo?.storeId !== videos[0]?.storeId;
    const rightChanged = rightVideo?.storeId !== videos[1]?.storeId;
    if (!leftChanged && !rightChanged) return;

    logger.warn('reordered preview videos to prefer renderable thumbnails', {
      original: videos.slice(0, 4).map((item) => ({
        storeId: item.storeId,
        thumbnail: item.thumbnail,
        renderable: isRenderableHomeVideoThumbPath(item.thumbnail),
      })),
      preview: [leftVideo, rightVideo].filter(Boolean).map((item) => ({
        storeId: item?.storeId,
        thumbnail: item?.thumbnail,
      })),
    });
  }, [leftVideo, rightVideo, videos]);

  // ✅ “이식 포인트”: 300ms 지연 후 Video mount (동시에 올라오면 부하가 커서 약간 stagger)
  const [leftPlayReady, setLeftPlayReady] = useState(false);
  const [rightPlayReady, setRightPlayReady] = useState(false);

  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);

  // 300ms mount 지연 + 상태 초기화
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    // 리스트 바뀌면 초기화
    setLeftDuration(0);
    setRightDuration(0);
    if (shouldPlay) {
      // ✅ 동시에 mount 방지(살짝 stagger)
      t1 = setTimeout(() => setLeftPlayReady(true), 300);
      if (enableDualPreview) {
        t2 = setTimeout(() => setRightPlayReady(true), 420);
      } else {
        setRightPlayReady(false);
      }
    } else {
      setLeftPlayReady(false);
      setRightPlayReady(false);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [enableDualPreview, shouldPlay, videos]);

  const handlePressVideo = useCallback(
    (video?: HomeVideoThumbnail) => {
      if (!video) return;
      if (!video.storeId || !video.placeId) {
        return;
      }

      const usernameParam = user?.username ?? '';
      createHomeVideoWatchHistory(video.storeId, user).catch(() => {});
      navigation.navigate('VideoFeedScreen', {
        username: usernameParam,
        storeId: video.storeId,
        placeId: video.placeId,
      });
    },
    [navigation, user],
  );

  return (
    <View style={styles.previewContainer}>
      {showHeader ? (
        <View style={styles.previewHeaderRow}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.previewTitle}>오늘의 영상</Text>
          </View>

          {onReload && (
            <TouchableOpacity
              style={styles.refreshIconButton}
              onPress={onReload}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="refresh" size={24} color="#777" />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {loading && (
        <LoadingState />
      )}

      {errorMsg && !loading && (
        <ErrorState message={errorMsg} onRetry={onReload} />
      )}

      {hasAnyVideo ? (
        <View style={styles.miniRow}>
          <MiniVideoCard
            video={leftVideo}
            playReady={leftPlayReady}
            isPlaying={shouldPlay && !!leftVideo}
            duration={leftDuration}
            onLoad={data => setLeftDuration(data.duration)}
            onProgress={(_data) => {}}
            onError={() => {}}
            onPress={() => handlePressVideo(leftVideo)}
          />
          <MiniVideoCard
            video={rightVideo}
            playReady={enableDualPreview ? rightPlayReady : false}
            isPlaying={shouldPlay && !!rightVideo}
            duration={rightDuration}
            onLoad={data => setRightDuration(data.duration)}
            onProgress={(_data) => {}}
            onError={() => {}}
            onPress={() => handlePressVideo(rightVideo)}
          />
        </View>
      ) : !loading && !errorMsg ? (
        <EmptyState />
      ) : null}
    </View>
  );
};

export default HomeVideoPreviewRow;

const styles = StyleSheet.create({
  previewContainer: {
    paddingHorizontal: 4,
    marginBottom: 10,
    paddingTop: 8,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTextWrapper: {
    flexShrink: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HOME_RADII.input,
    backgroundColor: HOME_COLORS.surfaceMuted,
  },
  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: HOME_COLORS.textSubtle,
  },
  errorText: {
    fontSize: 13,
    color: HOME_COLORS.textDanger,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: HOME_RADII.input,
    backgroundColor: HOME_COLORS.ink,
  },
  retryText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },

  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  miniCard: {
    width: '48%',
    position: 'relative',
    borderRadius: 20,
    padding: 4,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 120, 0.5)',
    shadowColor: '#ffc778',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  miniCardEmpty: {
    minHeight: 220,
    borderRadius: HOME_RADII.cardSmall,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderLight,
    backgroundColor: HOME_COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  miniEmptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  miniEmptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  miniEmptySub: {
    fontSize: 11,
    color: HOME_COLORS.textLight,
    textAlign: 'center',
  },

  miniVideoWrapper: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: HOME_RADII.cardSmall,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.overlayDark,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.ink,
  },

  badgeDuration: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeDurationText: {
    fontSize: 11,
    color: HOME_COLORS.textOnDark,
    fontWeight: '600',
  },

  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomOverlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bottomTextContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bottomTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_COLORS.textOnDark,
  },
  bottomAddressText: {
    marginTop: 2,
    fontSize: 11,
    color: HOME_COLORS.textFaint,
  },

  miniProgressBarBackground: {
    display: 'none',
  },
  miniProgressBarFill: {},

});
