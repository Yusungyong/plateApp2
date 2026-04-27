// src/screens/videoFeeds/components/VideoMenuModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { fetchStoreMenus, MenuItemResponse } from '../../../api/menuApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  storeName?: string | null;
  placeId?: string | null;
};

const formatPrice = (price?: string | number | null) => {
  if (price == null) return '-';
  const num = Number(price);
  if (!Number.isFinite(num)) return String(price);
  return `₩${num.toLocaleString('ko-KR')}`;
};

const decodeIfNeeded = (value?: string | null) => {
  if (!value) return undefined;
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) {
        break;
      }
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const VideoMenuModal: React.FC<Props> = ({ visible, onClose, storeName, placeId }) => {
  const normalizedStoreName = useMemo(() => decodeIfNeeded(storeName) ?? storeName ?? undefined, [storeName]);
  const [menus, setMenus] = useState<MenuItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMenus = useCallback(async () => {
    if (!placeId && !normalizedStoreName) {
      setMenus([]);
      setError('장소 정보가 없어 메뉴를 불러오지 못했어요.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStoreMenus({
        placeId: placeId ?? undefined,
        storeName: normalizedStoreName ?? undefined,
      });
      setMenus(data);
    } catch (e) {
      setError('메뉴를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [placeId, normalizedStoreName]);

  useEffect(() => {
    if (!visible) return;
    loadMenus();
  }, [visible, loadMenus]);

  const renderMenuItem = useCallback(
    ({ item }: { item: MenuItemResponse }) => (
      <View style={[styles.menuCard, item.menuTitle?.includes('시그니처') && styles.menuCardHighlight]}>
        <View style={styles.menuText}>
          {item.menuTitle ? <Text style={styles.menuTag}>{item.menuTitle}</Text> : null}
          <Text style={styles.menuName}>{item.itemName}</Text>
          {item.description ? (
            <Text style={styles.menuDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Text style={styles.menuPrice}>{formatPrice(item.price)}</Text>
      </View>
    ),
    [],
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return null;
    }
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{error ?? '등록된 메뉴가 없습니다.'}</Text>
      </View>
    );
  }, [loading, error]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.storeName}>{normalizedStoreName ?? '가게 이름 미정'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <Icon name='close' size={20} color="#111" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>메뉴 불러오는 중…</Text>
          </View>
        ) : (
          <FlatList
            data={menus}
            keyExtractor={(item, index) => `${item.itemId}_${index}`}
            renderItem={renderMenuItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={listEmptyComponent}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f6',
  },
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuCardHighlight: {
    borderRadius: 16,
    backgroundColor: '#fff6f0',
    paddingHorizontal: 12,
  },
  menuText: {
    flex: 1,
    paddingRight: 12,
  },
  menuTag: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  menuDesc: {
    marginTop: 4,
    fontSize: 12,
    color: '#7b8190',
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eceff4',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6f7782',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6f7782',
  },
});

export default VideoMenuModal;
