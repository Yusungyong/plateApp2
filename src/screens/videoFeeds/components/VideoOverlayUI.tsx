// src/screens/VideoFeed/components/VideoOverlayUI.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ICON_SIZE = 30;

type Props = {
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  showMore?: boolean;
  onPressMore?: () => void;

  onPressLike?: () => void;
  onPressLikeCount?: () => void;
  onPressComment?: () => void;
  onPressMenu?: () => void;
  bottomInset?: number;
};

const VideoOverlayUI: React.FC<Props> = ({
  likeCount = 0,
  commentCount = 0,
  liked = false,
  showMore = false,
  onPressMore,
  onPressLike,
  onPressLikeCount,
  onPressComment,
  onPressMenu,
  bottomInset = 120,
}) => {
  return (
    <View style={[styles.container, { bottom: bottomInset }]} pointerEvents="box-none">
      <View style={styles.panel}>
        {showMore ? (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onPressMore?.();
            }}
            activeOpacity={0.85}
          >
            <Icon name="ellipsis-horizontal" size={ICON_SIZE} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.item} onPress={onPressLike} activeOpacity={0.85}>
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={ICON_SIZE}
            color={liked ? '#ff6b6b' : '#fff'}
          />
          <TouchableOpacity
            onPress={onPressLikeCount}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.count}>{likeCount}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onPressComment}>
          <Icon name="chatbubble-outline" size={ICON_SIZE} color="#fff" />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onPressMenu}>
          <Icon name="restaurant-outline" size={ICON_SIZE} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
  },
  panel: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 28,
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: 20,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  count: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default React.memo(VideoOverlayUI);
