import React, { useCallback, useEffect, useState } from 'react';
import {
  ImageResizeMode,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import FallbackImage from '../../../components/common/FallbackImage';

type FallbackImageProps = React.ComponentProps<typeof FallbackImage>;

type Props = {
  uri: string;
  style: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  placeholderText?: string;
  imageProps?: FallbackImageProps['imageProps'];
  resetKey?: string | number;
  maxScale?: number;
  onTap?: () => void;
  onZoomActiveChange?: (active: boolean) => void;
};

const DEFAULT_MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const ZOOM_ACTIVE_THRESHOLD = 1.02;

const clampValue = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

export default function ZoomableFeedImage({
  uri,
  style,
  resizeMode = 'contain',
  placeholderText = '이미지 없음',
  imageProps,
  resetKey,
  maxScale = DEFAULT_MAX_SCALE,
  onTap,
  onZoomActiveChange,
}: Props) {
  const [isPanEnabled, setIsPanEnabled] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const layoutWidth = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const zoomActive = useSharedValue(false);

  const notifyTap = useCallback(() => {
    onTap?.();
  }, [onTap]);

  const notifyZoomActiveChange = useCallback(
    (active: boolean) => {
      setIsPanEnabled(active);
      onZoomActiveChange?.(active);
    },
    [onZoomActiveChange],
  );

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    zoomActive.value = false;
    notifyZoomActiveChange(false);
  }, [
    notifyZoomActiveChange,
    resetKey,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    zoomActive,
  ]);

  const updateZoomActive = (active: boolean) => {
    'worklet';
    if (zoomActive.value === active) {
      return;
    }
    zoomActive.value = active;
    runOnJS(notifyZoomActiveChange)(active);
  };

  const getBoundX = (nextScale: number) => {
    'worklet';
    return Math.max(0, (layoutWidth.value * nextScale - layoutWidth.value) / 2);
  };

  const getBoundY = (nextScale: number) => {
    'worklet';
    return Math.max(0, (layoutHeight.value * nextScale - layoutHeight.value) / 2);
  };

  const clampTranslateX = (value: number, nextScale: number) => {
    'worklet';
    const boundX = getBoundX(nextScale);
    return clampValue(value, -boundX, boundX);
  };

  const clampTranslateY = (value: number, nextScale: number) => {
    'worklet';
    const boundY = getBoundY(nextScale);
    return clampValue(value, -boundY, boundY);
  };

  const resetZoom = (animated: boolean) => {
    'worklet';
    scale.value = animated ? withTiming(1) : 1;
    translateX.value = animated ? withTiming(0) : 0;
    translateY.value = animated ? withTiming(0) : 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    updateZoomActive(false);
  };

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      layoutWidth.value = event.nativeEvent.layout.width;
      layoutHeight.value = event.nativeEvent.layout.height;
    },
    [layoutHeight, layoutWidth],
  );

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clampValue(savedScale.value * event.scale, 1, maxScale);
      scale.value = nextScale;
      translateX.value = clampTranslateX(translateX.value, nextScale);
      translateY.value = clampTranslateY(translateY.value, nextScale);
      updateZoomActive(nextScale > ZOOM_ACTIVE_THRESHOLD);
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_ACTIVE_THRESHOLD) {
        resetZoom(true);
        return;
      }
      translateX.value = withTiming(clampTranslateX(translateX.value, scale.value));
      translateY.value = withTiming(clampTranslateY(translateY.value, scale.value));
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      updateZoomActive(true);
    });

  const panGesture = Gesture.Pan()
    .enabled(isPanEnabled)
    .minDistance(2)
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= ZOOM_ACTIVE_THRESHOLD) {
        return;
      }
      translateX.value = clampTranslateX(savedTranslateX.value + event.translationX, scale.value);
      translateY.value = clampTranslateY(savedTranslateY.value + event.translationY, scale.value);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      if (scale.value > ZOOM_ACTIVE_THRESHOLD) {
        resetZoom(true);
        return;
      }
      const nextScale = Math.min(DOUBLE_TAP_SCALE, maxScale);
      scale.value = withTiming(nextScale);
      savedScale.value = nextScale;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      updateZoomActive(true);
    });

  const singleTapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(notifyTap)();
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageFrame, animatedImageStyle]}>
          <FallbackImage
            uri={uri}
            style={styles.image}
            resizeMode={resizeMode}
            placeholderText={placeholderText}
            imageProps={imageProps}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  imageFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
