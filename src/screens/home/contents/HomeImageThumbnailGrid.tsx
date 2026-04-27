// src/screens/Home/contents/HomeImageThumbnailGrid.tsx
import React, { memo, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { buildFeedImageUrl } from '../../../api/homeImageApi';
import type { HomeImageThumbnailGridProps, HomeImageThumbnail } from '../types';
import { styles } from '../styles/homeImageThumbnailStyles';
import { createLogger } from '../../../utils/logger';
import FallbackImage from '../../../components/common/FallbackImage';

const logger = createLogger('[HomeImageThumbnailGrid]');

const ThumbnailItem = memo<{
  item: HomeImageThumbnail;
  onPress?: (item: HomeImageThumbnail) => void;
}>(({ item, onPress }) => {
  const uri = buildFeedImageUrl(item.thumbFileName);

  useEffect(() => {
    if (uri) {
      logger.debug('image thumbnail resolved', {
        feedNo: item.feedNo,
        originalThumbFileName: item.thumbFileName,
        storeName: item.storeName,
        createdAt: item.createdAt,
        uri,
      });
    } else {
      logger.warn('image thumbnail missing', {
        feedNo: item.feedNo,
        originalThumbFileName: item.thumbFileName,
        storeName: item.storeName,
        createdAt: item.createdAt,
      });
    }
  }, [item.createdAt, item.feedNo, item.storeName, item.thumbFileName, uri]);

  return (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.85}
      onPress={() => onPress?.(item)}
    >
      <FallbackImage
        uri={uri}
        style={styles.img}
        resizeMode="cover"
        placeholderText="이미지 없음"
        onError={(event) => {
          logger.warn('image thumbnail load failed', {
            feedNo: item.feedNo,
            uri,
            error: event.nativeEvent,
          });
        }}
      />

      {!!item.storeName && (
        <View style={styles.caption}>
          <Text style={styles.captionText} numberOfLines={1}>
            {item.storeName}
          </Text>
        </View>
      )}

      {(item.imageCount ?? 0) > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{(item.imageCount ?? 0) - 1}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

ThumbnailItem.displayName = 'ThumbnailItem';

const LoadingState = memo(() => (
  <View style={styles.stateBox}>
    <ActivityIndicator />
    <Text style={styles.stateText}>불러오는 중...</Text>
  </View>
));

LoadingState.displayName = 'LoadingState';

const ErrorState = memo<{ message: string; onRetry: () => void }>(
  ({ message, onRetry }) => (
    <View style={styles.stateBox}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  )
);

ErrorState.displayName = 'ErrorState';

const EmptyState = memo(() => (
  <View style={styles.stateBox}>
    <Text style={styles.stateText}>표시할 이미지 피드가 없어요.</Text>
  </View>
));

EmptyState.displayName = 'EmptyState';

const HomeImageThumbnailGrid: React.FC<HomeImageThumbnailGridProps> = ({
  items,
  loading,
  errorMsg,
  onReload,
  onPressItem,
  showHeader = true,
}) => {
  const latestFour = useMemo(() => (items ?? []).slice(0, 4), [items]);
  const latestThumbs = useMemo(
    () =>
      latestFour.map((item) => ({
        feedNo: item.feedNo,
        url: buildFeedImageUrl(item.thumbFileName),
      })),
    [latestFour],
  );

  useEffect(() => {
    latestThumbs.forEach(({ feedNo, url }) => {
      logger.debug('prefetch image thumbnail', {
        feedNo,
        url,
      });
      Image.prefetch(url).catch((error) => {
        logger.warn('image thumbnail prefetch failed', {
          feedNo,
          url,
          error,
        });
      });
    });
  }, [latestThumbs]);
  const renderContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (errorMsg) {
      return <ErrorState message={errorMsg} onRetry={onReload} />;
    }

    if (latestFour.length === 0) {
      return <EmptyState />;
    }

    return (
      <View style={styles.grid}>
        {latestFour.map((it) => (
          <ThumbnailItem key={it.feedNo} item={it} onPress={onPressItem} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 이미지</Text>
          <TouchableOpacity
            onPress={onReload}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.reload}>새로고침</Text>
          </TouchableOpacity>
        </View>
      )}
      {renderContent()}
    </View>
  );
};

export default memo(HomeImageThumbnailGrid);
