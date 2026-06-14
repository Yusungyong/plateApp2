import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import {
  HomeVideoThumbnail,
  createHomeVideoWatchHistory,
} from '../../../api/homeVideoApi';
import type { VideoFeedItem } from '../../../api/videoFeedApi';
import { useAuth } from '../../../auth/AuthProvider';
import { buildProfileUri } from '../../../utils/profileImage';
import {
  buildHomeVideoAssetUrl,
  buildHomeVideoThumbUrl,
  isRenderableHomeVideoThumbPath,
} from '../utils/videoUtils';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
const animatePressScale = (value: Animated.Value, toValue: number) => {
  Animated.spring(value, {
    toValue,
    tension: 260,
    friction: 22,
    useNativeDriver: true,
  }).start();
};

const formatMMSS = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const getAuthorLabel = (video?: HomeVideoThumbnail | null) => {
  const nickname = video?.nickName?.trim() ?? '';
  const username = video?.username?.trim() ?? '';

  if (nickname && username && nickname !== username) {
    return `${nickname} · @${username}`;
  }
  if (nickname) {
    return nickname;
  }
  if (username) {
    return `@${username}`;
  }
  return '';
};

const getAuthorProfileUri = (video?: HomeVideoThumbnail | null) => {
  const username = video?.username?.trim() ?? '';
  const profileImageUrl = video?.profileImageUrl?.trim() ?? '';
  if (!profileImageUrl) {
    return '';
  }
  return buildProfileUri(username || undefined, profileImageUrl);
};

