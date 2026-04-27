import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  type StyleProp,
  type ViewStyle,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PORTRAIT_ASPECT_RATIO = 9 / 14;

interface ImagePreviewProps {
  images: string[];
  isPicking: boolean;
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  isPicking,
  onPress,
  containerStyle,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = containerWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  if (images.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.placeholder, containerStyle]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="images-outline" size={32} color="#9aa0ab" />
        <Text style={styles.placeholderTitle}>이미지 추가</Text>
        <Text style={styles.placeholderText}>탭해서 앨범에서 선택</Text>
        {isPicking && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1f2431" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const totalPages = images.length + 1;
  const isAddPage = activeIndex === images.length;

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={[
              styles.page,
              containerWidth ? { width: containerWidth } : null,
            ]}
          >
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </View>
        ))}
        <View
          key="add"
          style={[
            styles.page,
            containerWidth ? { width: containerWidth } : null,
          ]}
        >
          <TouchableOpacity style={styles.addCard} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.addIconWrap}>
              <Ionicons name="add" size={28} color="#1f2431" />
            </View>
            <Text style={styles.addTitle}>이미지 추가</Text>
            <Text style={styles.addSubtitle}>탭해서 앨범에서 선택</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {isAddPage ? '추가' : `${activeIndex + 1}/${images.length}`}
        </Text>
      </View>
      {totalPages > 1 && (
        <View style={styles.dots}>
          {Array.from({ length: totalPages }).map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.overlayHint} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.overlayText}>탭해서 이미지 추가</Text>
      </TouchableOpacity>
    </View>
  );
};

export default memo(ImagePreview);

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1f2431',
    width: '100%',
    aspectRatio: PORTRAIT_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#f5f6f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7dbe5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  page: {
    height: '100%',
  },
  addCard: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f6f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b2f36',
  },
  addSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#8a909b',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  placeholderTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#2b2f36',
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 12,
    color: '#8a909b',
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  overlayHint: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
