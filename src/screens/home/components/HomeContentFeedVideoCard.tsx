import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type { HomeContentFeedVideoItem } from '../mockContentFeedData';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import HomeContentFeedCardFrame from './HomeContentFeedCardFrame';

type Props = {
  item: HomeContentFeedVideoItem;
  mediaWidth: number;
  likePending?: boolean;
  onPressLike?: (() => void) | null;
  onPressComment?: (() => void) | null;
  onPressOpen?: (() => void) | null;
};

const HomeContentFeedVideoCard: React.FC<Props> = ({
  item,
  mediaWidth,
  likePending = false,
  onPressLike = null,
  onPressComment = null,
  onPressOpen = null,
}) => {
  const mediaHeight = useMemo(
    () =>
      Math.min(480, Math.max(280, mediaWidth / Math.max(item.aspectRatio, 0.68))),
    [item.aspectRatio, mediaWidth],
  );

  const media = (
    <View style={[styles.videoFrame, { height: mediaHeight }]}>
      <Image
        source={{ uri: item.posterUrl }}
        style={styles.videoPoster}
        resizeMode="cover"
      />
      <View style={styles.videoOverlayTop}>
        <View style={styles.videoDurationPill}>
          <Text style={styles.videoDurationText}>{item.durationLabel}</Text>
        </View>
      </View>
      <View style={styles.videoOverlayBottom}>
        <View style={styles.videoPlayBadge}>
          <Icon name="play" size={14} color={HOME_COLORS.textOnDark} />
          <Text style={styles.videoPlayText}>재생</Text>
        </View>
      </View>
    </View>
  );

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

export default memo(HomeContentFeedVideoCard);

const styles = StyleSheet.create({
  videoFrame: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: HOME_COLORS.inkSoft,
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlayTop: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  videoDurationPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: HOME_RADII.badge,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  videoOverlayBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  videoPlayBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: HOME_RADII.badge,
    backgroundColor: 'rgba(16,16,16,0.52)',
  },
  videoPlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.textOnDark,
  },
});
