import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View, Text, Dimensions } from 'react-native';
import { FEED_IMAGE_BUCKET } from '../../../config/buckets';
import type { ImageFeedGroupImageItem, ImageFeedGroupItem } from '../../../api/imageFeedApi';
import FallbackImage from '../../../components/common/FallbackImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GroupData = {
  group: ImageFeedGroupItem;
  images: ImageFeedGroupImageItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type Props = {
  pageGroupId: string;
  isActive: boolean;
  uiVisible: boolean;
  getPageData: (id: string) => GroupData | null;
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
  isActive,
  uiVisible,
  getPageData,
  onActiveImageIndexChange,
  getSavedImageIndex,
  setSavedImageIndex,
  onLoadMore,
}: Props) {
  const pageData = getPageData(pageGroupId);
  const images = pageData?.images ?? [];

  const hRef = useRef<FlatList<ImageFeedGroupImageItem>>(null);
  const [_hIndex, setHIndex] = useState(() => getSavedImageIndex(pageGroupId));

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
      if (isActive) onActiveImageIndexChange(v.index);
    }
  }).current;

  const renderImage = useCallback(({ item }: { item: ImageFeedGroupImageItem }) => {
    const uri = buildImageUrl(item.fileName);
    if (!uri) {
      return (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>이미지 없음</Text>
        </View>
      );
    }
    return (
      <FallbackImage
        uri={uri}
        style={{ width: SCREEN_WIDTH, height: '100%' }}
        resizeMode="cover"
        placeholderText="이미지 없음"
      />
    );
  }, []);

  const hasMore = pageData?.hasMore ?? false;

  if (!uiVisible) return null;

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <FlatList
        ref={hRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => `${item.feedId ?? 'feed'}-${idx}`}
        renderItem={renderImage}
        getItemLayout={hGetItemLayout}
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
            <View
              style={{
                width: 60,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
});
