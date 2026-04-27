import React, { memo } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { HOME_COLORS } from '../styles/homeTokens';
import type { HomeLocationStatus } from '../types';

type MapOverlaysProps = {
  showApplyToast: boolean;
  applyToastOpacity: Animated.Value;
  showClusterHint: boolean;
  clusterHintOpacity: Animated.Value;
  showLoadingBadge: boolean;
  loadingBadgeOpacity: Animated.Value;
  markersLoading: boolean;
  markersError?: string | null;
  onRetryMarkers?: () => void;
  showCta: boolean;
  onPressMap?: () => void;
  locationPromptStatus?: HomeLocationStatus | null;
  onOpenSettings: () => void;
};

const MapOverlays: React.FC<MapOverlaysProps> = ({
  showApplyToast,
  applyToastOpacity,
  showClusterHint,
  clusterHintOpacity,
  showLoadingBadge,
  loadingBadgeOpacity,
  markersLoading,
  markersError,
  onRetryMarkers,
  showCta,
  onPressMap,
  locationPromptStatus,
  onOpenSettings,
}) => {
  const locationPromptCopy =
    locationPromptStatus === 'denied'
      ? {
          title: '위치 권한이 꺼져 있습니다',
          subtitle: '권한을 허용하면 내 주변 가게를 더 정확히 보여드려요. 지금은 기본 지역 지도를 표시합니다.',
        }
      : locationPromptStatus === 'unavailable'
        ? {
            title: '현재 위치를 아직 찾지 못했습니다',
            subtitle: '위치 서비스가 꺼져 있거나 신호가 약할 수 있어요. 지금은 기본 지역 지도를 표시합니다.',
          }
        : null;

  return (
    <>
      {!!locationPromptCopy && (
      <View style={styles.locationBanner}>
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationTitle}>{locationPromptCopy.title}</Text>
          <Text style={styles.locationSub}>{locationPromptCopy.subtitle}</Text>
        </View>
        <View style={styles.locationAction}>
          <Text style={styles.locationActionText} onPress={onOpenSettings}>
            설정 열기
          </Text>
        </View>
      </View>
    )}
    {showApplyToast && (
      <Animated.View style={[styles.applyToast, { opacity: applyToastOpacity }]}>
        <Ionicons name="checkmark-circle" size={16} color={HOME_COLORS.ink} />
        <Text style={styles.applyToastText}>필터가 적용되었습니다</Text>
      </Animated.View>
    )}
    {!!markersError && (
      <View style={styles.errorBanner}>
        <View style={styles.errorTextWrap}>
          <Text style={styles.errorTitle}>주변 가게를 불러오지 못했어요</Text>
          <Text style={styles.errorSub}>{markersError}</Text>
        </View>
        {onRetryMarkers && (
          <Pressable style={styles.errorAction} onPress={onRetryMarkers}>
            <Text style={styles.errorActionText}>다시 시도</Text>
          </Pressable>
        )}
      </View>
    )}
    {showClusterHint && (
      <Animated.View style={[styles.clusterHint, { opacity: clusterHintOpacity }]}>
        <Ionicons name="navigate-circle" size={16} color={HOME_COLORS.ink} />
        <Text style={styles.clusterHintText}>확대 후 목록에서 가게를 선택하세요</Text>
      </Animated.View>
    )}
    {markersLoading && showCta && (
      <View style={styles.loadingOverlay} pointerEvents="auto">
        <View />
      </View>
    )}
    {showLoadingBadge && (
      <Animated.View style={[styles.loadingBadge, { opacity: loadingBadgeOpacity }]} pointerEvents="none">
        <ActivityIndicator size="small" color={HOME_COLORS.ink} />
        <Text style={styles.loadingText}>가게 불러오는 중...</Text>
      </Animated.View>
    )}
    {showCta && onPressMap && (
      <View style={styles.ctaWrap} pointerEvents="box-none">
        <Pressable
          style={styles.ctaPill}
          onPress={onPressMap}
        >
          <Ionicons name="map-outline" size={14} color={HOME_COLORS.textOnDark} />
          <Text style={styles.ctaText}>전체 지도 보기</Text>
        </Pressable>
      </View>
    )}
    </>
  );
};

export default memo(MapOverlays);

const styles = StyleSheet.create({
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.overlayDarkStrong,
  },
  ctaText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.overlayLight,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },
  loadingText: {
    fontSize: 11,
    color: HOME_COLORS.ink,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HOME_COLORS.overlayFaint,
  },
  applyToast: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignSelf: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.overlayLight,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyToastText: {
    fontSize: 12,
    color: HOME_COLORS.ink,
    fontWeight: '600',
  },
  locationBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  locationSub: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.textSubtle,
  },
  locationAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  locationActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  errorBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  errorSub: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.textSubtle,
  },
  errorAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: HOME_COLORS.surfaceAlt,
  },
  errorActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  clusterHint: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignSelf: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: HOME_COLORS.overlayLight,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clusterHintText: {
    fontSize: 12,
    color: HOME_COLORS.ink,
    fontWeight: '600',
  },
});
