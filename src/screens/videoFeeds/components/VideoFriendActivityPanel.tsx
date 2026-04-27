import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { StoreFriendActivityItem } from '../../../api/friendVisitApi';
import { formatMonthDay } from '../../../utils/dateTime';

type Props = {
  items: StoreFriendActivityItem[];
  loading?: boolean;
  onRefresh?: () => void;
};

const VideoFriendActivityPanel: React.FC<Props> = ({ items, loading, onRefresh }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>친구 활동</Text>
          {onRefresh ? (
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshText}>새로고침</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {loading ? (
          <Text style={styles.hint}>친구 방문 정보를 불러오는 중…</Text>
        ) : (
          items.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.friendName}>{item.friendNickname || item.friendName}</Text>
              <Text style={styles.memo} numberOfLines={2}>
                {item.memo ?? '“방문 메모 없음”'}
              </Text>
              <Text style={styles.date}>
                {item.visitDate ? formatMonthDay(item.visitDate) : '방문일 미상'}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  refreshText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  hint: {
    color: '#cfd3dd',
    fontSize: 12,
  },
  row: {
    marginBottom: 10,
  },
  friendName: {
    color: '#fff',
    fontWeight: '700',
  },
  memo: {
    color: '#cdd2e3',
    fontSize: 12,
    marginTop: 2,
  },
  date: {
    color: '#a6acc0',
    fontSize: 11,
    marginTop: 2,
  },
});

export default VideoFriendActivityPanel;
