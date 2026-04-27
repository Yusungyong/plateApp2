// src/screens/home/components/MissionCard.tsx
import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { HOME_COLORS } from '../styles/homeTokens';

interface MissionCardProps {
  label?: string;
  badgeText?: string;
  title: string;
  address: string;
  type: 'video' | 'image' | 'map';
  thumbnailUri?: string;
  onPress: () => void;
  onRefresh?: () => void;
}

const MissionCard: React.FC<MissionCardProps> = ({
  label = '오늘의 추천',
  badgeText,
  title,
  address,
  type,
  thumbnailUri,
  onPress,
  onRefresh,
}) => {
  const placeholderIconName =
    type === 'video' ? 'videocam' : type === 'image' ? 'image' : 'compass';

  return (
    <TouchableOpacity style={styles.outer} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.labelRow}>
            <View style={styles.labelCluster}>
              <Text style={styles.label}>{label}</Text>
              {badgeText ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              ) : null}
            </View>
            {onRefresh ? (
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={(event) => {
                  event.stopPropagation();
                  onRefresh();
                }}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color="#8ca6ff" />
                <Text style={styles.refreshText}>새로고침</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {address}
          </Text>
        </View>
        <View style={styles.peek}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.peekImage} />
          ) : (
            <View style={styles.peekPlaceholder}>
              <Icon name={placeholderIconName} size={28} color="rgba(255,255,255,0.75)" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(MissionCard);

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 10,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#111b2e',
    marginTop: 6,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  label: {
    color: '#8ca6ff',
    fontSize: 11,
    fontWeight: '700',
  },
  labelCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    color: '#dbe6ff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: HOME_COLORS.textOnDark,
    fontSize: 18,
    fontWeight: '800',
  },
  sub: {
    marginTop: 4,
    color: '#c7d0ea',
    fontSize: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(140,166,255,0.12)',
  },
  refreshText: {
    color: '#8ca6ff',
    fontSize: 10,
    fontWeight: '700',
  },
  peek: {
    width: 84,
    height: 84,
    marginLeft: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  peekImage: {
    width: '100%',
    height: '100%',
  },
  peekPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16264a',
  },
});
