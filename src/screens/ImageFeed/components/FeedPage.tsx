// src/screens/ImageFeed/components/FeedPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';
import Config from 'react-native-config';
import type { ImageFeedViewerResponse } from '../../../api/imageFeedApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_BASE_URL = Config.FEED_IMAGE_BUCKET ?? '';

const joinUrl = (base?: string, path?: string) => {
  if (!path) return null;
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${b}/${p}`;
};

type Props = {
  pageFeedId: number;
  isActive: boolean;
  uiVisible: boolean;

  getPageData: (id: number) => ImageFeedViewerResponse | null;

  onTap: () => void;
  onShowUi: () => void;

  onActiveImageIndexChange: (idx: number) => void;

  getSavedImageIndex: (id: number) => number;
  setSavedImageIndex: (id: number, idx: number) => void;
};

export default React.memo(function FeedPage({
  pageFeedId,
  isActive,
  uiVisible,
  getPageData,
  onTap,
  onShowUi,
  onActiveImageIndexChange,
  getSavedImageIndex,
  setSavedImageIndex,
}: Props) {
  const pageData = getPageData(pageFeedId);
  const images = pageData?.images ?? [];

  const hRef = useRef<FlatList<ImageFeedViewerResponse['images'][number]>>(null);
  const [hIndex, setHIndex] = useState(() => getSavedImageIndex(pageFeedId));

  useEffect(() => {
    if (!isActive) return;
    const target = getSavedImageIndex(pageFeedId);
    setHIndex(target);

    setTimeout(() => {
      try {
        hRef.current?.scrollToIndex({ index: target, animated: false });
      } catch {}
    }, 0);
  }, [isActive, pageFeedId, getSavedImageIndex]);

  const hGetItemLayout = useCallback(
    (_: any, i: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i }),
    [],
  );

  const hViewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60 }), []);
  const onHViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems?.length) return;
    const v = viewableItems[0];
    if (typeof v?.index === 'number') {
      setHIndex(v.index);
      setSavedImageIndex(pageFeedId, v.index);
      if (isActive) onActiveImageIndexChange(v.index);
      onShowUi();
    }
  }).current;

  const renderImage = useCallback(
    ({ item }: { item: any }) => {
      const uri = joinUrl(IMAGE_BASE_URL, item.fileName);
      return (
        <TouchableOpacity activeOpacity={1} onPress={onTap} style={styles.page}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.center}>
              <Text style={styles.dim}>이미지 경로가 없어요</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [onTap],
  );

  const dots = useMemo(() => {
    const total = images.length;
    if (total <= 1) return { items: [0], activeLocalIndex: 0, showLeftMore: false, showRightMore: false };

    const maxDots = 9;
    if (total <= maxDots) {
      return {
        items: Array.from({ length: total }, (_, i) => i),
        activeLocalIndex: hIndex,
        showLeftMore: false,
        showRightMore: false,
      };
    }

    const half = Math.floor(maxDots / 2);
    let start = hIndex - half;
    let end = hIndex + half;

    if (start < 0) {
      start = 0;
      end = start + (maxDots - 1);
    }
    if (end > total - 1) {
      end = total - 1;
      start = end - (maxDots - 1);
    }

    const items = Array.from({ length: end - start + 1 }, (_, k) => start + k);
    return {
      items,
      activeLocalIndex: hIndex - start,
      showLeftMore: start > 0,
      showRightMore: end < total - 1,
    };
  }, [images.length, hIndex]);

  if (!pageData) {
    return (
      <TouchableOpacity activeOpacity={1} onPress={onTap} style={styles.page}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>피드 불러오는 중…</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.page}>
      <FlatList
        ref={hRef}
        data={images}
        keyExtractor={(it, i) => `${pageFeedId}-${i}-${it.fileName}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderImage}
        getItemLayout={hGetItemLayout}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        nestedScrollEnabled
        removeClippedSubviews={false}
        viewabilityConfig={hViewabilityConfig}
        onViewableItemsChanged={onHViewableItemsChanged}
      />

      {uiVisible && isActive && images.length > 1 && (
        <View style={styles.dotsBottom}>
          <View style={styles.dotsWrap}>
            {dots.showLeftMore && <View style={[styles.dot, styles.dotGhost]} />}
            {dots.items.map((absIdx, localIdx) => {
              const active = localIdx === dots.activeLocalIndex;
              return <View key={`${pageFeedId}-${absIdx}`} style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />;
            })}
            {dots.showRightMore && <View style={[styles.dot, styles.dotGhost]} />}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  page: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dim: { color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  dotsBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 114,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.95)' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  dotGhost: { backgroundColor: 'rgba(255,255,255,0.18)' },
});
