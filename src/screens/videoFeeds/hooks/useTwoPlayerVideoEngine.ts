import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { OnLoadData, OnProgressData } from 'react-native-video';
import { decideTransition as decideTransitionFn } from './decideTransition';

export type PlayerKey = 'A' | 'B';

export type EnginePlayerState = {
  ready: boolean;
  buffering: boolean;
  duration: number;
  time: number;
  error: string | null;
};

const initialPlayerState: EnginePlayerState = {
  ready: false,
  buffering: true,
  duration: 0,
  time: 0,
  error: null,
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

export type EnginePlayerVM = {
  index: number;
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

export const useTwoPlayerVideoEngine = <T,>({
  items,
  screenHeight,
  isFocused,
  getUri,
  getPoster,
  uiThrottleMs = 250,
  onIndexSettled,
}: Params<T>) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);

  const [aIndex, setAIndex] = useState(0);
  const [bIndex, setBIndex] = useState(-1);

  const [aUri, setAUri] = useState<string | undefined>(undefined);
  const [bUri, setBUri] = useState<string | undefined>(undefined);

  const [aPoster, setAPoster] = useState<string | undefined>(undefined);
  const [bPoster, setBPoster] = useState<string | undefined>(undefined);

  const [activePlayer, setActivePlayer] = useState<PlayerKey>('A');

  const [aState, setAState] = useState<EnginePlayerState>(initialPlayerState);
  const [bState, setBState] = useState<EnginePlayerState>(initialPlayerState);

  const [pausedUser, setPausedUser] = useState(false);

  const aPos = useRef(new Animated.Value(0)).current;
  const bPos = useRef(new Animated.Value(screenHeight)).current;

  const lastOffsetYRef = useRef(0);
  const progressTickRef = useRef(0);

  useEffect(() => {
    if (!isFocused) setPausedUser(true);
    else setPausedUser(false);
  }, [isFocused]);

  const paused = pausedUser || !isFocused;

  const resetState = useCallback((key: PlayerKey) => {
    if (key === 'A') setAState(initialPlayerState);
    else setBState(initialPlayerState);
  }, []);

  const setPlayerContent = useCallback(
    (key: PlayerKey, idx: number, it?: T) => {
      const uri = it ? getUri(it) : undefined;
      const poster = it ? getPoster(it) : undefined;

      if (key === 'A') {
        setAIndex(idx);
        setAUri(uri);
        setAPoster(poster);
        aPos.setValue(Math.max(0, idx) * screenHeight);
      } else {
        setBIndex(idx);
        setBUri(uri);
        setBPoster(poster);
        bPos.setValue(Math.max(0, idx) * screenHeight);
      }

      resetState(key);
    },
    [aPos, bPos, getPoster, getUri, resetState, screenHeight],
  );

  const primeForIndex = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      lastOffsetYRef.current = idx * screenHeight;
    },
    [screenHeight],
  );

  const configureAt = useCallback(
    (curIdx: number, preloadIdx: number) => {
      const curItem = items[curIdx];
      const preItem = preloadIdx >= 0 ? items[preloadIdx] : undefined;

      setActivePlayer('A');
      setCurrentIndex(curIdx);
      lastOffsetYRef.current = curIdx * screenHeight;

      setPlayerContent('A', curIdx, curItem);

      if (preloadIdx >= 0 && preItem) setPlayerContent('B', preloadIdx, preItem);
      else setPlayerContent('B', -1, undefined);

      onIndexSettled?.(curIdx);
    },
    [items, onIndexSettled, screenHeight, setPlayerContent],
  );

  const updateState = useCallback((key: PlayerKey, patch: Partial<EnginePlayerState>) => {
    if (key === 'A') setAState(s => ({ ...s, ...patch }));
    else setBState(s => ({ ...s, ...patch }));
  }, []);

  const onLoadStart = useCallback(
    (key: PlayerKey) => updateState(key, { buffering: true, error: null }),
    [updateState],
  );

  const onLoad = useCallback(
    (key: PlayerKey, data: OnLoadData) => {
      updateState(key, {
        duration: data.duration || 0,
        buffering: false,
        error: null,
      });
    },
    [updateState],
  );

  const onProgress = useCallback(
    (key: PlayerKey, data: OnProgressData) => {
      if (!isFocused) return;
      if (activePlayer !== key) return;

      const now = Date.now();
      if (now - progressTickRef.current < uiThrottleMs) return;
      progressTickRef.current = now;

      updateState(key, { time: data.currentTime });
    },
    [activePlayer, isFocused, uiThrottleMs, updateState],
  );

  const onBuffer = useCallback(
    (key: PlayerKey, meta: { isBuffering: boolean }) => {
      if (!isFocused) return;
      if (activePlayer !== key) return;
      updateState(key, { buffering: meta.isBuffering });
    },
    [activePlayer, isFocused, updateState],
  );

  const onReadyForDisplay = useCallback(
    (key: PlayerKey) => updateState(key, { ready: true }),
    [updateState],
  );

  const onError = useCallback(
    (key: PlayerKey, err: any) => {
      console.warn(`[VideoFeed] ${key} error`, err);
      updateState(key, { buffering: false, error: '영상을 불러오지 못했어요.' });
    },
    [updateState],
  );

  const settleByOffset = useCallback(
    (offsetY: number) => {
      if (!items.length) return;

      const { nextIndex, preloadIndex, transition, nextLastOffsetY } = decideTransitionFn({
        offsetY,
        lastOffsetY: lastOffsetYRef.current,
        screenHeight,
        listLength: items.length,
        aIndex,
        bIndex,
      });

      lastOffsetYRef.current = nextLastOffsetY;
      setCurrentIndex(nextIndex);

      if (transition === 'A_CURRENT') {
        setActivePlayer('A');

        if (preloadIndex >= 0 && preloadIndex !== aIndex) {
          setPlayerContent('B', preloadIndex, items[preloadIndex]);
        } else {
          setPlayerContent('B', -1, undefined);
        }

        onIndexSettled?.(nextIndex);
        return;
      }

      if (transition === 'B_PROMOTE') {
        setActivePlayer('B');

        if (preloadIndex >= 0 && preloadIndex !== bIndex) {
          setPlayerContent('A', preloadIndex, items[preloadIndex]);
        } else {
          setPlayerContent('A', -1, undefined);
        }

        onIndexSettled?.(nextIndex);
        return;
      }

      configureAt(nextIndex, preloadIndex);
    },
    [aIndex, bIndex, configureAt, items, onIndexSettled, screenHeight, setPlayerContent],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      settleByOffset(e.nativeEvent.contentOffset.y);
    },
    [settleByOffset],
  );

  const togglePause = useCallback(() => {
    if (!isFocused) return;
    setPausedUser(p => !p);
  }, [isFocused]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const aTranslateY = Animated.subtract(aPos, scrollY);
  const bTranslateY = Animated.subtract(bPos, scrollY);

  const aPaused = paused || activePlayer !== 'A' || !aUri || aIndex < 0;
  const bPaused = paused || activePlayer !== 'B' || !bUri || bIndex < 0;

  const getThumbnailOpacity = useCallback(
    (index: number) => {
      const underlayReady =
        (index === aIndex && aIndex >= 0 && aState.ready) ||
        (index === bIndex && bIndex >= 0 && bState.ready);

      return underlayReady ? 0 : 1;
    },
    [aIndex, aState.ready, bIndex, bState.ready],
  );

  const activeState = activePlayer === 'A' ? aState : bState;

  const aPlayer: PlayerViewModel = {
    index: aIndex,
    uri: aUri,
    poster: aPoster,
    translateY: aTranslateY,
    paused: aPaused,
    muted: activePlayer !== 'A',
    state: aState,
    onLoadStart: () => onLoadStart('A'),
    onLoad: d => onLoad('A', d),
    onProgress: d => onProgress('A', d),
    onBuffer: m => onBuffer('A', m),
    onReadyForDisplay: () => onReadyForDisplay('A'),
    onError: e => onError('A', e),
  };

  const bPlayer: PlayerViewModel = {
    index: bIndex,
    uri: bUri,
    poster: bPoster,
    translateY: bTranslateY,
    paused: bPaused,
    muted: activePlayer !== 'B',
    state: bState,
    onLoadStart: () => onLoadStart('B'),
    onLoad: d => onLoad('B', d),
    onProgress: d => onProgress('B', d),
    onBuffer: m => onBuffer('B', m),
    onReadyForDisplay: () => onReadyForDisplay('B'),
    onError: e => onError('B', e),
  };

  return {
    currentIndex,
    primeForIndex,
    configureAt,

    paused,
    togglePause,

    onScroll,
    onMomentumScrollEnd,

    activePlayer,
    activeState,
    aPlayer,
    bPlayer,

    getThumbnailOpacity,
  };
};
