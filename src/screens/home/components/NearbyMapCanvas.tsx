import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MapView, {
  Callout,
  LatLng,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';

import type { NearbyStoreMarker } from '../../../api/mapStoreApi';
import { getAndroidCurrentPosition } from '../../../native/plateLocation';
import { useNearbyMarkers } from '../hooks/useNearbyMarkers';
import { useMarkerGroups } from '../hooks/useMarkerGroups';
import { HOME_COLORS } from '../styles/homeTokens';
import type { HomeLocationStatus, HomeNearbyStatePayload } from '../types';
import {
  DEFAULT_REGION,
  lastKnownLocationStatusRef,
  lastKnownMapRegionRef,
  lastKnownUserLocationRef,
} from '../utils/mapUtils';

const USE_DEVICE_LOCATION = true;
const INITIAL_DELTAS = {
  latitudeDelta: DEFAULT_REGION.latitudeDelta,
  longitudeDelta: DEFAULT_REGION.longitudeDelta,
};
const ANDROID_LOCATION_PERMISSION_RATIONALE = {
  title: '위치 권한이 필요해요',
  message:
    '내 주변 가게와 피드를 정확하게 보여드리려면 위치 권한을 허용해주세요.',
  buttonPositive: '허용하기',
  buttonNegative: '나중에',
};

type UserLocationChangeEvent = {
  nativeEvent: { coordinate?: LatLng | null };
};

type GeoPosition = {
  coords: { latitude: number; longitude: number };
};

type GeoError = { code?: number };

type GeoLocationApi = {
  getCurrentPosition?: (
    success: (pos: GeoPosition) => void,
    error?: (err: GeoError) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      distanceFilter?: number;
    },
  ) => void;
  watchPosition?: (
    success: (pos: GeoPosition) => void,
    error?: (err: GeoError) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      distanceFilter?: number;
    },
  ) => number;
  clearWatch?: (watchId: number) => void;
};

type NearbyMapCanvasProps = {
  isActive: boolean;
  mode?: 'nearby' | 'likes';
  style?: StyleProp<ViewStyle>;
  category?: string;
  externalMarkers?: NearbyStoreMarker[];
  externalLoading?: boolean;
  externalError?: string | null;
  selectedMarkerKey?: string | null;
  focusedMarker?: NearbyStoreMarker | null;
  onSelectMarker?: (marker: NearbyStoreMarker) => void;
  onPressMap?: () => void;
  onNearbyStateChange?: (payload: HomeNearbyStatePayload) => void;
  onRequestCenterUser?: (fn?: () => void) => void;
  onRequestRefreshMarkers?: (fn?: () => void) => void;
  onLocationStatusChange?: (status: HomeLocationStatus) => void;
  onUserLocationResolved?: (coord: LatLng) => void;
  onViewportCenterChange?: (coord: LatLng) => void;
};

type MarkerChipProps = {
  marker: NearbyStoreMarker;
  markerKey: string;
  mode?: 'nearby' | 'likes';
  selected?: boolean;
  onPress: (marker: NearbyStoreMarker) => void;
};

const buildMarkerKey = (marker: NearbyStoreMarker) =>
  [
    marker.placeId?.trim() || 'noplace',
    String(marker.storeId ?? 'nostore'),
    marker.lat.toFixed(6),
    marker.lng.toFixed(6),
  ].join(':');

const contentTypeIcon = (contentType?: NearbyStoreMarker['contentType']) => {
  if (contentType === 'IMAGE') return 'images-outline';
  if (contentType === 'BOTH') return 'albums-outline';
  return 'videocam-outline';
};

const distanceMeters = (a: LatLng, b: LatLng) => {
  const earthRadius = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const calc =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return earthRadius * c;
};

const isRegionEquivalent = (previous: Region, next: Region) => {
  const centerDrift = distanceMeters(
    { latitude: previous.latitude, longitude: previous.longitude },
    { latitude: next.latitude, longitude: next.longitude },
  );

  return (
    centerDrift < 8 &&
    Math.abs(previous.latitudeDelta - next.latitudeDelta) < 0.0006 &&
    Math.abs(previous.longitudeDelta - next.longitudeDelta) < 0.0006
  );
};

