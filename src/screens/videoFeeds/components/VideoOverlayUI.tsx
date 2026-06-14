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
  likeCount,
  commentCount,
  liked = false,
  showMore = false,
  onPressMore,
  onPressLike,
  onPressLikeCount,
  onPressComment,
  onPressMenu,
  bottomInset = 120,
}) => {
  const hasLikeCount = typeof likeCount === 'number';
  const hasCommentCount = typeof commentCount === 'number';

  return (
    <View style={[styles.container, { bottom: bottomInset }]} pointerEvents="box-none">
      <View style={styles.panel}>
        {showMore ? (
          <TouchableOpacity
            style={styles.item}
            onPress={onPressMore}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="ellipsis-horizontal" size={ICON_SIZE} color="#fff" />
            <Text style={styles.label}>더보기</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.item}>
          <TouchableOpacity
            onPress={onPressLike}
            activeOpacity={0.85}
            style={styles.iconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon
              name={liked ? 'heart' : 'heart-outline'}
              size={ICON_SIZE}
              color={liked ? '#ff7d75' : '#fff'}
            />
          </TouchableOpacity>
          {hasLikeCount ? (
            <TouchableOpacity
              onPress={onPressLikeCount}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.count}>{likeCount}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.label}>좋아요</Text>
        </View>

        <TouchableOpacity
          style={styles.item}
          onPress={onPressComment}
          activeOpacity={0.85}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="chatbubble-outline" size={ICON_SIZE} color="#fff" />
          {hasCommentCount ? <Text style={styles.count}>{commentCount}</Text> : null}
          <Text style={styles.label}>댓글</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={onPressMenu}
          activeOpacity={0.85}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="restaurant-outline" size={ICON_SIZE} color="#fff" />
          <Text style={styles.label}>가게</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
  },
  panel: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: 10,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    minHeight: 58,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    marginTop: 2,
    color: 'rgba(234,226,217,0.82)',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default React.memo(VideoOverlayUI);
