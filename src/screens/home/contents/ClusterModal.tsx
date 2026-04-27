import React, { memo } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import type { NearbyStoreMarker } from '../../../api/mapStoreApi';
import { buildImageUrl } from '../utils/imageUtils';
import { HOME_COLORS } from '../styles/homeTokens';

type ClusterModalProps = {
  visible: boolean;
  title: string;
  items: NearbyStoreMarker[];
  onClose: () => void;
  onSelectItem: (item: NearbyStoreMarker) => void;
};

const ClusterModal: React.FC<ClusterModalProps> = ({
  visible,
  title,
  items,
  onClose,
  onSelectItem,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.clusterBackdrop} onPress={onClose} />
    <View style={styles.clusterSheet}>
      <View style={styles.clusterHeader}>
        <View>
          <Text style={styles.clusterTitle}>{title}</Text>
          <Text style={styles.clusterSubtitle}>가게 {items.length}곳</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.clusterClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={HOME_COLORS.ink} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          `${item.placeId ?? 'place'}-${item.storeId ?? 'store'}-${index}`
        }
        renderItem={({ item }) => {
          const thumbUrl = buildImageUrl(item.thumbnail);
          return (
            <TouchableOpacity style={styles.clusterItem} onPress={() => onSelectItem(item)}>
              {thumbUrl ? (
                <Image source={{ uri: thumbUrl }} style={styles.clusterThumb} />
              ) : (
                <View style={styles.clusterThumbFallback}>
                  <Ionicons name="image-outline" size={16} color={HOME_COLORS.mapMuted} />
                </View>
              )}
              <View style={styles.clusterItemText}>
                <Text style={styles.clusterItemTitle} numberOfLines={1}>
                  {item.storeName || '가게명 없음'}
                </Text>
                <Text style={styles.clusterItemSub} numberOfLines={1}>
                  {item.address ?? '주소 정보 없음'}
                </Text>
              </View>
              <View style={styles.clusterItemBadge}>
                <Text style={styles.clusterItemBadgeText}>{item.feedCount ?? 0}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.clusterList}
      />
    </View>
  </Modal>
);

export default memo(ClusterModal);

const styles = StyleSheet.create({
  clusterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HOME_COLORS.overlayDarkMid,
  },
  clusterSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 18,
    padding: 16,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clusterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  clusterSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.textSubtle,
  },
  clusterClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  clusterList: {
    paddingBottom: 6,
  },
  clusterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HOME_COLORS.divider,
  },
  clusterThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  clusterThumbFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  clusterItemText: {
    flex: 1,
    paddingRight: 12,
  },
  clusterItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: HOME_COLORS.ink,
  },
  clusterItemSub: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.mapMuted,
  },
  clusterItemBadge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  clusterItemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
});