const StoreMarkerChip = memo<MarkerChipProps>(
  ({ marker, markerKey, mode = 'nearby', selected = false, onPress }) => (
    <Marker
      key={`nearby-${markerKey}`}
      coordinate={{ latitude: marker.lat, longitude: marker.lng }}
      anchor={{ x: 0.5, y: 1 }}
      calloutAnchor={{ x: 0.5, y: 0.1 }}
      tracksViewChanges={false}
      zIndex={selected ? 20 : 1}
      onPress={() => onPress(marker)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${marker.storeName?.trim() || '이름 없는 가게'}, 피드 ${marker.feedCount ?? 0}개`}
      accessibilityHint="선택하면 가게 정보가 열립니다."
      accessibilityState={{ selected }}
    >
      {mode === 'likes' ? (
        <View style={styles.likedPinFrame}>
          <View style={[styles.likedPinCore, selected && styles.likedPinCoreSelected]}>
            <Ionicons
              name="heart"
              size={18}
              color={selected ? '#ffffff' : '#d14b68'}
            />
          </View>
          <View style={[styles.likedPinCountPill, selected && styles.likedPinCountPillSelected]}>
            <Text
              style={[styles.likedPinCountText, selected && styles.likedPinCountTextSelected]}
            >
              {marker.feedCount ?? 0}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.pinFrame, !selected && styles.pinFrameCompact]}>
          <View
            style={[
              styles.pinHead,
              !selected && styles.pinHeadCompact,
              selected && styles.pinHeadSelected,
            ]}
          >
            <View
              style={[
                styles.pinIconWrap,
                !selected && styles.pinIconWrapCompact,
                selected && styles.pinIconWrapSelected,
              ]}
            >
              <Ionicons
                name={contentTypeIcon(marker.contentType)}
                size={14}
                color={selected ? '#8f6033' : HOME_COLORS.textMutedAlt}
              />
            </View>
            {selected ? (
              <Text
                style={[styles.pinStoreName, styles.pinStoreNameSelected]}
                numberOfLines={1}
              >
                {marker.storeName?.trim() || '이름 없는 가게'}
              </Text>
            ) : null}
            {selected || (marker.feedCount ?? 0) > 0 ? (
              <View
                style={[
                  styles.pinCountPill,
                  !selected && styles.pinCountPillCompact,
                  selected && styles.pinCountPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pinCountText,
                    !selected && styles.pinCountTextCompact,
                    selected && styles.pinCountTextSelected,
                  ]}
                >
                  {marker.feedCount ?? 0}
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.pinTail,
              !selected && styles.pinTailCompact,
              selected && styles.pinTailSelected,
            ]}
          />
        </View>
      )}
      <Callout tooltip onPress={() => onPress(marker)}>
        <View style={styles.calloutCard}>
          <Text style={styles.calloutTitle} numberOfLines={1}>
            {marker.storeName?.trim() || '이름 없는 가게'}
          </Text>
          <Text style={styles.calloutSub} numberOfLines={1}>
            {marker.address?.trim() || '주소 정보 없음'}
          </Text>
        </View>
      </Callout>
    </Marker>
  ),
);

const NearbyMapCanvas: React.FC<NearbyMapCanvasProps> = ({
  isActive,
  mode = 'nearby',
  style,
  category,
  externalMarkers,
  externalLoading,
  externalError,
  selectedMarkerKey,
  focusedMarker,
  onSelectMarker,
  onPressMap,
  onNearbyStateChange,
  onRequestCenterUser,
  onRequestRefreshMarkers,
  onLocationStatusChange,
  onUserLocationResolved,
  onViewportCenterChange,
}) => {
  const isLikesMode = mode === 'likes';
  const mapRef = useRef<MapView | null>(null);
  const initialUserLocation = !isLikesMode ? lastKnownUserLocationRef.current : null;
  const userLocationRef = useRef<LatLng | null>(initialUserLocation);
  const pendingCenterRef = useRef(false);
  const followUserRef = useRef(false);
  const hasCenteredUserRef = useRef(false);
  const lastFocusedMarkerKeyRef = useRef<string | null>(null);
  const lastMarkerInteractionAtRef = useRef(0);
  const [region, setRegion] = useState<Region>(() => {
    if (initialUserLocation) {
      return {
        latitude: initialUserLocation.latitude,
        longitude: initialUserLocation.longitude,
        ...INITIAL_DELTAS,
      };
    }
    if (lastKnownMapRegionRef.current) {
      return lastKnownMapRegionRef.current;
    }
    return DEFAULT_REGION;
  });
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(
    lastKnownLocationStatusRef.current === 'denied',
  );
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(
    !!lastKnownUserLocationRef.current ||
      lastKnownLocationStatusRef.current === 'granted',
  );
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>(
    lastKnownUserLocationRef.current ? 'granted' : lastKnownLocationStatusRef.current,
  );

  const nearbyMarkersState = useNearbyMarkers(region, true, isActive, {
    radiusMeters: 1800,
    category,
    enabled: !isLikesMode,
  });
  const storeMarkers = useMemo(
    () => (isLikesMode ? externalMarkers ?? [] : nearbyMarkersState.markers),
    [externalMarkers, isLikesMode, nearbyMarkersState.markers],
  );
  const markersLoading = useMemo(
    () => (isLikesMode ? Boolean(externalLoading) : nearbyMarkersState.loading),
    [externalLoading, isLikesMode, nearbyMarkersState.loading],
  );
  const markersError = useMemo(
    () => (isLikesMode ? externalError ?? null : nearbyMarkersState.error),
    [externalError, isLikesMode, nearbyMarkersState.error],
  );
  const retryMarkers = nearbyMarkersState.retry;
  const markerGroups = useMarkerGroups(storeMarkers);
  const focusedMarkerKey = useMemo(
    () => (focusedMarker ? buildMarkerKey(focusedMarker) : null),
    [focusedMarker],
  );

  const syncLocationStatus = useCallback((nextStatus: HomeLocationStatus) => {
    lastKnownLocationStatusRef.current = nextStatus;
    setLocationStatus((prev) => (prev === nextStatus ? prev : nextStatus));
  }, []);

  const updateViewportCenter = useCallback(
    (nextRegion: Region) => {
      lastKnownMapRegionRef.current = nextRegion;
      onViewportCenterChange?.({
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
      });
    },
    [onViewportCenterChange],
  );

  const animateToRegion = useCallback((nextRegion: Region) => {
    mapRef.current?.animateToRegion(nextRegion, 240);
  }, []);

  const applyMapRegion = useCallback(
    (nextRegion: Region, options?: { animated?: boolean }) => {
      setRegion((prevRegion) =>
        isRegionEquivalent(prevRegion, nextRegion) ? prevRegion : nextRegion,
      );
      updateViewportCenter(nextRegion);
      if (options?.animated !== false) {
        animateToRegion(nextRegion);
      }
    },
    [animateToRegion, updateViewportCenter],
  );

  const centerToCoordinate = useCallback(
    (coord?: LatLng | null) => {
      const target = coord ?? userLocationRef.current;
      if (!target) {
        return;
      }
      applyMapRegion({
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      });
    },
    [applyMapRegion, region.latitudeDelta, region.longitudeDelta],
  );

  const revealMarker = useCallback(
    (marker: NearbyStoreMarker) => {
      followUserRef.current = false;
      applyMapRegion({
        latitude: marker.lat - region.latitudeDelta * 0.1,
        longitude: marker.lng,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      });
    },
    [applyMapRegion, region.latitudeDelta, region.longitudeDelta],
  );

  const zoomToCluster = useCallback(
    (items: NearbyStoreMarker[]) => {
      if (items.length === 0) return;
      const latitudes = items.map((item) => item.lat);
      const longitudes = items.map((item) => item.lng);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const latitudeDelta = Math.max((maxLat - minLat) * 2.8, 0.0045);
      const longitudeDelta = Math.max((maxLng - minLng) * 2.8, 0.0045);
      followUserRef.current = false;
      applyMapRegion({
        latitude: (minLat + maxLat) / 2 - latitudeDelta * 0.04,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta,
        longitudeDelta,
      });
    },
    [applyMapRegion],
  );

  const applyUserLocation = useCallback(
    (coordinate: LatLng) => {
      const previous = userLocationRef.current;
      const moved = previous
        ? distanceMeters(previous, coordinate)
        : Number.POSITIVE_INFINITY;
      const shouldPublishLocation = !previous || moved >= 30;

      userLocationRef.current = coordinate;
      lastKnownUserLocationRef.current = coordinate;
      if (shouldPublishLocation) {
        onUserLocationResolved?.(coordinate);
      }
      setLocationPermissionGranted(true);
      setLocationPermissionDenied(false);
      syncLocationStatus('granted');

      const shouldCenterInitially = !hasCenteredUserRef.current;
      const shouldCenterPending = pendingCenterRef.current;
      const shouldFollowMovement = followUserRef.current && moved >= 30;

      if (shouldCenterInitially || shouldCenterPending || shouldFollowMovement) {
        hasCenteredUserRef.current = true;
        pendingCenterRef.current = false;
        centerToCoordinate(coordinate);
      }
    },
    [centerToCoordinate, onUserLocationResolved, syncLocationStatus],
  );

  useEffect(() => {
    onLocationStatusChange?.(locationStatus);
  }, [locationStatus, onLocationStatusChange]);

  useEffect(() => {
    onNearbyStateChange?.({
      markers: storeMarkers,
      loading: markersLoading,
      error:
        (locationStatus === 'denied' || locationStatus === 'unavailable') &&
        !lastKnownUserLocationRef.current
          ? null
          : markersError,
    });
  }, [locationStatus, markersError, markersLoading, onNearbyStateChange, storeMarkers]);

  useEffect(() => {
    if (!focusedMarker || !focusedMarkerKey) {
      lastFocusedMarkerKeyRef.current = null;
      return;
    }
    if (lastFocusedMarkerKeyRef.current === focusedMarkerKey) {
      return;
    }
    lastFocusedMarkerKeyRef.current = focusedMarkerKey;
    revealMarker(focusedMarker);
  }, [focusedMarker, focusedMarkerKey, revealMarker]);

  useEffect(() => {
    if (isLikesMode) {
      return;
    }
    if (!USE_DEVICE_LOCATION) {
      syncLocationStatus('unavailable');
      return;
    }
    if (lastKnownUserLocationRef.current) {
      setLocationPermissionGranted(true);
      setLocationPermissionDenied(false);
      syncLocationStatus('granted');
      return;
    }
    if (Platform.OS !== 'android') {
      setLocationPermissionGranted(true);
      setLocationPermissionDenied(false);
      syncLocationStatus('checking');
      return;
    }

    let cancelled = false;

    const requestPermission = async () => {
      syncLocationStatus('checking');
      try {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (cancelled) return;
        if (alreadyGranted) {
          setLocationPermissionGranted(true);
          setLocationPermissionDenied(false);
          syncLocationStatus('checking');
          return;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ANDROID_LOCATION_PERMISSION_RATIONALE,
        );
        if (cancelled) return;

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermissionGranted(true);
          setLocationPermissionDenied(false);
          syncLocationStatus('checking');
          return;
        }

        setLocationPermissionGranted(false);
        setLocationPermissionDenied(true);
        syncLocationStatus('denied');
      } catch {
        if (cancelled) return;
        setLocationPermissionGranted(false);
        setLocationPermissionDenied(false);
        syncLocationStatus('unavailable');
      }
    };

    requestPermission();

    return () => {
      cancelled = true;
    };
  }, [isLikesMode, syncLocationStatus]);

  useEffect(() => {
    if (isLikesMode) {
      return;
    }
    if (!USE_DEVICE_LOCATION) {
      return;
    }
    if (lastKnownUserLocationRef.current) {
      return;
    }
    if (!locationPermissionGranted || locationPermissionDenied) {
      return;
    }

    const geo = (
      globalThis as {
        navigator?: { geolocation?: GeoLocationApi };
      }
    ).navigator?.geolocation;

    let cancelled = false;

    if (Platform.OS === 'android') {
      getAndroidCurrentPosition().then((pos) => {
        if (cancelled) {
          return;
        }
        if (!pos) {
          if (!geo?.getCurrentPosition) {
            syncLocationStatus('unavailable');
            return;
          }
          geo.getCurrentPosition(
            (fallbackPos: GeoPosition) => {
              if (cancelled) return;
              applyUserLocation({
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
              });
            },
            (err: GeoError) => {
              if (cancelled) return;
              if (err?.code === 1) {
                setLocationPermissionGranted(false);
                setLocationPermissionDenied(true);
                syncLocationStatus('denied');
                return;
              }
              syncLocationStatus('unavailable');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
          );
          return;
        }
        applyUserLocation(pos);
      });

      return () => {
        cancelled = true;
      };
    }

    if (!geo?.getCurrentPosition) {
      return;
    }

    geo.getCurrentPosition(
      (pos: GeoPosition) => {
        if (cancelled) return;
        applyUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err: GeoError) => {
        if (cancelled) return;
        if (err?.code === 1) {
          setLocationPermissionGranted(false);
          setLocationPermissionDenied(true);
          syncLocationStatus('denied');
          return;
        }
        syncLocationStatus('unavailable');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );

    return () => {
      cancelled = true;
    };
  }, [
    applyUserLocation,
    isLikesMode,
    locationPermissionDenied,
    locationPermissionGranted,
    syncLocationStatus,
  ]);

  useEffect(() => {
    if (isLikesMode || !isActive || !USE_DEVICE_LOCATION) {
      return;
    }
    if (!locationPermissionGranted || locationPermissionDenied) {
      return;
    }

    const geo = (
      globalThis as {
        navigator?: { geolocation?: GeoLocationApi };
      }
    ).navigator?.geolocation;

    let cancelled = false;
    let watchId: number | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const handleError = (err?: GeoError) => {
      if (cancelled) return;
      if (err?.code === 1) {
        setLocationPermissionGranted(false);
        setLocationPermissionDenied(true);
        syncLocationStatus('denied');
      }
    };

    if (geo?.watchPosition) {
      watchId = geo.watchPosition(
        (pos: GeoPosition) => {
          if (cancelled) return;
          applyUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
          distanceFilter: 20,
        },
      );
    }

    if (Platform.OS === 'android') {
      const pollAndroidLocation = () => {
        getAndroidCurrentPosition().then((pos) => {
          if (cancelled || !pos) {
            return;
          }
          applyUserLocation(pos);
        });
      };
      pollAndroidLocation();
      pollId = setInterval(pollAndroidLocation, 5000);
    }

    return () => {
      cancelled = true;
      if (watchId != null) {
        geo?.clearWatch?.(watchId);
      }
      if (pollId != null) {
        clearInterval(pollId);
      }
    };
  }, [
    applyUserLocation,
    isActive,
    isLikesMode,
    locationPermissionDenied,
    locationPermissionGranted,
    syncLocationStatus,
  ]);

  useEffect(() => {
    if (!onRequestCenterUser) {
      return;
    }
    if (isLikesMode) {
      onRequestCenterUser(undefined);
      return () => {
        onRequestCenterUser(undefined);
      };
    }
    const handler = () => {
      if (!userLocationRef.current) {
        if (locationStatus === 'denied') {
          Linking.openSettings().catch(() => {});
        }
        followUserRef.current = true;
        pendingCenterRef.current = true;
        return;
      }
      followUserRef.current = true;
      pendingCenterRef.current = false;
      centerToCoordinate(userLocationRef.current);
    };
    onRequestCenterUser(handler);
    return () => {
      onRequestCenterUser(undefined);
    };
  }, [centerToCoordinate, isLikesMode, locationStatus, onRequestCenterUser]);

  useEffect(() => {
    if (!onRequestRefreshMarkers) {
      return;
    }
    if (isLikesMode) {
      onRequestRefreshMarkers(undefined);
      return () => {
        onRequestRefreshMarkers(undefined);
      };
    }
    onRequestRefreshMarkers(retryMarkers);
    return () => {
      onRequestRefreshMarkers(undefined);
    };
  }, [isLikesMode, onRequestRefreshMarkers, retryMarkers]);

  const likesMarkerSignature = useMemo(
    () =>
      storeMarkers
        .map((marker) => buildMarkerKey(marker))
        .sort()
        .join('|'),
    [storeMarkers],
  );
  const lastLikesMarkerSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!isLikesMode || storeMarkers.length === 0) {
      return;
    }
    if (lastLikesMarkerSignatureRef.current === likesMarkerSignature) {
      return;
    }
    lastLikesMarkerSignatureRef.current = likesMarkerSignature;
    zoomToCluster(storeMarkers.slice(0, 24));
  }, [isLikesMode, likesMarkerSignature, storeMarkers, zoomToCluster]);

  const handleUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) {
        return;
      }
      applyUserLocation(coordinate);
    },
    [applyUserLocation],
  );

  const handlePressMarker = useCallback(
    (marker: NearbyStoreMarker) => {
      followUserRef.current = false;
      lastMarkerInteractionAtRef.current = Date.now();
      onSelectMarker?.(marker);
    },
    [onSelectMarker],
  );

  const handlePressMap = useCallback(() => {
    followUserRef.current = false;
    const elapsed = Date.now() - lastMarkerInteractionAtRef.current;
    if (elapsed < 240) {
      return;
    }
    onPressMap?.();
  }, [onPressMap]);

  const handlePanDrag = useCallback(() => {
    followUserRef.current = false;
  }, []);

  const markerElements = useMemo(
    () =>
      markerGroups.map((group, index) => {
        if (group.type === 'cluster') {
          const items = group.items;
          const clusterKey = items
            .map((item) => buildMarkerKey(item))
            .join('|');
          return (
            <Marker
              key={`cluster-${clusterKey}-${index}`}
              coordinate={{
                latitude: group.marker.lat,
                longitude: group.marker.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => {
                lastMarkerInteractionAtRef.current = Date.now();
                zoomToCluster(items);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`가게 ${items.length}곳 묶음`}
              accessibilityHint="선택하면 지도가 확대됩니다."
            >
              {isLikesMode ? (
                <View style={styles.likesClusterMarker}>
                  <Ionicons name="heart" size={16} color="#ffffff" />
                  <Text style={styles.likesClusterCount}>{items.length}</Text>
                </View>
              ) : (
                <View style={styles.clusterMarker}>
                  <Text style={styles.clusterCount}>{items.length}</Text>
                  <Text style={styles.clusterLabel}>묶음</Text>
                </View>
              )}
            </Marker>
          );
        }

        const marker = group.marker;
        const markerKey = buildMarkerKey(marker);
        return (
          <StoreMarkerChip
            key={`single-${markerKey}`}
            marker={marker}
            markerKey={markerKey}
            mode={isLikesMode ? 'likes' : 'nearby'}
            selected={selectedMarkerKey === markerKey}
            onPress={handlePressMarker}
          />
        );
      }),
    [handlePressMarker, isLikesMode, markerGroups, selectedMarkerKey, zoomToCluster],
  );

  return (
    <View style={[styles.shell, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={
          USE_DEVICE_LOCATION &&
          !isLikesMode &&
          isActive &&
          locationPermissionGranted &&
          !locationPermissionDenied
        }
        followsUserLocation={false}
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled={false}
        onPress={handlePressMap}
        onPanDrag={handlePanDrag}
        onUserLocationChange={
          USE_DEVICE_LOCATION &&
          !isLikesMode &&
          isActive &&
          locationPermissionGranted &&
          !locationPermissionDenied
            ? handleUserLocationChange
            : undefined
        }
        onRegionChangeComplete={(nextRegion, details) => {
          if (details?.isGesture) {
            followUserRef.current = false;
          }
          if (isRegionEquivalent(region, nextRegion)) {
            return;
          }
          setRegion(nextRegion);
          updateViewportCenter(nextRegion);
        }}
      >
        {markerElements}
      </MapView>

      <View style={styles.mapShade} pointerEvents="none" />

      {(markersLoading || markersError) && (
        <View style={styles.mapStatusWrap} pointerEvents="box-none">
          {markersLoading ? (
            <View style={styles.mapStatusPill}>
              <ActivityIndicator size="small" color={HOME_COLORS.textPrimary} />
              <Text style={styles.mapStatusText}>근처 가게 불러오는 중</Text>
            </View>
          ) : null}
          {markersError ? (
            <Pressable style={styles.mapErrorPill} onPress={retryMarkers}>
              <Ionicons name="refresh-outline" size={14} color={HOME_COLORS.textOnDark} />
              <Text style={styles.mapErrorText}>다시 시도</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
};

export default memo(NearbyMapCanvas);

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#ddd4c8',
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  mapStatusWrap: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  mapStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,250,244,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(225,212,194,0.94)',
  },
  mapStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  mapErrorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(31,24,18,0.82)',
  },
  mapErrorText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
  pinFrame: {
    width: 126,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pinFrameCompact: {
    width: 58,
    height: 58,
  },
  likedPinFrame: {
    width: 54,
    height: 68,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  likedPinCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(226,201,208,0.92)',
    shadowColor: '#101827',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  likedPinCoreSelected: {
    backgroundColor: '#d14b68',
    borderColor: '#d14b68',
    transform: [{ scale: 1.06 }],
  },
  likedPinCountPill: {
    minWidth: 28,
    height: 22,
    marginTop: 4,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(226,201,208,0.92)',
  },
  likedPinCountPillSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#d14b68',
  },
  likedPinCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9f3950',
  },
  likedPinCountTextSelected: {
    color: '#d14b68',
  },
  pinHead: {
    minWidth: 92,
    maxWidth: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(220,224,230,0.96)',
    shadowColor: '#101827',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  pinHeadCompact: {
    width: 42,
    minWidth: 42,
    maxWidth: 42,
    height: 42,
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  pinHeadSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#101827',
    transform: [{ scale: 1.05 }],
  },
  pinIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,246,249,0.96)',
  },
  pinIconWrapCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'transparent',
  },
  pinIconWrapSelected: {
    backgroundColor: 'rgba(245,247,250,0.98)',
  },
  pinStoreName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  pinStoreNameSelected: {
    color: HOME_COLORS.textPrimary,
  },
  pinCountPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  pinCountPillCompact: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#111827',
  },
  pinCountPillSelected: {
    backgroundColor: '#111827',
  },
  pinCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  pinCountTextCompact: {
    fontSize: 10,
    color: '#ffffff',
  },
  pinCountTextSelected: {
    color: '#ffffff',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.97)',
    marginTop: -1,
  },
  pinTailCompact: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
  },
  pinTailSelected: {
    borderTopColor: '#ffffff',
  },
  clusterMarker: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,42,68,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#0f1624',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  likesClusterMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(209,75,104,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#732f40',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  likesClusterCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  clusterCount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f5f8ff',
  },
  clusterLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    color: '#cbd7fb',
  },
  calloutCard: {
    minWidth: 168,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,252,247,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(223,209,192,0.92)',
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  calloutSub: {
    marginTop: 4,
    fontSize: 12,
    color: HOME_COLORS.textMutedAlt,
  },
});
