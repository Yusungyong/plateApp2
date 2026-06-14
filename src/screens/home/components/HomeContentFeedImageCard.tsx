import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { HomeContentFeedImageItem } from '../mockContentFeedData';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import HomeContentFeedCardFrame from './HomeContentFeedCardFrame';

type Props = {
  item: HomeContentFeedImageItem;
  mediaWidth: number;
  likePending?: boolean;
  onPressLike?: (() => void) | null;
  onPressComment?: (() => void) | null;
  onPressOpen?: (() => void) | null;
};

const HomeContentFeedImageCard: React.FC<Props> = ({
  item,
  mediaWidth,
  likePending = false,
  onPressLike = null,
  onPressComment = null,
  onPressOpen = null,
}) => {
  const media = useMemo(() => {
    const first = item.images[0];
    const second = item.images[1];
    const third = item.images[2];
    const totalImages = Math.max(item.imageCount ?? item.images.length, item.images.length);
    const primaryHeight = Math.min(
      450,
      Math.max(240, mediaWidth / Math.max(first.aspectRatio, 0.72)),
    );

    if (!second) {
      return (
        <View>
          <Image
            source={{ uri: first.imageUrl }}
            style={[styles.primaryImage, { height: primaryHeight }]}
            resizeMode="cover"
          />
          {totalImages > 1 ? (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>사진 {totalImages}장</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.mosaicShell}>
        <View style={styles.imageCountBadge}>
          <Text style={styles.imageCountText}>사진 {totalImages}장</Text>
        </View>
        <Image
          source={{ uri: first.imageUrl }}
          style={[styles.mosaicPrimary, { height: primaryHeight }]}
          resizeMode="cover"
        />
        <View style={styles.mosaicSideColumn}>
          <Image
            source={{ uri: second.imageUrl }}
            style={styles.mosaicSideImage}
            resizeMode="cover"
          />
          {third ? (
            <View style={styles.mosaicTailWrap}>
              <Image
                source={{ uri: third.imageUrl }}
                style={styles.mosaicSideImage}
                resizeMode="cover"
              />
              {totalImages > 3 ? (
                <View style={styles.mosaicCountOverlay}>
                  <Text style={styles.mosaicCountText}>
                    +{totalImages - 2}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View
              style={[styles.mosaicSideImage, styles.mosaicSidePlaceholder]}
            />
          )}
        </View>
      </View>
    );
  }, [item.imageCount, item.images, mediaWidth]);

  return (
    <HomeContentFeedCardFrame
      item={item}
      media={media}
      likePending={likePending}
      onPressLike={onPressLike}
      onPressComment={onPressComment}
      onPressOpen={onPressOpen}
    />
  );
};

export default memo(HomeContentFeedImageCard);

const styles = StyleSheet.create({
  primaryImage: {
    width: '100%',
    borderRadius: 20,
  },
  mosaicShell: {
    flexDirection: 'row',
    gap: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 2,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: HOME_RADII.badge,
    backgroundColor: 'rgba(16,16,16,0.62)',
  },
  imageCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
  mosaicPrimary: {
    flex: 1.4,
    borderRadius: 20,
  },
  mosaicSideColumn: {
    flex: 0.95,
    gap: 8,
  },
  mosaicSideImage: {
    flex: 1,
    minHeight: 112,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  mosaicSidePlaceholder: {
    opacity: 0.4,
  },
  mosaicTailWrap: {
    flex: 1,
  },
  mosaicCountOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(15,15,15,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mosaicCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
});
