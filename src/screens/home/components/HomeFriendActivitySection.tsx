import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { FriendRecentStore } from '../../../api/friendVisitApi';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';

type Props = {
  loading: boolean;
  recentStores: FriendRecentStore[];
  onPressActivity: () => void;
  onPressDiscover: () => void;
  onOpenStore: (store: FriendRecentStore) => void;
};

const HomeFriendActivitySection: React.FC<Props> = ({
  loading,
  recentStores,
  onPressActivity,
  onPressDiscover,
  onOpenStore,
}) => {
  return (
    <View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={onPressActivity}
          activeOpacity={0.88}
        >
          <Text style={styles.actionEyebrow}>친구 활동</Text>
          <Text style={styles.actionTitle}>최근 방문과 기록 보기</Text>
          <Text style={styles.actionHint}>친구가 남긴 가게 기록을 한곳에서 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={onPressDiscover}
          activeOpacity={0.88}
        >
          <Text style={styles.actionEyebrow}>친구 찾기</Text>
          <Text style={styles.actionTitle}>새 친구 탐색</Text>
          <Text style={styles.actionHint}>닉네임이나 활동 지역으로 바로 검색</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>친구 활동을 불러오는 중…</Text>
        </View>
      ) : recentStores.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>친구가 다녀간 가게가 아직 없어요.</Text>
          <Text style={styles.emptyHint}>
            친구를 추가하고 함께 방문한 기록을 남기면 여기서 바로 이어볼 수 있어요.
          </Text>
        </View>
      ) : (
        <View style={styles.storeList}>
          {recentStores.slice(0, 3).map((store, index) => (
            <TouchableOpacity
              key={`${store.storeId}-${index}`}
              style={styles.storeRow}
              onPress={() => onOpenStore(store)}
              activeOpacity={0.86}
            >
              <View style={styles.storeCopy}>
                <Text style={styles.storeName} numberOfLines={1}>
                  {store.storeName}
                </Text>
                <Text style={styles.storeMeta} numberOfLines={1}>
                  {store.address ?? '주소 정보 없음'}
                </Text>
                <Text style={styles.storeHint}>
                  친구 {store.visitCount}명 방문
                  {store.friends?.[0]?.friendName
                    ? ` · 최근 ${store.friends[0].friendName}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.storeAction}>보러가기</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default HomeFriendActivitySection;

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: HOME_RADII.cardSmall,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  actionCardPrimary: {
    backgroundColor: '#f5f7fb',
  },
  actionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: HOME_COLORS.action,
  },
  actionTitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  actionHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: HOME_COLORS.textMuted,
  },
  loadingBox: {
    marginTop: 12,
    borderRadius: HOME_RADII.cardSmall,
    paddingVertical: 18,
    paddingHorizontal: 14,
    backgroundColor: '#faf8f4',
  },
  loadingText: {
    fontSize: 13,
    color: HOME_COLORS.textMuted,
  },
  emptyBox: {
    marginTop: 12,
    borderRadius: HOME_RADII.cardSmall,
    paddingVertical: 18,
    paddingHorizontal: 14,
    backgroundColor: '#faf8f4',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_COLORS.textPrimary,
  },
  emptyHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: HOME_COLORS.textMuted,
  },
  storeList: {
    marginTop: 12,
    gap: 8,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: HOME_RADII.cardSmall,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fbfaf8',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
  },
  storeCopy: {
    flex: 1,
    paddingRight: 10,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  storeMeta: {
    marginTop: 4,
    fontSize: 12,
    color: HOME_COLORS.textMuted,
  },
  storeHint: {
    marginTop: 6,
    fontSize: 12,
    color: HOME_COLORS.textSecondary,
  },
  storeAction: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.action,
  },
});
