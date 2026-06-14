import React, { memo, useEffect, useRef, useState } from 'react';
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

type PreviewImageItem = {
  id: string;
  uri: string;
  isPersisted: boolean;
};

interface ImagePreviewProps {
  images: PreviewImageItem[];
  isPicking: boolean;
  onPress: () => void;
  onRotateCurrent?: (imageId: string) => void;
  onDeleteCurrent?: (imageId: string) => void;
  rotatingImageId?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  isPicking,
  onPress,
  onRotateCurrent,
  onDeleteCurrent,
  rotatingImageId,
  containerStyle,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const activeImageIdRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    activeImageIdRef.current = images[activeIndex]?.id ?? null;
  }, [activeIndex, images]);

  useEffect(() => {
    if (activeIndex < images.length) {
      return;
    }
    setActiveIndex(Math.max(0, images.length - 1));
  }, [activeIndex, images.length]);

  useEffect(() => {
    const activeImageId = activeImageIdRef.current;
    if (!activeImageId) {
      return;
    }
    const nextIndex = images.findIndex((item) => item.id === activeImageId);
    if (nextIndex >= 0 && nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
      if (containerWidth > 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: false });
        });
      }
    }
  }, [activeIndex, containerWidth, images]);

  const goToIndex = (index: number) => {
    setActiveIndex(index);
    if (!containerWidth) {
      return;
    }
    scrollRef.current?.scrollTo({ x: index * containerWidth, animated: true });
  };

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

  const isAddPage = activeIndex === images.length;
  const activeImage = isAddPage ? null : images[activeIndex] ?? null;
  const canRotateCurrent = Boolean(activeImage && onRotateCurrent);
  const isRotatingCurrent = Boolean(activeImage && rotatingImageId === activeImage.id);
  const canDeleteCurrent = Boolean(activeImage && onDeleteCurrent);

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((item) => (
          <View
            key={item.id}
            style={[
              styles.page,
              containerWidth ? { width: containerWidth } : null,
            ]}
          >
            <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
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
      {canRotateCurrent && activeImage ? (
        <TouchableOpacity
          style={styles.rotateButton}
          onPress={() => onRotateCurrent?.(activeImage.id)}
          activeOpacity={0.88}
          disabled={isRotatingCurrent}
          accessibilityRole="button"
          accessibilityLabel="현재 이미지 회전"
        >
          {isRotatingCurrent ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={15} color="#fff" />
              <Text style={styles.rotateButtonText}>회전</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
      {canDeleteCurrent && activeImage ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDeleteCurrent?.(activeImage.id)}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="현재 이미지 삭제"
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
      ) : null}
      {images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbRail}
          contentContainerStyle={styles.thumbRailContent}
        >
          {images.map((item, index) => {
            const active = index === activeIndex;
            const primary = index === 0;
            return (
              <TouchableOpacity
                key={`thumb-${item.id}`}
                style={[
                  styles.thumbCard,
                  active ? styles.thumbCardActive : null,
                ]}
                onPress={() => goToIndex(index)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: item.uri }} style={styles.thumbImage} />
                <View style={styles.thumbOrderBadge}>
                  <Text style={styles.thumbOrderBadgeText}>{index + 1}</Text>
                </View>
                {primary ? (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>썸네일</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
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
  rotateButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rotateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(185, 28, 28, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
  },
  thumbRailContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  thumbCard: {
    width: 54,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  thumbCardActive: {
    borderColor: '#ffffff',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOrderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOrderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  primaryBadge: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 999,
    paddingVertical: 3,
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
