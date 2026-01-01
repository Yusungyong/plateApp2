import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import {
  HomeVideoThumbnail,
  createHomeVideoWatchHistory,
} from '../../../api/homeVideoApi';
import { useAuth } from '../../../auth/AuthProvider';

const FILE_BASE_URL = Config.VIDEO_BUCKET;

const UI_THROTTLE_MS = 250;

/** URL 조합 헬퍼 (// 중복 방지) */
const joinUrl = (base?: string, path?: string | null) => {
  if (!base || !path) return undefined;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

/** 비디오 URL 생성 헬퍼 */
const buildVideoUrl = (fileName?: string | null) => joinUrl(FILE_BASE_URL, fileName);

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

  // UI용 진행상태
  currentTime: number;
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
  currentTime,
  duration,
  onLoad,
  onProgress,
  onError,
  onPress,
}) => {
  if (!video) {
    return (
      <View style={[styles.miniCard, styles.miniCardEmpty]}>
        <Text style={styles.miniEmptyEmoji}>🙈</Text>
        <Text style={styles.miniEmptyTitle}>비디오 없음</Text>
        <Text style={styles.miniEmptySub}>아직 등록된 영상이 없어요.</Text>
      </View>
    );
  }

  const videoUrl = buildVideoUrl(video.fileName);

  // 썸네일 있으면 poster로 사용 (없으면 fileName으로 fallback)
  // HomeVideoThumbnail에 thumbnail 필드가 있다면 그대로 사용됨
  // @ts-ignore
  const thumb = video?.thumbnail ? buildVideoUrl((video as any).thumbnail) : undefined;
  const posterUrl = thumb || videoUrl;

  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const displayTitle = video.title?.trim() || video.storeName?.trim() || '제목 없음';
  const displayAddress = video.address ?? '';

  const totalSeconds =
    duration > 0
      ? Math.round(duration)
      : typeof video.videoDuration === 'number'
      ? Math.round(video.videoDuration)
      : 0;

  const displayDuration = totalSeconds > 0 ? formatMMSS(totalSeconds) : '';

  const shouldRenderVideo = !!videoUrl && playReady; // ✅ 300ms 뒤에만 Video mount
  const paused = !isPlaying; // ✅ 두 썸네일 모두 “재생 상태”일 때만 재생

  return (
    <View style={styles.miniCard}>
      <TouchableOpacity activeOpacity={1} style={styles.miniVideoWrapper} onPress={onPress}>
        {shouldRenderVideo ? (
          <Video
            source={{ uri: videoUrl! }}
            style={styles.video}
            resizeMode="cover"
            repeat
            paused={paused}
            onLoad={onLoad}
            onProgress={onProgress}
            onError={onError}
            progressUpdateInterval={500} // ✅ progress 이벤트 과다 방지

            // ✅ 썸네일 방식 이식: 무음 자동재생 + 오디오 충돌 최소화
            muted
            volume={0}
            ignoreSilentSwitch="ignore"
            // @ts-ignore
            mixWithOthers="mix"
            // @ts-ignore
            disableFocus

            playInBackground={false}
            playWhenInactive={false}

            // ✅ iOS 오디오 세션 폭주 줄이기(react-native-video 6.x)
            disableAudioSessionManagement={true}

            // ✅ 검은 프레임 방지
            poster={posterUrl}
            posterResizeMode="cover"
          />
        ) : (
          // ✅ Video가 아직 mount 전이면 썸네일을 보여줌(깜박 방지)
          <Image
            source={{ uri: posterUrl || undefined }}
            style={styles.video}
            resizeMode="cover"
          />
        )}

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

      <View style={styles.miniProgressBarBackground}>
        <View style={[styles.miniProgressBarFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
};

type Props = {
  videos: HomeVideoThumbnail[];
  loading?: boolean;
  errorMsg?: string | null;
  onReload?: () => void;
  isFocused?: boolean;
};

const HomeVideoPreviewRow: React.FC<Props> = ({
  videos,
  loading,
  errorMsg,
  onReload,
  isFocused = true,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const leftVideo = videos[0];
  const rightVideo = videos[1];
  const hasAnyVideo = videos.length > 0;

  // ✅ 두 썸네일 “동시 재생” 조건
  const shouldPlay = isFocused && hasAnyVideo;

  // ✅ “이식 포인트”: 300ms 지연 후 Video mount (동시에 올라오면 부하가 커서 약간 stagger)
  const [leftPlayReady, setLeftPlayReady] = useState(false);
  const [rightPlayReady, setRightPlayReady] = useState(false);

  // 진행 UI용
  const [leftDuration, setLeftDuration] = useState(0);
  const [leftTime, setLeftTime] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const [rightTime, setRightTime] = useState(0);

  // ✅ 시청 이력 (중복 방지)
  const leftWatchSentRef = useRef(false);
  const rightWatchSentRef = useRef(false);

  // progress 업데이트 쓰로틀
  const leftTickRef = useRef(0);
  const rightTickRef = useRef(0);

  // 300ms mount 지연 + 상태 초기화
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    // 리스트 바뀌면 초기화
    setLeftDuration(0);
    setRightDuration(0);
    setLeftTime(0);
    setRightTime(0);

    leftWatchSentRef.current = false;
    rightWatchSentRef.current = false;

    if (shouldPlay) {
      // ✅ 동시에 mount 방지(살짝 stagger)
      t1 = setTimeout(() => setLeftPlayReady(true), 300);
      t2 = setTimeout(() => setRightPlayReady(true), 420);
    } else {
      setLeftPlayReady(false);
      setRightPlayReady(false);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [shouldPlay, videos]);

  // 총 duration 계산(서버값 fallback)
  const getTotalDurationSec = useCallback(
    (durationState: number, video?: HomeVideoThumbnail) => {
      if (durationState > 0) return durationState;
      if (video?.videoDuration && video.videoDuration > 0) return video.videoDuration;
      return 0;
    },
    [],
  );

  // ✅ 2초 유지 시 시청 이력 저장 (썸네일 방식 이식)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldPlay && leftPlayReady && leftVideo && !leftWatchSentRef.current) {
      t = setTimeout(() => {
        if (leftWatchSentRef.current) return;
        leftWatchSentRef.current = true;
        createHomeVideoWatchHistory(leftVideo.storeId, user).catch(e =>
          console.warn('left watch history error', e),
        );
      }, 2000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [shouldPlay, leftPlayReady, leftVideo, user]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldPlay && rightPlayReady && rightVideo && !rightWatchSentRef.current) {
      t = setTimeout(() => {
        if (rightWatchSentRef.current) return;
        rightWatchSentRef.current = true;
        createHomeVideoWatchHistory(rightVideo.storeId, user).catch(e =>
          console.warn('right watch history error', e),
        );
      }, 2000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [shouldPlay, rightPlayReady, rightVideo, user]);

  // ✅ (옵션) 50% 도달 시도 같이 유지(먼저 걸리는 쪽으로 1회만 저장)
  const handleLeftProgress = useCallback(
    (data: OnProgressData) => {
      const now = Date.now();
      if (now - leftTickRef.current > UI_THROTTLE_MS) {
        leftTickRef.current = now;
        setLeftTime(data.currentTime);
      }

      if (leftWatchSentRef.current || !leftVideo) return;
      const total = getTotalDurationSec(leftDuration, leftVideo);
      if (total <= 0) return;

      if (data.currentTime / total >= 0.5) {
        leftWatchSentRef.current = true;
        createHomeVideoWatchHistory(leftVideo.storeId, user).catch(e =>
          console.warn('left watch history error', e),
        );
      }
    },
    [leftDuration, leftVideo, user, getTotalDurationSec],
  );

  const handleRightProgress = useCallback(
    (data: OnProgressData) => {
      const now = Date.now();
      if (now - rightTickRef.current > UI_THROTTLE_MS) {
        rightTickRef.current = now;
        setRightTime(data.currentTime);
      }

      if (rightWatchSentRef.current || !rightVideo) return;
      const total = getTotalDurationSec(rightDuration, rightVideo);
      if (total <= 0) return;

      if (data.currentTime / total >= 0.5) {
        rightWatchSentRef.current = true;
        createHomeVideoWatchHistory(rightVideo.storeId, user).catch(e =>
          console.warn('right watch history error', e),
        );
      }
    },
    [rightDuration, rightVideo, user, getTotalDurationSec],
  );

  const handlePressVideo = useCallback(
    (video?: HomeVideoThumbnail) => {
      if (!video) return;
      if (!video.storeId || !video.placeId) {
        console.warn('storeId/placeId 없음');
        return;
      }

      const usernameParam = user?.username ?? '';
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

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>영상을 불러오는 중...</Text>
        </View>
      )}

      {errorMsg && !loading && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {hasAnyVideo ? (
        <View style={styles.miniRow}>
          <MiniVideoCard
            video={leftVideo}
            playReady={leftPlayReady}
            isPlaying={shouldPlay && !!leftVideo}
            currentTime={leftTime}
            duration={leftDuration}
            onLoad={data => setLeftDuration(data.duration)}
            onProgress={handleLeftProgress}
            onError={() => {}}
            onPress={() => handlePressVideo(leftVideo)}
          />
          <MiniVideoCard
            video={rightVideo}
            playReady={rightPlayReady}
            isPlaying={shouldPlay && !!rightVideo}
            currentTime={rightTime}
            duration={rightDuration}
            onLoad={data => setRightDuration(data.duration)}
            onProgress={handleRightProgress}
            onError={() => {}}
            onPress={() => handlePressVideo(rightVideo)}
          />
        </View>
      ) : !loading ? (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>아직 보여줄 영상이 없어요</Text>
          <Text style={styles.emptySub}>
            새로운 맛집 방문을 기록하면 여기에서 바로 볼 수 있어요.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default HomeVideoPreviewRow;

const styles = StyleSheet.create({
  previewContainer: {
    paddingHorizontal: 4,
    marginBottom: 20,
    paddingTop: 24,
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
    fontSize: 24,
    fontWeight: '700',
  },
  refreshIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  loadingText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#666',
  },
  errorRow: {
    marginBottom: 6,
  },
  errorText: {
    color: '#d9534f',
    fontSize: 12,
  },

  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  miniCard: {
    width: '48%',
  },
  miniCardEmpty: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
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
    color: '#888',
    textAlign: 'center',
  },

  miniVideoWrapper: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
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
    color: '#fff',
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
    color: '#fff',
  },
  bottomAddressText: {
    marginTop: 2,
    fontSize: 11,
    color: '#e6e6e6',
  },

  miniProgressBarBackground: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    backgroundColor: '#4a90e2',
  },

  emptyStateBox: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
});
