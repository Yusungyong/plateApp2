import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { OnLoadData, OnProgressData } from 'react-native-video';

export type EnginePlayerState = {
  ready: boolean;
  buffering: boolean;
  duration: number;
  time: number;
  error: string | null;
  naturalSize?: {
    width: number;
    height: number;
    orientation?: 'landscape' | 'portrait';
  };
};

const initialPlayerState: EnginePlayerState = {
  ready: false,
  buffering: true,
  duration: 0,
  time: 0,
  error: null,
  naturalSize: undefined,
};

type Params<T> = {
  items: T[];
  screenHeight: number;
  isFocused: boolean;

  getUri: (it?: T) => string | undefined;
  getPoster: (it?: T) => string | undefined;

  uiThrottleMs?: number;
  onIndexSettled?: (index: number) => void;
};

export type SinglePlayerVM = {
  uri?: string;
  poster?: string;
  translateY: Animated.AnimatedSubtraction<number>;
  paused: boolean;
  muted: boolean;
  state: EnginePlayerState;

  onLoadStart: () => void;
  onLoad: (d: OnLoadData) => void;
  onProgress: (d: OnProgressData) => void;
  onBuffer: (m: { isBuffering: boolean }) => void;
  onReadyForDisplay: () => void;
  onError: (e: any) => void;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const DEBUG_VIDEO_FEED = true;

export const useSinglePlayerVideoEngine = <T,>({
  items,
  screenHeight,
  isFocused,
  getUri,
  getPoster,
  uiThrottleMs = 250,
  onIndexSettled,
}: Params<T>) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  const [uri, setUri] = useState<string | undefined>(undefined);
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [state, setState] = useState<EnginePlayerState>(initialPlayerState);

  const [pausedUser, setPausedUser] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressTickRef = useRef(0);
  const lastOffsetYRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (isFocused) setPausedUser(false);
  }, [isFocused]);

  const paused = pausedUser || !isFocused || isTransitioning;

  const setPlayerContent = useCallback(
    (idx: number, it?: T) => {
      const nextUri = it ? getUri(it) : undefined;
      const nextPoster = it ? getPoster(it) : undefined;
      if (DEBUG_VIDEO_FEED) {
        }
      setUri(nextUri);
      setPoster(nextPoster);
      posY.setValue(Math.max(0, idx) * screenHeight);
      setState(initialPlayerState);
    },
    [getPoster, getUri, posY, screenHeight],
  );

  const primeForIndex = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      lastOffsetYRef.current = idx * screenHeight;
      posY.setValue(idx * screenHeight);
    },
    [posY, screenHeight],
  );

  const configureAt = useCallback(
    (idx: number) => {
      const it = items[idx];
      if (DEBUG_VIDEO_FEED) {
        }
      setCurrentIndex(idx);
      lastOffsetYRef.current = idx * screenHeight;
      setPlayerContent(idx, it);
      setIsTransitioning(false);
      onIndexSettled?.(idx);
    },
    [items, onIndexSettled, screenHeight, setPlayerContent],
  );

  const settleByOffset = useCallback(
    (offsetY: number) => {
      if (!items.length) return;
      const nextIndex = clamp(Math.round(offsetY / screenHeight), 0, items.length - 1);
      if (DEBUG_VIDEO_FEED) {
        }
      lastOffsetYRef.current = offsetY;
      setIsTransitioning(false);

      if (nextIndex === currentIndexRef.current) return;
      configureAt(nextIndex);
    },
    [configureAt, items.length, screenHeight],
  );

  const onScrollBegin = useCallback(() => {
    if (DEBUG_VIDEO_FEED) {
      }
    setIsTransitioning(true);
  }, []);

  const settleImmediately = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (DEBUG_VIDEO_FEED) {
        }
      settleByOffset(e.nativeEvent.contentOffset.y);
    },
    [settleByOffset],
  );

  const settleOnDragEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityY = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(velocityY) > 0.05) return;
      if (DEBUG_VIDEO_FEED) {
        }
      settleByOffset(e.nativeEvent.contentOffset.y);
    },
    [settleByOffset],
  );

  const togglePause = useCallback(() => {
    if (!isFocused) return;
    setPausedUser(p => !p);
  }, [isFocused]);

  const updateState = useCallback((patch: Partial<EnginePlayerState>) => {
    setState(s => ({ ...s, ...patch }));
  }, []);

  const onLoadStart = useCallback(() => {
    if (DEBUG_VIDEO_FEED) {
      }
    updateState({ buffering: true, error: null });
  }, [updateState]);

  const onLoad = useCallback(
    (data: OnLoadData) => {
      if (DEBUG_VIDEO_FEED) {
        }
      const width = Number(data.naturalSize?.width ?? 0);
      const height = Number(data.naturalSize?.height ?? 0);
      const orientation = data.naturalSize?.orientation as 'landscape' | 'portrait' | undefined;

      updateState({
        duration: data.duration || 0,
        buffering: false,
        error: null,
        ready: true,
        naturalSize: {
          width,
          height,
          orientation,
        },
      });
    },
    [updateState],
  );

  const onProgress = useCallback(
    (data: OnProgressData) => {
      if (!isFocused) return;
      const now = Date.now();
      if (now - progressTickRef.current < uiThrottleMs) return;
      progressTickRef.current = now;
      updateState({ time: data.currentTime, buffering: false, ready: true, error: null });
    },
    [isFocused, uiThrottleMs, updateState],
  );

  const onBuffer = useCallback(
    (meta: { isBuffering: boolean }) => {
      if (!isFocused) return;
      if (DEBUG_VIDEO_FEED) {
        }
      updateState({ buffering: meta.isBuffering });
    },
    [isFocused, updateState],
  );

  const onReadyForDisplay = useCallback(
    () => {
      if (DEBUG_VIDEO_FEED) {
        }
      updateState({ ready: true, buffering: false, error: null });
    },
    [updateState],
  );

  const onError = useCallback(
    (err: any) => {
      updateState({ buffering: false, error: '영상을 불러오지 못했어요.' });
    },
    [updateState],
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const translateY = Animated.subtract(posY, scrollY);

  const player: SinglePlayerVM = {
    uri,
    poster,
    translateY,
    paused,
    muted: false,
    state,
    onLoadStart,
    onLoad,
    onProgress,
    onBuffer,
    onReadyForDisplay,
    onError,
  };

  const getThumbnailOpacity = useCallback(
    (index: number) => {
      if (index !== currentIndex) return 1;
      const hasStarted = state.time > 0.35;
      const showPoster = !state.ready || state.buffering || !hasStarted;
      return showPoster ? 1 : 0;
    },
    [currentIndex, state.buffering, state.ready, state.time],
  );

  return {
    currentIndex,
    primeForIndex,
    configureAt,
    paused,
    togglePause,
    onScroll,
    onScrollBeginDrag: onScrollBegin,
    onMomentumScrollBegin: onScrollBegin,
    onMomentumScrollEnd: settleImmediately,
    onScrollEndDrag: settleOnDragEnd,
    activeState: state,
    player,
    isTransitioning,
    getThumbnailOpacity,
  };
};
