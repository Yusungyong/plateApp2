// src/screens/Home/contents/HomeImageThumbnailGrid.tsx
import React, { memo, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  ImageStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { buildFeedImageUrl } from '../../../api/homeImageApi';
import type { HomeImageThumbnailGridProps, HomeImageThumbnail } from '../types';
import { styles } from '../styles/homeImageThumbnailStyles';
import FallbackImage from '../../../components/common/FallbackImage';

const ThumbnailItem = memo<{
  item: HomeImageThumbnail;
  onPress?: (item: HomeImageThumbnail) => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  captionStyle?: StyleProp<ViewStyle>;
  captionTextStyle?: StyleProp<TextStyle>;
  badgeStyle?: StyleProp<ViewStyle>;
  badgeTextStyle?: StyleProp<TextStyle>;
  titleLines?: number;
  containerStyle?: StyleProp<ViewStyle>;
}>(({
  item,
  onPress,
  style,
  imageStyle,
  captionStyle,
  captionTextStyle,
  badgeStyle,
  badgeTextStyle,
  titleLines = 1,
  containerStyle,
}) => {
  const uri = buildFeedImageUrl(item.thumbFileName);
  const pressScale = useRef(new Animated.Value(1)).current;

  const animateScale = useCallback((toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      tension: 280,
      friction: 22,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  return (
    <Animated.View style={[styles.cell, style, containerStyle]}>
      <Animated.View style={[styles.cellInner, { transform: [{ scale: pressScale }] }]}>
        <TouchableOpacity
          style={styles.cellTouch}
          activeOpacity={0.85}
          onPress={() => onPress?.(item)}
          onPressIn={() => animateScale(0.988)}
          onPressOut={() => animateScale(1)}
        >
          <FallbackImage
            uri={uri}
            style={[styles.img, imageStyle]}
            resizeMode="cover"
            placeholderText="이미지 없음"
          />

          {!!item.storeName && (
            <View style={[styles.caption, captionStyle]}>
              <Text style={[styles.captionText, captionTextStyle]} numberOfLines={titleLines}>
                {item.storeName}
              </Text>
            </View>
          )}

          {(item.imageCount ?? 0) > 1 && (
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>+{(item.imageCount ?? 0) - 1}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
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
  hasLoadedOnce = false,
  variant = 'default',
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
  const prefetchedThumbsRef = useRef<Set<string>>(new Set());
  const shouldShowLoadingState = Boolean(loading && latestFour.length === 0 && !hasLoadedOnce);
  const shouldShowErrorState = Boolean(errorMsg && latestFour.length === 0);
  const isEditorial = variant === 'editorial';
  const revealAnims = useRef([
    new Animated.Value(isEditorial ? 0 : 1),
    new Animated.Value(isEditorial ? 0 : 1),
    new Animated.Value(isEditorial ? 0 : 1),
    new Animated.Value(isEditorial ? 0 : 1),
  ]).current;
  const latestSignature = useMemo(
    () => latestFour.map((item) => item.feedNo).join('-'),
    [latestFour],
  );

  useEffect(() => {
    latestThumbs.forEach(({ url }) => {
      if (!url || prefetchedThumbsRef.current.has(url)) {
        return;
      }
      prefetchedThumbsRef.current.add(url);
      Image.prefetch(url).catch(() => {
        prefetchedThumbsRef.current.delete(url);
      });
    });
  }, [latestThumbs]);

  useEffect(() => {
    if (!isEditorial) {
      revealAnims.forEach((value) => value.setValue(1));
      return;
    }

    revealAnims.forEach((value) => value.setValue(0));
    Animated.stagger(
      80,
      latestFour.map((_, index) =>
        Animated.timing(revealAnims[index], {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [isEditorial, latestFour, latestSignature, revealAnims]);

  const getRevealStyle = useCallback(
    (index: number) => ({
      opacity: revealAnims[index],
      transform: [
        {
          translateY: revealAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          }),
        },
        {
          scale: revealAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1],
          }),
        },
      ],
    }),
    [revealAnims],
  );

  const renderEditorialContent = () => {
    const [featuredItem, stackTopItem, stackBottomItem, wideItem] = latestFour;

    if (latestFour.length === 1) {
      return (
        <ThumbnailItem
          item={featuredItem}
          onPress={onPressItem}
          containerStyle={getRevealStyle(0)}
          style={styles.editorialSingleCell}
          captionStyle={styles.editorialCaption}
          captionTextStyle={styles.editorialCaptionText}
          badgeStyle={styles.editorialBadge}
          titleLines={2}
        />
      );
    }

    if (latestFour.length === 2) {
      return (
        <View style={styles.editorialDualRow}>
          {latestFour.map((item, index) => (
            <ThumbnailItem
              key={item.feedNo}
              item={item}
              onPress={onPressItem}
              containerStyle={getRevealStyle(index)}
              style={styles.editorialDualCell}
              captionStyle={styles.editorialCaption}
              captionTextStyle={styles.editorialCaptionText}
              badgeStyle={styles.editorialBadge}
              titleLines={2}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.editorialGrid}>
        <View style={styles.editorialFeatureRow}>
          {featuredItem ? (
            <ThumbnailItem
              item={featuredItem}
              onPress={onPressItem}
              containerStyle={getRevealStyle(0)}
              style={styles.editorialFeatureCell}
              captionStyle={styles.editorialFeatureCaption}
              captionTextStyle={styles.editorialFeatureCaptionText}
              badgeStyle={styles.editorialBadge}
              badgeTextStyle={styles.editorialBadgeText}
              titleLines={2}
            />
          ) : null}
          <View style={styles.editorialStackColumn}>
            {stackTopItem ? (
              <ThumbnailItem
                item={stackTopItem}
                onPress={onPressItem}
                containerStyle={getRevealStyle(1)}
                style={styles.editorialStackCell}
                captionStyle={styles.editorialCaption}
                captionTextStyle={styles.editorialCaptionText}
                badgeStyle={styles.editorialBadge}
                titleLines={2}
              />
            ) : null}
            {stackBottomItem ? (
              <ThumbnailItem
                item={stackBottomItem}
                onPress={onPressItem}
                containerStyle={getRevealStyle(2)}
                style={styles.editorialStackCell}
                captionStyle={styles.editorialCaption}
                captionTextStyle={styles.editorialCaptionText}
                badgeStyle={styles.editorialBadge}
                titleLines={2}
              />
            ) : null}
          </View>
        </View>
        {wideItem ? (
          <ThumbnailItem
            item={wideItem}
            onPress={onPressItem}
            containerStyle={getRevealStyle(3)}
            style={styles.editorialWideCell}
            captionStyle={styles.editorialWideCaption}
            captionTextStyle={styles.editorialWideCaptionText}
            badgeStyle={styles.editorialBadge}
            titleLines={2}
          />
        ) : null}
      </View>
    );
  };

  const renderContent = () => {
    if (shouldShowLoadingState) {
      return <LoadingState />;
    }

    if (shouldShowErrorState) {
      return <ErrorState message={errorMsg ?? '이미지를 불러오지 못했어요.'} onRetry={onReload} />;
    }

    if (latestFour.length === 0) {
      return <EmptyState />;
    }

    return (
      isEditorial ? renderEditorialContent() : (
        <View style={styles.grid}>
          {latestFour.map((it, index) => (
            <ThumbnailItem
              key={it.feedNo}
              item={it}
              onPress={onPressItem}
              containerStyle={getRevealStyle(index)}
            />
          ))}
        </View>
      )
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