const mapHomeVideoToFeedItem = (
  video: HomeVideoThumbnail,
): VideoFeedItem | null => {
  if (!video.storeId || !video.placeId) {
    return null;
  }

  return {
    storeId: video.storeId,
    placeId: video.placeId,
    title: video.title ?? null,
    storeName: video.storeName ?? null,
    address: video.address ?? null,
    fileName: video.fileName ?? null,
    thumbnail: video.thumbnail ?? null,
    videoDuration: video.videoDuration ?? null,
    commentCount: video.commentCount ?? null,
    likeCount: video.likeCount ?? null,
    likedByMe: video.likedByMe ?? null,
    username: video.username ?? null,
    nickName: video.nickName ?? null,
    profileImageUrl: video.profileImageUrl ?? null,
    createdAt: video.createdAt ?? video.updatedAt ?? null,
  };
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
  const authorLabel = getAuthorLabel(video);
  const authorProfileUri = getAuthorProfileUri(video);

  const totalSeconds =
    duration > 0
      ? Math.round(duration)
      : typeof video?.videoDuration === 'number'
      ? Math.round(video.videoDuration)
      : 0;

  const displayDuration = totalSeconds > 0 ? formatMMSS(totalSeconds) : '';

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
      <TouchableOpacity activeOpacity={1} style={styles.miniVideoWrapper} onPress={onPress}>
        {thumbUrl && !thumbLoadFailed ? (
          <Image
            source={{ uri: thumbUrl, cache: 'force-cache' }}
            style={styles.video}
            resizeMode="cover"
            onError={() => {
              setThumbLoadFailed(true);
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
            {authorLabel ? (
              <View style={styles.bottomAuthorRow}>
                {authorProfileUri ? (
                  <Image source={{ uri: authorProfileUri }} style={styles.authorAvatarMini} />
                ) : null}
                <Text style={styles.bottomAuthorText} numberOfLines={1}>
                  {authorLabel}
                </Text>
              </View>
            ) : null}
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
  hasLoadedOnce?: boolean;
  variant?: 'default' | 'editorial';
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
  hasLoadedOnce = false,
  variant = 'default',
}) => {
  const user = useAuth()?.user;
  const navigation = useNavigation<any>();
  const isEditorial = variant === 'editorial';

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

  const firstVideo = previewVideos[0];
  const secondVideo = previewVideos[1];
  const thirdVideo = previewVideos[2];
  const hasAnyVideo = videos.length > 0;
  const shouldShowLoadingState = Boolean(loading && !hasAnyVideo && !hasLoadedOnce);
  const shouldShowErrorState = Boolean(errorMsg && !loading && !hasAnyVideo);
  const prefetchTargets = useMemo(() => previewVideos.slice(0, 4), [previewVideos]);
  const prefetchedThumbsRef = useRef<Set<string>>(new Set());

  // ✅ 두 썸네일 “동시 재생” 조건
  const shouldPlay = autoPlay && isFocused && hasAnyVideo;
  const videoContextItems = useMemo(
    () =>
      videos
        .map(video => mapHomeVideoToFeedItem(video))
        .filter((item): item is VideoFeedItem => item != null),
    [videos],
  );

  useEffect(() => {
    if (!prefetchTargets.length) return;
    prefetchTargets.forEach((item) => {
      if (!item) {
        return;
      }
      const createdAt = item.createdAt ?? item.updatedAt;
      const thumbUrl =
        item.thumbnail && isRenderableHomeVideoThumbPath(item.thumbnail)
          ? buildHomeVideoThumbUrl(item.thumbnail, createdAt)
          : undefined;
      if (!thumbUrl || prefetchedThumbsRef.current.has(thumbUrl)) {
        return;
      }
      prefetchedThumbsRef.current.add(thumbUrl);
      Image.prefetch(thumbUrl).catch(() => {
        prefetchedThumbsRef.current.delete(thumbUrl);
      });
    });
  }, [prefetchTargets]);

  // ✅ “이식 포인트”: 300ms 지연 후 Video mount (동시에 올라오면 부하가 커서 약간 stagger)
  const [firstPlayReady, setFirstPlayReady] = useState(false);
  const [secondPlayReady, setSecondPlayReady] = useState(false);
  const [thirdPlayReady, setThirdPlayReady] = useState(false);

  const [firstDuration, setFirstDuration] = useState(0);
  const [secondDuration, setSecondDuration] = useState(0);
  const [thirdDuration, setThirdDuration] = useState(0);
  const heroEntrance = useRef(new Animated.Value(isEditorial ? 0 : 1)).current;
  const supportEntrances = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const heroPressScale = useRef(new Animated.Value(1)).current;
  const supportPressScales = useRef([new Animated.Value(1), new Animated.Value(1)]).current;

  const latestSignature = useMemo(
    () =>
      [firstVideo?.storeId, secondVideo?.storeId, thirdVideo?.storeId]
        .filter(Boolean)
        .join('-'),
    [firstVideo?.storeId, secondVideo?.storeId, thirdVideo?.storeId],
  );

  const getEntranceStyle = useCallback((value: Animated.Value) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  }), []);

  // 300ms mount 지연 + 상태 초기화
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;
    let t3: ReturnType<typeof setTimeout> | null = null;

    // 리스트 바뀌면 초기화
    setFirstDuration(0);
    setSecondDuration(0);
    setThirdDuration(0);
    if (shouldPlay) {
      t1 = setTimeout(() => setFirstPlayReady(true), 260);
      if (enableDualPreview) {
        t2 = setTimeout(() => setSecondPlayReady(true), 380);
        if (isEditorial) {
          t3 = setTimeout(() => setThirdPlayReady(true), 480);
        } else {
          setThirdPlayReady(false);
        }
      } else {
        setSecondPlayReady(false);
        setThirdPlayReady(false);
      }
    } else {
      setFirstPlayReady(false);
      setSecondPlayReady(false);
      setThirdPlayReady(false);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [enableDualPreview, isEditorial, shouldPlay, videos]);

  useEffect(() => {
    if (!isEditorial) {
      heroEntrance.setValue(1);
      supportEntrances.forEach((value) => value.setValue(1));
      return;
    }

    heroEntrance.setValue(0);
    supportEntrances.forEach((value) => value.setValue(0));

    const animationQueue = [
      Animated.timing(heroEntrance, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    if (secondVideo) {
      animationQueue.push(
        Animated.timing(supportEntrances[0], {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    }

    if (thirdVideo) {
      animationQueue.push(
        Animated.timing(supportEntrances[1], {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    }

    Animated.stagger(90, animationQueue).start();
  }, [
    heroEntrance,
    isEditorial,
    latestSignature,
    secondVideo,
    supportEntrances,
    thirdVideo,
  ]);

  const handlePressVideo = useCallback(
    (video?: HomeVideoThumbnail) => {
      if (!video) return;
      if (!video.storeId || !video.placeId) {
        return;
      }

      const selectedIndex = videoContextItems.findIndex(
        item => item.storeId === video.storeId && item.placeId === video.placeId,
      );
      createHomeVideoWatchHistory(video.storeId, user).catch(() => {});
      navigation.navigate('VideoFeedScreen', {
        storeId: video.storeId,
        placeId: video.placeId,
        contextItems: videoContextItems.length > 0 ? videoContextItems : undefined,
        contextIndex: selectedIndex >= 0 ? selectedIndex : undefined,
      });
    },
    [navigation, user, videoContextItems],
  );

  const renderMetaBadges = useCallback((video?: HomeVideoThumbnail | null) => {
    const badges = [video?.storeName?.trim()].filter(Boolean) as string[];

    if (badges.length === 0) {
      return null;
    }

    return (
      <View style={styles.editorialBadgeRow}>
        {badges.slice(0, 2).map((badge) => (
          <View key={badge} style={styles.editorialMetaPill}>
            <Text style={styles.editorialMetaPillText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ))}
      </View>
    );
  }, []);

  const renderHeroCard = () => {
    if (!firstVideo) {
      return (
        <View style={[styles.heroCard, styles.heroEmptyCard]}>
          <Text style={styles.miniEmptyEmoji}>🙈</Text>
          <Text style={styles.miniEmptyTitle}>비디오 없음</Text>
          <Text style={styles.miniEmptySub}>아직 등록된 영상이 없어요.</Text>
        </View>
      );
    }

    const createdAt = firstVideo.createdAt ?? firstVideo.updatedAt;
    const videoUrl = buildHomeVideoAssetUrl(firstVideo.fileName, createdAt);
    const thumbUrl =
      firstVideo.thumbnail && isRenderableHomeVideoThumbPath(firstVideo.thumbnail)
        ? buildHomeVideoThumbUrl(firstVideo.thumbnail, createdAt)
        : undefined;
    const displayTitle =
      firstVideo.title?.trim() || firstVideo.storeName?.trim() || '제목 없음';
    const displayAddress = firstVideo.address?.trim() || '';
    const authorLabel = getAuthorLabel(firstVideo);
    const authorProfileUri = getAuthorProfileUri(firstVideo);
    const totalSeconds =
      typeof firstVideo.videoDuration === 'number'
        ? Math.round(firstVideo.videoDuration)
        : firstDuration;
    const displayDuration = totalSeconds > 0 ? formatMMSS(totalSeconds) : '';
    const shouldRenderVideo = !!videoUrl && firstPlayReady;

    return (
      <Animated.View style={getEntranceStyle(heroEntrance)}>
        <Animated.View style={{ transform: [{ scale: heroPressScale }] }}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.heroCard}
            onPress={() => handlePressVideo(firstVideo)}
            onPressIn={() => animatePressScale(heroPressScale, 0.986)}
            onPressOut={() => animatePressScale(heroPressScale, 1)}
          >
            {thumbUrl ? (
              <Image
                source={{ uri: thumbUrl, cache: 'force-cache' }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroImage, styles.videoPlaceholder]}>
                <Icon name="videocam" size={34} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            {shouldRenderVideo ? (
              <Animated.View style={[styles.heroImage, styles.videoVisible]}>
                <Video
                  source={{ uri: videoUrl }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                  repeat
                  paused={!shouldPlay}
                  onLoad={(data) => setFirstDuration(data.duration)}
                  onProgress={(_data) => {}}
                  onError={() => {}}
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

            <View style={styles.heroScrim} />
            <View style={styles.heroTopBar}>
              {renderMetaBadges(firstVideo)}
              {displayDuration ? (
                <View style={styles.heroDurationPill}>
                  <Text style={styles.heroDurationText}>{displayDuration}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.heroCopyBlock}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
              {displayAddress ? (
                <Text style={styles.heroAddress} numberOfLines={1}>
                  {displayAddress}
                </Text>
              ) : null}
              {authorLabel ? (
                <View style={styles.heroAuthorRow}>
                  {authorProfileUri ? (
                    <Image source={{ uri: authorProfileUri }} style={styles.authorAvatarHero} />
                  ) : null}
                  <Text style={styles.heroAuthorText} numberOfLines={1}>
                    {authorLabel}
                  </Text>
                </View>
              ) : null}
              <View style={styles.heroFooterRow}>
                <View style={styles.heroInfoPill}>
                  <Icon name="play-circle-outline" size={14} color={HOME_COLORS.textOnDark} />
                  <Text style={styles.heroInfoPillText}>최신 영상</Text>
                </View>
                {(firstVideo.likeCount || firstVideo.commentCount) ? (
                  <View style={styles.heroStatsRow}>
                    {typeof firstVideo.likeCount === 'number' ? (
                      <View style={styles.heroStatItem}>
                        <Icon name="heart-outline" size={12} color={HOME_COLORS.textOnDark} />
                        <Text style={styles.heroStatText}>{firstVideo.likeCount}</Text>
                      </View>
                    ) : null}
                    {typeof firstVideo.commentCount === 'number' ? (
                      <View style={styles.heroStatItem}>
                        <Icon name="chatbubble-outline" size={12} color={HOME_COLORS.textOnDark} />
                        <Text style={styles.heroStatText}>{firstVideo.commentCount}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderSupportCard = (
    video: HomeVideoThumbnail | undefined,
    playReady: boolean,
    duration: number,
    onLoad: (data: OnLoadData) => void,
  ) => {
    if (!video) {
      return null;
    }

    const createdAt = video.createdAt ?? video.updatedAt;
    const videoUrl = buildHomeVideoAssetUrl(video.fileName, createdAt);
    const thumbUrl =
      video.thumbnail && isRenderableHomeVideoThumbPath(video.thumbnail)
        ? buildHomeVideoThumbUrl(video.thumbnail, createdAt)
        : undefined;
    const displayTitle = video.title?.trim() || video.storeName?.trim() || '제목 없음';
    const authorLabel = getAuthorLabel(video);
    const authorProfileUri = getAuthorProfileUri(video);
    const totalSeconds =
      duration > 0
        ? Math.round(duration)
        : typeof video.videoDuration === 'number'
        ? Math.round(video.videoDuration)
        : 0;
    const displayDuration = totalSeconds > 0 ? formatMMSS(totalSeconds) : '';
    const shouldRenderVideo = !!videoUrl && playReady;

    const supportIndex = video === secondVideo ? 0 : 1;

    return (
      <Animated.View
        key={`${video.storeId}-${video.placeId ?? 'support'}`}
        style={[styles.supportCardFrame, getEntranceStyle(supportEntrances[supportIndex])]}
      >
        <Animated.View style={{ transform: [{ scale: supportPressScales[supportIndex] }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.supportCard}
            onPress={() => handlePressVideo(video)}
            onPressIn={() => animatePressScale(supportPressScales[supportIndex], 0.988)}
            onPressOut={() => animatePressScale(supportPressScales[supportIndex], 1)}
          >
            {thumbUrl ? (
              <Image
                source={{ uri: thumbUrl, cache: 'force-cache' }}
                style={styles.supportImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.supportImage, styles.videoPlaceholder]}>
                <Icon name="videocam" size={22} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            {shouldRenderVideo ? (
              <Animated.View style={[styles.supportImage, styles.videoVisible]}>
                <Video
                  source={{ uri: videoUrl }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                  repeat
                  paused={!shouldPlay}
                  onLoad={onLoad}
                  onProgress={(_data) => {}}
                  onError={() => {}}
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
            <View style={styles.supportScrim} />
            <View style={styles.supportTopRow}>
              {video.storeName ? (
                <View style={styles.supportStorePill}>
                  <Text style={styles.supportStoreText} numberOfLines={1}>
                    {video.storeName}
                  </Text>
                </View>
              ) : null}
              {displayDuration ? (
                <View style={styles.supportDurationPill}>
                  <Text style={styles.supportDurationText}>{displayDuration}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.supportCopyBlock}>
              <Text style={styles.supportTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
              {authorLabel ? (
                <View style={styles.supportAuthorRow}>
                  {authorProfileUri ? (
                    <Image source={{ uri: authorProfileUri }} style={styles.authorAvatarSupport} />
                  ) : null}
                  <Text style={styles.supportAuthorText} numberOfLines={1}>
                    {authorLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

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

      {shouldShowLoadingState && (
        <LoadingState />
      )}

      {shouldShowErrorState && (
        <ErrorState message={errorMsg ?? '영상을 불러오지 못했어요.'} onRetry={onReload} />
      )}

      {hasAnyVideo && isEditorial ? (
        <View style={styles.editorialShell}>
          {renderHeroCard()}
          {(secondVideo || thirdVideo) ? (
            <View style={styles.supportRow}>
              {renderSupportCard(
                secondVideo,
                enableDualPreview ? secondPlayReady : false,
                secondDuration,
                (data) => setSecondDuration(data.duration),
              )}
              {renderSupportCard(
                thirdVideo,
                enableDualPreview ? thirdPlayReady : false,
                thirdDuration,
                (data) => setThirdDuration(data.duration),
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      {hasAnyVideo && !isEditorial ? (
        <View style={styles.miniRow}>
          <MiniVideoCard
            video={firstVideo}
            playReady={firstPlayReady}
            isPlaying={shouldPlay && !!firstVideo}
            duration={firstDuration}
            onLoad={data => setFirstDuration(data.duration)}
            onProgress={(_data) => {}}
            onError={() => {}}
            onPress={() => handlePressVideo(firstVideo)}
          />
          <MiniVideoCard
            video={secondVideo}
            playReady={enableDualPreview ? secondPlayReady : false}
            isPlaying={shouldPlay && !!secondVideo}
            duration={secondDuration}
            onLoad={data => setSecondDuration(data.duration)}
            onProgress={(_data) => {}}
            onError={() => {}}
            onPress={() => handlePressVideo(secondVideo)}
          />
        </View>
      ) : !hasAnyVideo && !loading && !errorMsg ? (
        <EmptyState />
      ) : null}
    </View>
  );
};

export default HomeVideoPreviewRow;

const styles = StyleSheet.create({
  previewContainer: {
    paddingHorizontal: 0,
    marginBottom: 0,
    paddingTop: 0,
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
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HOME_RADII.cardSmall,
    backgroundColor: HOME_COLORS.surfacePanel,
    minHeight: 184,
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
    borderRadius: HOME_RADII.badge,
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
    columnGap: 12,
  },

  miniCard: {
    width: '48%',
    position: 'relative',
    borderRadius: 24,
    padding: 0,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  miniCardEmpty: {
    minHeight: 220,
    borderRadius: HOME_RADII.cardSmall,
    backgroundColor: HOME_COLORS.surfacePanel,
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
    borderRadius: 24,
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
  videoVisible: {
    opacity: 1,
  },

  badgeDuration: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  badgeDurationText: {
    fontSize: 11,
    color: HOME_COLORS.textPrimary,
    fontWeight: '700',
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
    backgroundColor: 'rgba(7,14,25,0.62)',
  },
  bottomTextContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  bottomTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_COLORS.textOnDark,
  },
  bottomAuthorRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  bottomAuthorText: {
    flex: 1,
    fontSize: 10,
    color: HOME_COLORS.textFaint,
    fontWeight: '600',
  },
  authorAvatarMini: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  bottomAddressText: {
    marginTop: 3,
    fontSize: 11,
    color: HOME_COLORS.textFaint,
  },

  miniProgressBarBackground: {
    display: 'none',
  },
  miniProgressBarFill: {},
  editorialShell: {
    gap: 8,
  },
  heroCard: {
    minHeight: 286,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.inkSoft,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroEmptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: HOME_COLORS.surfacePanel,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,14,25,0.14)',
  },
  heroTopBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  heroCopyBlock: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  heroTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    color: HOME_COLORS.textOnDark,
    letterSpacing: -0.7,
  },
  heroAddress: {
    marginTop: 4,
    fontSize: 12,
    color: HOME_COLORS.textFaint,
  },
  heroAuthorRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },
  heroAuthorText: {
    flex: 1,
    fontSize: 11,
    color: HOME_COLORS.textFaint,
    fontWeight: '700',
  },
  authorAvatarHero: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroFooterRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 10,
  },
  heroInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroInfoPillText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 10,
    fontWeight: '800',
  },
  heroStatsRow: {
    flexDirection: 'row',
    columnGap: 10,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  heroStatText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 11,
    fontWeight: '700',
  },
  heroDurationPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  heroDurationText: {
    color: HOME_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  editorialBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  editorialMetaPill: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  editorialMetaPillText: {
    color: HOME_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  supportRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  supportCardFrame: {
    flex: 1,
  },
  supportCard: {
    flex: 1,
    minHeight: 152,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.inkSoft,
  },
  supportImage: {
    ...StyleSheet.absoluteFillObject,
  },
  supportScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,14,25,0.18)',
  },
  supportTopRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  supportStorePill: {
    flex: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  supportStoreText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 10,
    fontWeight: '800',
  },
  supportDurationPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  supportDurationText: {
    color: HOME_COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  supportCopyBlock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
  },
  supportTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
  supportAuthorRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  supportAuthorText: {
    flex: 1,
    fontSize: 10,
    color: HOME_COLORS.textFaint,
    fontWeight: '600',
  },
  authorAvatarSupport: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
