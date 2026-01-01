// src/screens/VideoFeed/components/VideoOverlayUI.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ICON_SIZE = 34;

type Props = {
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;

  onPressLike?: () => void;
  onPressComment?: () => void;
  onPressMenu?: () => void;
  onPressLocation?: () => void;
};

const VideoOverlayUI: React.FC<Props> = ({
  likeCount = 0,
  commentCount = 0,
  liked = false,
  onPressLike,
  onPressComment,
  onPressMenu,
  onPressLocation,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.stack}>
        <TouchableOpacity style={styles.item} onPress={onPressLike}>
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={ICON_SIZE}
            color={liked ? '#ff4d4f' : '#fff'}
          />
          <Text style={styles.count}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onPressComment}>
          <Icon name="chatbubble-outline" size={ICON_SIZE} color="#fff" />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onPressLocation}>
          <Icon name="location-outline" size={ICON_SIZE} color="#fff" />
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
    bottom: 120,
  },
  stack: {
    alignItems: 'center',
    gap: 20,
  },
  item: {
    alignItems: 'center',
  },
  count: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default React.memo(VideoOverlayUI);
