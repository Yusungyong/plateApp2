import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View, Text, Dimensions, Image, StyleSheet } from 'react-native';
import { FEED_IMAGE_BUCKET } from '../../../config/buckets';
import type { ImageFeedGroupImageItem, ImageFeedGroupItem } from '../../../api/imageFeedApi';
import ZoomableFeedImage from './ZoomableFeedImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GroupData = {
  group: ImageFeedGroupItem;
  images: ImageFeedGroupImageItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type Props = {
  pageGroupId: string;
  pageData: GroupData | null;
  isActive: boolean;
  uiVisible: boolean;
  onActiveImageIndexChange: (idx: number) => void;
  getSavedImageIndex: (id: string) => number;
  setSavedImageIndex: (id: string, idx: number) => void;
  onLoadMore: (id: string) => void;
};

const joinUrl = (base?: string, path?: string) => {
  if (!path) return null;
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${b}/${p}`;
};

const buildImageUrl = (fileName?: string | null) => {
  if (!fileName) return null;
  if (/^https?:\/\//i.test(fileName)) return fileName;
  return joinUrl(FEED_IMAGE_BUCKET || '', fileName);
};

export default React.memo(function GroupFeedPage({
  pageGroupId,
  pageData,
  isActive,
  uiVisible,
  onActiveImageIndexChange,
  getSavedImageIndex,
  setSavedImageIndex,
  onLoadMore,
}: Props) {
  const images = useMemo(() => pageData?.images ?? [], [pageData]);
  const imageUris = useMemo(
    () =>
      images
        .map((item) => buildImageUrl(item.fileName))
        .filter((uri): uri is string => Boolean(uri)),
    [images],
  );

  const hRef = useRef<FlatList<ImageFeedGroupImageItem>>(null);
  const [hIndex, setHIndex] = useState(() => getSavedImageIndex(pageGroupId));
  const isActiveRef = useRef(isActive);
  const onActiveImageIndexChangeRef = useRef(onActiveImageIndexChange);
  const zoomActiveRef = useRef(false);
  const [isZoomActive, setIsZoomActive] = useState(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    onActiveImageIndexChangeRef.current = onActiveImageIndexChange;
  }, [onActiveImageIndexChange]);

  const handleZoomActiveChange = useCallback((active: boolean) => {
    if (zoomActiveRef.current === active) {
      return;
    }
    zoomActiveRef.current = active;
    setIsZoomActive(active);
  }, []);

  useEffect(() => {
    handleZoomActiveChange(false);
  }, [hIndex, handleZoomActiveChange, isActive, pageGroupId]);

  useEffect(() => {
    if (!isActive) return;
    const target = getSavedImageIndex(pageGroupId);
    setHIndex(target);

    setTimeout(() => {
      try {
        hRef.current?.scrollToIndex({ index: target, animated: false });
      } catch {}
    }, 0);
  }, [isActive, pageGroupId, getSavedImageIndex]);

  useEffect(() => {
    if (!imageUris.length) return;

    const targetIndexes = isActive ? [hIndex, hIndex + 1, hIndex - 1] : [0];
    const uris = targetIndexes
      .map((index) => imageUris[index])
      .filter((uri, index, list): uri is string => Boolean(uri) && list.indexOf(uri) === index);

    uris.forEach((uri) => {
      Image.prefetch(uri).catch(() => undefined);
    });
  }, [hIndex, imageUris, isActive]);

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
      setSavedImageIndex(pageGroupId, v.index);
      if (isActiveRef.current) onActiveImageIndexChangeRef.current(v.index);
    }
  }).current;

  const renderImage = useCallback(({ item, index }: { item: ImageFeedGroupImageItem; index: number }) => {
    const uri = buildImageUrl(item.fileName);
    if (!uri) {
      return (
        <View style={styles.emptyImage}>
          <Text style={styles.emptyImageText}>이미지 없음</Text>
        </View>
      );
    }
    return (
      <ZoomableFeedImage
        uri={uri}
        style={styles.image}
        resizeMode="cover"
        placeholderText="이미지 없음"
        imageProps={{ progressiveRenderingEnabled: true, fadeDuration: 0 }}
        resetKey={`${pageGroupId}-${index}-${uri}`}
        onZoomActiveChange={index === hIndex ? handleZoomActiveChange : undefined}
      />
    );
  }, [hIndex, handleZoomActiveChange, pageGroupId]);

  const hasMore = pageData?.hasMore ?? false;

  if (!uiVisible) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={hRef}
        data={images}
        horizontal
        pagingEnabled
        scrollEnabled={!isZoomActive}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => `${item.feedId ?? 'feed'}-${idx}`}
        renderItem={renderImage}
        extraData={hIndex}
        getItemLayout={hGetItemLayout}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={true}
        viewabilityConfig={hViewabilityConfig}
        onViewableItemsChanged={onHViewableItemsChanged}
        onEndReached={() => {
          if (hasMore) {
            onLoadMore(pageGroupId);
          }
        }}
        onEndReachedThreshold={0.7}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  emptyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageText: {
    color: '#fff',
  },
  footerLoading: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
