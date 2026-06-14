// src/screens/home/components/MissionCard.tsx
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import FallbackImage from '../../../components/common/FallbackImage';

interface MissionCardProps {
  title: string;
  address: string;
  type: 'video' | 'image' | 'map';
  thumbnailUri?: string;
  onPress: () => void;
  onRefresh?: () => void;
  metaText?: string;
}

const MissionCard: React.FC<MissionCardProps> = ({
  title,
  address,
  type,
  thumbnailUri,
  onPress,
  onRefresh,
  metaText,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const placeholderIconName =
    type === 'video' ? 'videocam' : type === 'image' ? 'image' : 'compass';
  const typeLabel = type === 'video' ? 'VIDEO PICK' : type === 'image' ? 'IMAGE PICK' : 'MAP PICK';
  const mediaHeight = isCompact ? 248 : 286;
  const hasImage = Boolean(thumbnailUri);
  const metaLabel =
    metaText || (type === 'video' ? '짧게 바로 재생' : type === 'image' ? '가볍게 둘러보기' : '지금 주변에서 찾기');

  return (
    <TouchableOpacity style={styles.outer} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.card}>
        <View style={[styles.mediaShell, { height: mediaHeight }]}>
          {hasImage ? (
            <FallbackImage
              uri={thumbnailUri}
              style={styles.coverImage}
              resizeMode="cover"
              placeholderText=""
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <View style={styles.placeholderOrbLarge} />
              <View style={styles.placeholderOrbSmall} />
              <View style={styles.placeholderCore}>
                <Icon name={placeholderIconName} size={34} color={HOME_COLORS.action} />
              </View>
            </View>
          )}
          <View style={styles.coverTint} pointerEvents="none" />

          <View style={styles.labelRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{typeLabel}</Text>
            </View>
            {onRefresh ? (
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={(event) => {
                  event.stopPropagation();
                  onRefresh();
                }}
                activeOpacity={0.75}
              >
                <Icon name="refresh" size={16} color={HOME_COLORS.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {type === 'video' ? (
            <View style={styles.floatingPlay}>
              <Icon name="play" size={18} color={HOME_COLORS.textOnDark} />
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.contentTopRow}>
            <View style={styles.copyBlock}>
              <Text style={styles.metaCopy} numberOfLines={1}>
                {metaLabel}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {address}
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.metaPill}>
              <Icon
                name={type === 'map' ? 'navigate-outline' : 'sparkles-outline'}
                size={14}
                color={HOME_COLORS.action}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {type === 'video'
                  ? '바로 보기'
                  : type === 'image'
                  ? '사진 둘러보기'
                  : '주변 탐색'}
              </Text>
            </View>

            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>Open</Text>
              <Icon name="arrow-forward" size={14} color={HOME_COLORS.textOnDark} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(MissionCard);

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
    marginTop: 6,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  mediaShell: {
    margin: 14,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#efe5d8',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f2e9dd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderOrbLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(182,150,108,0.16)',
    top: -36,
    right: -18,
  },
  placeholderOrbSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(138,103,62,0.12)',
    bottom: -16,
    left: -12,
  },
  placeholderCore: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(138,103,62,0.16)',
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,14,10,0.12)',
  },
  labelRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  badgeText: {
    color: HOME_COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  floatingPlay: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 2,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 2,
  },
  contentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copyBlock: {
    flex: 1,
  },
  title: {
    marginTop: 8,
    color: HOME_COLORS.textPrimary,
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 9,
    color: HOME_COLORS.textMutedAlt,
    fontSize: 14,
    lineHeight: 20,
  },
  metaCopy: {
    color: HOME_COLORS.action,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  footerRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderLight,
  },
  metaText: {
    marginLeft: 6,
    color: HOME_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: HOME_COLORS.textPrimary,
  },
  ctaText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
