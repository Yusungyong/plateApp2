import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Animated, Platform } from 'react-native';
import Video from 'react-native-video';
import { EnginePlayerVM } from '../hooks/useTwoPlayerVideoEngine';

type Props = {
  a: EnginePlayerVM;
  b: EnginePlayerVM;
  screenHeight: number;

  globalPaused: boolean;
  enablePrebuffer?: boolean;
};

const VideoUnderlay: React.FC<Props> = ({
  a,
  b,
  screenHeight,
  globalPaused,
  enablePrebuffer = true,
}) => {
  const aRef = useRef<Video>(null);
  const bRef = useRef<Video>(null);

  const bufferConfig = useMemo(
    () => ({
      minBufferMs: 3000,
      maxBufferMs: 15000,
      bufferForPlaybackMs: 250,
      bufferForPlaybackAfterRebufferMs: 500,
    }),
    [],
  );

  const safeSeek0 = (ref: React.RefObject<Video>) => {
    try {
      ref.current?.seek(0);
    } catch {}
  };

  const renderPlayer = (vm: EnginePlayerVM, refObj: React.RefObject<Video>) => {
    const isActive = vm.muted === false; // 엔진에서 active면 muted=false

    /**
     * ✅ 핵심:
     * - 비활성(preload)은 ready 되기 전까지만 "무음 재생"으로 버퍼 채움
     * - ready 순간 seek(0)으로 시작점 고정
     * - ready 이후엔 즉시 멈춰서(정지) 진행되지 않게 함
     */
    const shouldPrebuffer =
      enablePrebuffer &&
      !globalPaused &&
      !isActive &&
      !vm.state.ready; // ready 될 때까지만

    const paused = shouldPrebuffer ? false : vm.paused;

    // 소리 완전 차단 (preload는 무조건 무음)
    const muted = isActive ? false : true;
    const volume = isActive ? 1.0 : 0.0;

    // preload는 반복할 필요 없음(버퍼만 채우면 됨)
    const repeat = isActive;

    return vm.uri && vm.index >= 0 ? (
      <Video
        ref={refObj}
        source={{ uri: vm.uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        paused={paused}
        repeat={repeat}
        muted={muted}
        volume={volume}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="obey"
        progressUpdateInterval={500}
        disableAudioSessionManagement={true}
        poster={vm.poster}
        posterResizeMode="cover"
        bufferConfig={bufferConfig}
        automaticallyWaitsToMinimizeStalling={Platform.OS === 'ios' ? false : undefined}
        preferredForwardBufferDuration={Platform.OS === 'ios' ? 0 : undefined}
        onLoadStart={vm.onLoadStart}
        onLoad={vm.onLoad}
        onProgress={vm.onProgress}
        onBuffer={vm.onBuffer}
        onReadyForDisplay={() => {
          vm.onReadyForDisplay();

          // ✅ preload ready 되는 순간 0초로 고정
          if (!isActive) {
            safeSeek0(refObj);
          }
        }}
        onError={vm.onError}
      />
    ) : null;
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Player B */}
      <Animated.View
        style={[
          styles.videoLayer,
          { height: screenHeight, transform: [{ translateY: b.translateY }] },
        ]}
      >
        {renderPlayer(b, bRef)}
      </Animated.View>

      {/* Player A */}
      <Animated.View
        style={[
          styles.videoLayer,
          { height: screenHeight, transform: [{ translateY: a.translateY }] },
        ]}
      >
        {renderPlayer(a, aRef)}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  videoLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
  },
});

export default React.memo(VideoUnderlay);
