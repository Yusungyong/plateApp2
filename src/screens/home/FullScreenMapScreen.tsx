import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from 'react-native-maps';

import HomeMapPreview from './contents/HomeMapPreview';
import type { NearbyStoreMarker } from '../../api/mapStoreApi';
import { fetchStoreSuggestions } from '../../api/mapStoreApi';
import { fetchSearch } from '../../api/searchApi';
import { fetchInAppDirections } from '../../api/directionsApi';
import type { RouteTravelMode } from '../../api/directionsApi';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { lastKnownLocationStatusRef, lastKnownUserLocationRef } from './utils/mapUtils';
import type { HomeLocationStatus } from './types';

const normalizeCandidateText = (value?: string | null) =>
  (value ?? '').trim().replace(/\s+/g, ' ');

const stripAddressDetail = (value?: string | null) => {
  const normalized = normalizeCandidateText(value);
  if (!normalized) return '';
  return normalized
    .split(',')[0]
    .replace(/\s+\d+층.*$/u, '')
    .replace(/\s+\d+호.*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildTargetQueries = (storeName?: string, address?: string) => {
  const normalizedStoreName = normalizeCandidateText(storeName);
  const normalizedAddress = normalizeCandidateText(address);
  const compactAddress = stripAddressDetail(address);
  return [
    [normalizedStoreName, compactAddress].filter(Boolean).join(' '),
    [normalizedStoreName, normalizedAddress].filter(Boolean).join(' '),
    compactAddress,
    normalizedAddress,
    normalizedStoreName,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatDistanceLabel = (meters: number | null) => {
  if (!meters || meters <= 0) return null;
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
};

const formatDurationLabel = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${Math.max(totalMinutes, 1)}분`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};

const formatRouteModeLabel = (mode: RouteTravelMode | null) => {
  if (mode === 'walking') return '도보';
  if (mode === 'transit') return '대중교통';
  if (mode === 'driving') return '자동차';
  return null;
};

const FullScreenMapScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<{ key: string; name: 'FullScreenMap'; params?: RootStackParamList['FullScreenMap'] }>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const targetPlaceId = route.params?.placeId?.trim() || '';
  const targetStoreName = route.params?.storeName?.trim() || '';
  const targetAddress = route.params?.address?.trim() || '';
  const routeLat = toOptionalNumber(route.params?.lat);
  const routeLng = toOptionalNumber(route.params?.lng);
  const [centerUserFn, setCenterUserFn] = useState<(() => void) | undefined>();
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>(
    lastKnownUserLocationRef.current ? 'granted' : lastKnownLocationStatusRef.current,
  );
  const [currentUserCoordinate, setCurrentUserCoordinate] = useState<LatLng | null>(
    lastKnownUserLocationRef.current,
  );
  const [initialFocusCoordinate, setInitialFocusCoordinate] = useState<LatLng | null>(() => {
    if (typeof routeLat === 'number' && typeof routeLng === 'number') {
      return { latitude: routeLat, longitude: routeLng };
    }
    return null;
  });
  const [routePolyline, setRoutePolyline] = useState<LatLng[] | null>(null);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  const [routeModeUsed, setRouteModeUsed] = useState<RouteTravelMode | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const shouldPrioritizeTargetFocus = Boolean(
    targetPlaceId ||
      targetStoreName ||
      targetAddress ||
      (typeof routeLat === 'number' && typeof routeLng === 'number'),
  );
  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(
    targetPlaceId || null,
  );
  const canCenterUser =
    locationStatus === 'granted' &&
    !!lastKnownUserLocationRef.current &&
    !!centerUserFn;
  const canOpenDirections =
    !!currentUserCoordinate &&
    !!initialFocusCoordinate &&
    locationStatus === 'granted';

  const targetQueries = useMemo(
    () => buildTargetQueries(targetStoreName, targetAddress),
    [targetAddress, targetStoreName],
  );
  const routeSummaryLabel = useMemo(() => {
    const parts = [
      formatRouteModeLabel(routeModeUsed),
      formatDistanceLabel(routeDistanceMeters),
      formatDurationLabel(routeDurationSeconds),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }, [routeDistanceMeters, routeDurationSeconds, routeModeUsed]);

  useEffect(() => {
    setSelectedMarkerKey(targetPlaceId || null);
  }, [targetPlaceId]);

  useEffect(() => {
    setRoutePolyline(null);
    setRouteDistanceMeters(null);
    setRouteDurationSeconds(null);
    setRouteModeUsed(null);
  }, [initialFocusCoordinate?.latitude, initialFocusCoordinate?.longitude]);

  useEffect(() => {
    if (typeof routeLat === 'number' && typeof routeLng === 'number') {
      setInitialFocusCoordinate({ latitude: routeLat, longitude: routeLng });
      return;
    }
    if (targetQueries.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const normalizedStoreName = targetStoreName.toLowerCase();
        const normalizedAddress = targetAddress.toLowerCase();
        for (const query of targetQueries) {
          const searchResult = await fetchSearch({
            q: query,
            type: 'place',
            page: 0,
            size: 10,
          });
          if (cancelled) {
            return;
          }
          const placeItems = (searchResult.items ?? []).filter(
            (item): item is Extract<typeof item, { type: 'place' }> => item.type === 'place',
          );
          const matchedPlace =
            placeItems.find((item) => targetPlaceId && item.placeId === targetPlaceId) ??
            placeItems.find(
              (item) =>
                normalizedStoreName &&
                item.storeName?.trim().toLowerCase() === normalizedStoreName,
            ) ??
            placeItems.find(
              (item) =>
                normalizedAddress &&
                item.address?.trim().toLowerCase() === normalizedAddress,
            ) ??
            placeItems.find(
              (item) =>
                normalizedAddress &&
                item.address?.trim().toLowerCase().includes(normalizedAddress),
            ) ??
            placeItems[0];

          if (matchedPlace?.lat != null && matchedPlace?.lng != null) {
            setInitialFocusCoordinate({
              latitude: matchedPlace.lat,
              longitude: matchedPlace.lng,
            });
            setSelectedMarkerKey((prev) => prev ?? matchedPlace.placeId ?? null);
            return;
          }
        }

        for (const query of targetQueries) {
          const suggestions = await fetchStoreSuggestions({ keyword: query, limit: 8 });
          if (cancelled) {
            return;
          }
          const matched =
            suggestions.find((item) => targetPlaceId && item.placeId === targetPlaceId) ??
            suggestions.find(
              (item) =>
                normalizedStoreName &&
                item.storeName.trim().toLowerCase() === normalizedStoreName,
            ) ??
            suggestions.find(
              (item) =>
                normalizedAddress &&
                item.address?.trim().toLowerCase() === normalizedAddress,
            ) ??
            suggestions.find(
              (item) =>
                normalizedAddress &&
                item.address?.trim().toLowerCase().includes(normalizedAddress),
            ) ??
            suggestions[0];

          if (!matched) {
            continue;
          }

          setInitialFocusCoordinate({ latitude: matched.lat, longitude: matched.lng });
          setSelectedMarkerKey((prev) => prev ?? matched.placeId ?? null);
          return;
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [routeLat, routeLng, targetQueries, targetPlaceId, targetStoreName, targetAddress]);

  const handleOpenFeed = useCallback(
    (marker: NearbyStoreMarker) => {
      if (!marker.placeId) {
        return;
      }
      if (
        marker.contentType?.toUpperCase() === 'IMAGE' &&
        marker.imageFeedId
      ) {
        navigation.navigate('ImageFeedViewer', { feedId: marker.imageFeedId });
        return;
      }
      navigation.navigate('VideoFeedScreen', {
        storeId: marker.storeId,
        placeId: marker.placeId,
      });
    },
    [navigation],
  );

  const handleResolveUserLocation = useCallback((coord: LatLng) => {
    setCurrentUserCoordinate(coord);
  }, []);

  const handleShowDirections = useCallback(async () => {
    const origin = currentUserCoordinate;
    const destination = initialFocusCoordinate;
    if (!origin || !destination) {
      Alert.alert('경로를 확인할 수 없어요', '현재 위치 또는 목적지 좌표를 찾지 못했어요.');
      return;
    }

    try {
      setRouteLoading(true);
      const result = await fetchInAppDirections({
        origin,
        destination,
        mode: 'walking',
      });
      if (!result || result.coordinates.length < 2) {
        Alert.alert('경로를 찾지 못했어요', '현재 위치에서 해당 장소까지의 경로를 찾을 수 없어요.');
        setRoutePolyline(null);
        setRouteDistanceMeters(null);
        setRouteDurationSeconds(null);
        setRouteModeUsed(null);
        return;
      }
      setRoutePolyline(result.coordinates);
      setRouteDistanceMeters(result.distanceMeters);
      setRouteDurationSeconds(result.durationSeconds);
      setRouteModeUsed(result.modeUsed);
    } catch {
      Alert.alert(
        '경로를 불러오지 못했어요',
        '앱 내부 길찾기 데이터를 불러오는 중 문제가 발생했어요.',
      );
    } finally {
      setRouteLoading(false);
    }
  }, [currentUserCoordinate, initialFocusCoordinate]);

  return (
    <View style={styles.container}>
      <HomeMapPreview
        key="fullscreen-map-reset"
        interactive
        isActive={isFocused}
        style={styles.map}
      onPressMarker={handleOpenFeed}
      selectedMarkerKey={selectedMarkerKey}
      initialFocusCoordinate={initialFocusCoordinate}
      suspendInitialUserCentering={shouldPrioritizeTargetFocus}
      onRequestCenterUser={setCenterUserFn}
      onLocationStatusChange={setLocationStatus}
      onUserLocationResolved={handleResolveUserLocation}
      routePolyline={routePolyline}
      routeOriginCoordinate={currentUserCoordinate}
      routeDestinationCoordinate={initialFocusCoordinate}
    />
      <View
        pointerEvents="box-none"
        style={[styles.backButtonWrap, { top: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="홈으로 돌아가기"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.centerButtonWrap, { bottom: insets.bottom + 16 }]}
      >
        {routeSummaryLabel ? (
          <View style={styles.routeSummaryChip}>
            <Ionicons name="git-compare-outline" size={14} color="#fff" />
            <Text style={styles.routeSummaryText}>{routeSummaryLabel}</Text>
          </View>
        ) : null}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.centerButton, !canOpenDirections && styles.centerButtonDisabled]}
            onPress={handleShowDirections}
            disabled={!canOpenDirections || routeLoading}
            accessibilityRole="button"
            accessibilityLabel="앱 내부 길찾기"
          >
            {routeLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trail-sign-outline" size={18} color="#fff" />
            )}
            <Text style={styles.centerButtonText}>
              {routeLoading ? '경로 불러오는 중' : routePolyline?.length ? '경로 다시 보기' : '길찾기'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.centerButton, !canCenterUser && styles.centerButtonDisabled]}
            onPress={() => centerUserFn?.()}
            disabled={!canCenterUser}
            accessibilityRole="button"
            accessibilityLabel="내 위치로 이동"
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.centerButtonText}>내 위치</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default FullScreenMapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  backButtonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  centerButtonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  routeSummaryChip: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeSummaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  centerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerButtonDisabled: {
    opacity: 0.45,
  },
  centerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
