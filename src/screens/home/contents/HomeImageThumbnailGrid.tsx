// src/screens/Home/contents/HomeImageThumbnailGrid.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { HomeImageThumbnail, buildFeedImageUrl } from '../../../api/homeImageApi';

type Props = {
  items: HomeImageThumbnail[];
  loading: boolean;
  errorMsg: string | null;
  onReload: () => void;
  onPressItem?: (item: HomeImageThumbnail) => void;
};

const HomeImageThumbnailGrid: React.FC<Props> = ({
  items,
  loading,
  errorMsg,
  onReload,
  onPressItem,
}) => {
  const top4 = (items ?? []).slice(0, 4);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>최근 이미지</Text>

        <TouchableOpacity onPress={onReload} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.reload}>새로고침</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator />
          <Text style={styles.stateText}>불러오는 중...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={onReload} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : top4.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>표시할 이미지 피드가 없어요.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {top4.map((it) => {
            const uri = buildFeedImageUrl(it.thumbFileName);

            return (
              <TouchableOpacity
                key={it.feedNo}
                style={styles.cell}
                activeOpacity={0.85}
                onPress={() => onPressItem?.(it)}
              >
                <Image
                  source={{ uri }}
                  style={styles.img}
                  resizeMode="cover"
                />

                {/* 가게명 라벨 (원하면 제거 가능) */}
                {!!it.storeName && (
                  <View style={styles.caption}>
                    <Text style={styles.captionText} numberOfLines={1}>
                      {it.storeName}
                    </Text>
                  </View>
                )}

                {/* 여러장 배지 */}
                {(it.imageCount ?? 0) > 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{(it.imageCount ?? 0) - 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default HomeImageThumbnailGrid;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  reload: {
    fontSize: 13,
    color: '#666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '48.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  captionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stateBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f6f6f6',
  },
  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  errorText: {
    fontSize: 13,
    color: '#b00020',
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
