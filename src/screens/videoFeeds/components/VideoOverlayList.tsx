import React from 'react';
import { Animated, StyleSheet } from 'react-native';

type Props<T> = {
  data: T[];
  screenHeight: number;
  onRef: (ref: Animated.FlatList<T> | null) => void;

  renderItem: any;
  keyExtractor: (item: T) => string;
  getItemLayout: (
    data: T[] | null | undefined,
    index: number,
  ) => { length: number; offset: number; index: number };

  onScroll: any;
  onMomentumScrollEnd: any;

  onContentSizeChange?: () => void;
  onScrollToIndexFailed?: (info: any) => void;
};

const VideoOverlayList = <T,>({
  data,
  screenHeight,
  onRef,
  renderItem,
  keyExtractor,
  getItemLayout,
  onScroll,
  onMomentumScrollEnd,
  onContentSizeChange,
  onScrollToIndexFailed,
}: Props<T>) => {
  return (
    <Animated.FlatList
      ref={onRef}
      style={styles.listOverlay}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      pagingEnabled
      snapToInterval={screenHeight}
      disableIntervalMomentum
      snapToAlignment="start"
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      getItemLayout={getItemLayout}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onContentSizeChange={onContentSizeChange}
      onMomentumScrollEnd={onMomentumScrollEnd}
      removeClippedSubviews
      windowSize={5}
      maxToRenderPerBatch={5}
      initialNumToRender={3}
      scrollEventThrottle={16}
      onScroll={onScroll}
    />
  );
};

const styles = StyleSheet.create({
  listOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
});

export default React.memo(VideoOverlayList) as typeof VideoOverlayList;
