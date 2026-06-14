// src/screens/home/contents/HomeMapPreview.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {
  Animated,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Callout,
  LatLng,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import type { NearbyStoreMarker, StoreSuggestion } from '../../../api/mapStoreApi';
import type { HomeMapPreviewProps } from '../types';
import { useNearbyMarkers } from '../hooks/useNearbyMarkers';
import { useMarkerGroups } from '../hooks/useMarkerGroups';
import { useMapSearch } from '../hooks/useMapSearch';
import { buildImageUrl } from '../utils/imageUtils';
import {
  DEFAULT_REGION,
  calculateVisibleBounds,
  lastKnownLocationStatusRef,
  lastKnownMapRegionRef,
  lastKnownUserLocationRef,
} from '../utils/mapUtils';
import { HOME_COLORS } from '../styles/homeTokens';
import MapFilters from './MapFilters';
import MapOverlays from './MapOverlays';
import ClusterModal from './ClusterModal';
import type { HomeLocationStatus } from '../types';
import { getAndroidCurrentPosition } from '../../../native/plateLocation';

const USE_DEVICE_LOCATION = true;
const INITIAL_REGION: Region = { ...DEFAULT_REGION };
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

type StoreMapMarkerProps = {
  marker: NearbyStoreMarker;
  markerKey: string;
  selected?: boolean;
  onPressMarker: (marker: NearbyStoreMarker) => void;
};

const distanceBetweenCoordinatesMeters = (a: LatLng, b: LatLng) => {
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

const buildStoreMarkerKey = (marker: NearbyStoreMarker) => {
  if (marker.placeId) {
    return marker.placeId;
  }
  const storeId = marker.storeId ?? 'store';
  return `${storeId}-${marker.lat.toFixed(6)}-${marker.lng.toFixed(6)}`;
};

const StoreMapMarker = memo<StoreMapMarkerProps>(
  ({ marker, markerKey, selected = false, onPressMarker }) => {
  const markerImage = useMemo(() => buildImageUrl(marker.thumbnail), [marker.thumbnail]);
  const feedLabel =
    marker.feedCount && marker.feedCount > 99 ? '99+' : String(marker.feedCount ?? 0);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePrefetched, setImagePrefetched] = useState(Platform.OS !== 'android');

  useEffect(() => {
    setImageLoadFailed(false);
    setImageLoaded(false);
    setImagePrefetched(Platform.OS !== 'android');
  }, [markerImage, markerKey]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    if (!markerImage) {
      setImagePrefetched(false);
      return;
    }

    let cancelled = false;

    Image.prefetch(markerImage)
      .then((prefetched) => {
        if (cancelled) {
          return;
        }
        setImagePrefetched(prefetched);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setImagePrefetched(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marker.storeName, marker.thumbnail, markerImage, markerKey]);

  const showImageMarker =
    !!markerImage && !imageLoadFailed && (Platform.OS !== 'android' || imagePrefetched);
  const shouldTrackViewChanges = Platform.OS === 'android' ? showImageMarker && !imageLoaded : false;

  return (
    <Marker
      key={`single_${markerKey}`}
      coordinate={{ latitude: marker.lat, longitude: marker.lng }}
      title={marker.storeName || '상세정보 없음'}
      description={`피드 ${marker.feedCount ?? 0}개`}
      anchor={{ x: 0.5, y: 1 }}
      calloutAnchor={{ x: 0.5, y: 0.1 }}
      tracksViewChanges={shouldTrackViewChanges}
      onPress={() => onPressMarker(marker)}
    >
      <View style={styles.storePinFrame} collapsable={false}>
        <View
          style={[styles.storePin, selected && styles.storePinSelected]}
          collapsable={false}
        >
          {showImageMarker ? (
            <>
              <View
                style={[
                  styles.storePinImageWrap,
                  selected && styles.storePinImageWrapSelected,
                ]}
                collapsable={false}
              >
                <Image
                  source={{ uri: markerImage }}
                  style={styles.storePinImage}
                  resizeMode="cover"
                  fadeDuration={0}
                  onLoad={() => {
                    setImageLoaded(true);
                  }}
                  onLoadEnd={() => {
                    setImageLoaded(true);
                  }}
                  onError={() => {
                    setImageLoadFailed(true);
                  }}
                />
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{feedLabel}</Text>
                </View>
              </View>
              <View style={[styles.storePinTail, selected && styles.storePinTailSelected]} />
            </>
          ) : (
            <>
              <View style={[styles.storePinHead, selected && styles.storePinHeadSelected]}>
                <Text style={styles.storePinLabel}>{feedLabel}</Text>
              </View>
              <View style={[styles.storePinTail, selected && styles.storePinTailSelected]} />
            </>
          )}
        </View>
      </View>
      <Callout tooltip onPress={() => onPressMarker(marker)}>
        <View style={styles.calloutCard} collapsable={false}>
          <Text style={styles.calloutTitle} numberOfLines={1}>
            {marker.storeName || '상세정보 없음'}
          </Text>
          <Text style={styles.calloutSub}>피드 {marker.feedCount ?? 0}개</Text>
          <View style={styles.calloutCta}>
            <Text style={styles.calloutCtaText}>피드 보기</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
  },
);

const HomeMapPreview: React.FC<HomeMapPreviewProps> = ({
  onPressMarker,
  onNearbyStateChange,
  onVisibleRegionChange,
  onPressMap,
  interactive = false,
  isActive = true,
  style,
  selectedMarkerKey,
  initialFocusCoordinate,
  suspendInitialUserCentering = false,
  onRequestCenterUser,
  onLocationStatusChange,
  onUserLocationResolved,
  routePolyline,
  routeOriginCoordinate,
  routeDestinationCoordinate,
}) => {
  const [regionDeltas] = useState({
    latitudeDelta: INITIAL_REGION.latitudeDelta,
    longitudeDelta: INITIAL_REGION.longitudeDelta,
  });
  const [region, setRegion] = useState<Region>(() => {
    if (initialFocusCoordinate) {
      return {
        latitude: initialFocusCoordinate.latitude,
        longitude: initialFocusCoordinate.longitude,
        latitudeDelta: regionDeltas.latitudeDelta,
        longitudeDelta: regionDeltas.longitudeDelta,
      };
    }
    if (lastKnownMapRegionRef.current) {
      return lastKnownMapRegionRef.current;
    }
    if (lastKnownUserLocationRef.current) {
      return {
        latitude: lastKnownUserLocationRef.current.latitude,
        longitude: lastKnownUserLocationRef.current.longitude,
        latitudeDelta: regionDeltas.latitudeDelta,
        longitudeDelta: regionDeltas.longitudeDelta,
      };
    }
    return INITIAL_REGION;
  });
  const [focusCoordinate, setFocusCoordinate] = useState<LatLng | null>(null);
  const [hasCenteredUser, setHasCenteredUser] = useState(
    Boolean(interactive && (suspendInitialUserCentering || initialFocusCoordinate)),
  );
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const isDefaultRegion = useCallback(
    (candidate?: Region | null) => {
      if (!candidate) return true;
      const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
      return (
        near(candidate.latitude, DEFAULT_REGION.latitude) &&
        near(candidate.longitude, DEFAULT_REGION.longitude) &&
        near(candidate.latitudeDelta, DEFAULT_REGION.latitudeDelta) &&
        near(candidate.longitudeDelta, DEFAULT_REGION.longitudeDelta)
      );
    },
    [],
  );
  const [markersEnabled, setMarkersEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const defaultCategory = '전체';
  const defaultTag = '#전체';
  const defaultRadiusMeters = 1500;
  const [draftCategory, setDraftCategory] = useState(defaultCategory);
  const [draftTag, setDraftTag] = useState(defaultTag);
  const [draftRadiusMeters, setDraftRadiusMeters] = useState(defaultRadiusMeters);
  const [appliedCategory, setAppliedCategory] = useState(defaultCategory);
  const [appliedTag, setAppliedTag] = useState(defaultTag);
  const [appliedRadiusMeters, setAppliedRadiusMeters] = useState(defaultRadiusMeters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const categoryParam = useMemo(() => {
    switch (appliedCategory) {
      case '한식':
        return 'KOREAN';
      case '일식':
        return 'JAPANESE';
      case '중식':
        return 'CHINESE';
      case '카페':
        return 'CAFE';
      case '디저트':
        return 'DESSERT';
      default:
        return undefined;
    }
  }, [appliedCategory]);
  const tagParam = useMemo(() => {
    if (!appliedTag || appliedTag === defaultTag) return undefined;
    return appliedTag.replace(/^#/, '');
  }, [appliedTag, defaultTag]);
  const tagsParam = useMemo(() => (tagParam ? [tagParam] : []), [tagParam]);
  const {
    markers: storeMarkers,
    loading: markersLoading,
    error: markersError,
    retry: retryMarkers,
  } = useNearbyMarkers(region, interactive, isActive, {
    radiusMeters: appliedRadiusMeters,
    category: categoryParam,
    tags: tagsParam,
    enabled: markersEnabled,
  });
  const userLocationRef = useRef<LatLng | null>(lastKnownUserLocationRef.current);
  const isAnimatingRef = useRef(false);
  const pendingCenterRef = useRef(false);
  const followUserRef = useRef(
    !interactive && !suspendInitialUserCentering && !initialFocusCoordinate,
  );
  const markerGroups = useMarkerGroups(storeMarkers);
  const { suggestions, loading: suggestLoading, lastSearchedTerm } = useMapSearch(searchTerm, interactive);
  const searchTop = Math.max(insets.top + 64, 36);
  const suggestionTop = 56;
  const categoryOptions = useMemo(
    () => ['전체', '한식', '일식', '중식', '카페', '디저트'],
    [],
  );
  const tagOptions = useMemo(
    () => ['#전체', '#데이트', '#혼밥', '#뷰맛집', '#가성비', '#조용한'],
    [],
  );
  const activeFilterCount =
    (appliedCategory !== defaultCategory ? 1 : 0) +
    (appliedTag !== defaultTag ? 1 : 0) +
    (appliedRadiusMeters !== defaultRadiusMeters ? 1 : 0);
  const radiusLabel =
    draftRadiusMeters >= 1000
      ? `${(draftRadiusMeters / 1000).toFixed(1)}km`
      : `${draftRadiusMeters}m`;
  const hasPendingChanges =
    draftCategory !== appliedCategory ||
    draftTag !== appliedTag ||
    draftRadiusMeters !== appliedRadiusMeters;
  const resetFilters = () => {
    setDraftCategory(defaultCategory);
    setDraftTag(defaultTag);
    setDraftRadiusMeters(defaultRadiusMeters);
    setAppliedCategory(defaultCategory);
    setAppliedTag(defaultTag);
    setAppliedRadiusMeters(defaultRadiusMeters);
  };
  const [showApplyToast, setShowApplyToast] = useState(false);
  const applyToastOpacity = useRef(new Animated.Value(0)).current;
  const [showLoadingBadge, setShowLoadingBadge] = useState(false);
  const loadingBadgeOpacity = useRef(new Animated.Value(0)).current;
  const [clusterModal, setClusterModal] = useState<{
    title: string;
    items: NearbyStoreMarker[];
  } | null>(null);
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
  const clusterModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showClusterHint, setShowClusterHint] = useState(false);
  const clusterHintOpacity = useRef(new Animated.Value(0)).current;
  const hasShownClusterHintRef = useRef(false);
  const appliedInitialFocusKeyRef = useRef<string | null>(null);
  const appliedRouteFitKeyRef = useRef<string | null>(null);

  const initialFocusKey = useMemo(() => {
    if (!initialFocusCoordinate) return null;
    return `${initialFocusCoordinate.latitude.toFixed(6)}:${initialFocusCoordinate.longitude.toFixed(6)}`;
  }, [initialFocusCoordinate]);
  const normalizedRoutePolyline = useMemo(
    () =>
      (routePolyline ?? []).filter(
        (coord): coord is LatLng =>
          Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude),
      ),
    [routePolyline],
  );
  const routeFitCoordinates = useMemo(() => {
    if (normalizedRoutePolyline.length >= 2) {
      return normalizedRoutePolyline;
    }
    if (routeOriginCoordinate && routeDestinationCoordinate) {
      return [routeOriginCoordinate, routeDestinationCoordinate];
    }
    return [];
  }, [normalizedRoutePolyline, routeDestinationCoordinate, routeOriginCoordinate]);
  const routeFitKey = useMemo(() => {
    if (routeFitCoordinates.length < 2) {
      return null;
    }
    const first = routeFitCoordinates[0];
    const last = routeFitCoordinates[routeFitCoordinates.length - 1];
    return [
      routeFitCoordinates.length,
      first.latitude.toFixed(6),
      first.longitude.toFixed(6),
      last.latitude.toFixed(6),
      last.longitude.toFixed(6),
    ].join(':');
  }, [routeFitCoordinates]);

  useEffect(() => {
    if (interactive && suspendInitialUserCentering) {
      followUserRef.current = false;
      pendingCenterRef.current = false;
      if (initialFocusCoordinate) {
        setHasCenteredUser(true);
      }
    }
  }, [initialFocusCoordinate, interactive, suspendInitialUserCentering]);

  const syncLocationStatus = useCallback((nextStatus: HomeLocationStatus) => {
    lastKnownLocationStatusRef.current = nextStatus;
    setLocationStatus((prev) => (prev === nextStatus ? prev : nextStatus));
  }, []);

  useEffect(() => {
    onLocationStatusChange?.(locationStatus);
  }, [locationStatus, onLocationStatusChange]);

  const triggerApplyToast = useCallback(() => {
    setShowApplyToast(true);
    applyToastOpacity.stopAnimation();
    applyToastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(applyToastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(applyToastOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowApplyToast(false);
      }
    });
  }, [applyToastOpacity]);

  const triggerClusterHint = useCallback(() => {
    if (hasShownClusterHintRef.current) return;
    hasShownClusterHintRef.current = true;
    setShowClusterHint(true);
    clusterHintOpacity.stopAnimation();
    clusterHintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(clusterHintOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(clusterHintOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowClusterHint(false);
      }
    });
  }, [clusterHintOpacity]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (markersLoading) {
      timer = setTimeout(() => {
        setShowLoadingBadge(true);
        loadingBadgeOpacity.stopAnimation();
        loadingBadgeOpacity.setValue(0);
        Animated.timing(loadingBadgeOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }, 200);
    } else {
      loadingBadgeOpacity.stopAnimation();
      Animated.timing(loadingBadgeOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowLoadingBadge(false);
        }
      });
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadingBadgeOpacity, markersLoading]);

  const centerToCoordinate = useCallback(
    (coord?: LatLng | null, options?: { enableFollow?: boolean }) => {
      const latestCoord = coord ?? userLocationRef.current;
      const target =
        latestCoord ??
        (focusCoordinate ?? {
          latitude: DEFAULT_REGION.latitude,
          longitude: DEFAULT_REGION.longitude,
        });

      const duration = interactive ? 180 : 320;
      const nextRegion: Region = {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: regionDeltas.latitudeDelta,
        longitudeDelta: regionDeltas.longitudeDelta,
      };
      if (options?.enableFollow) {
        followUserRef.current = true;
      }
      pendingCenterRef.current = !latestCoord;
      isAnimatingRef.current = true;
      if (mapRef.current) {
        mapRef.current.animateToRegion(nextRegion, duration);
      } else {
        setRegion(nextRegion);
      }
      if (!interactive) {
        setRegion(nextRegion);
      }
      lastKnownMapRegionRef.current = nextRegion;
    },
    [
      focusCoordinate,
      interactive,
      regionDeltas.latitudeDelta,
      regionDeltas.longitudeDelta,
    ],
  );

  const applyFilters = () => {
    if (hasPendingChanges) {
      setAppliedCategory(draftCategory);
      setAppliedTag(draftTag);
      setAppliedRadiusMeters(draftRadiusMeters);
      if (interactive && userLocationRef.current) {
        followUserRef.current = false;
        centerToCoordinate(userLocationRef.current);
      }
      triggerApplyToast();
    }
    setFiltersVisible(false);
  };

  useEffect(() => {
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
  }, [syncLocationStatus]);

  useEffect(() => {
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
        navigator?: {
          geolocation?: {
            getCurrentPosition?: (
              success: (pos: GeoPosition) => void,
              error?: (err: GeoError) => void,
              options?: {
                enableHighAccuracy?: boolean;
                timeout?: number;
                maximumAge?: number;
              },
            ) => void;
          };
        };
      }
    ).navigator?.geolocation;
    let cancelled = false;
    const applyResolvedLocation = (latitude: number, longitude: number) => {
      const coord = { latitude, longitude };
      const nextRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: regionDeltas.latitudeDelta,
        longitudeDelta: regionDeltas.longitudeDelta,
      };
      lastKnownUserLocationRef.current = coord;
      userLocationRef.current = coord;
      onUserLocationResolved?.(coord);
      if (interactive && suspendInitialUserCentering) {
        setMarkersEnabled(true);
        setLocationPermissionGranted(true);
        setLocationPermissionDenied(false);
        syncLocationStatus('granted');
        return;
      }
      centerToCoordinate(coord, { enableFollow: true });
      if (interactive) {
        setRegion(nextRegion);
      }
      lastKnownMapRegionRef.current = nextRegion;
      setMarkersEnabled(true);
      setLocationPermissionGranted(true);
      setLocationPermissionDenied(false);
      syncLocationStatus('granted');
    };

    if (Platform.OS === 'android') {
      getAndroidCurrentPosition().then((pos) => {
        if (cancelled || !pos) {
          if (!geo?.getCurrentPosition) {
            return;
          }
          geo.getCurrentPosition(
            (fallbackPos: GeoPosition) => {
              if (cancelled) {
                return;
              }
              applyResolvedLocation(
                fallbackPos.coords.latitude,
                fallbackPos.coords.longitude,
              );
            },
            (err: GeoError) => {
              if (cancelled) {
                return;
              }
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
        applyResolvedLocation(pos.latitude, pos.longitude);
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
        if (cancelled) {
          return;
        }
        applyResolvedLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err: GeoError) => {
        if (cancelled) {
          return;
        }
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
    centerToCoordinate,
    interactive,
    locationPermissionGranted,
    locationPermissionDenied,
    onUserLocationResolved,
    regionDeltas.latitudeDelta,
    regionDeltas.longitudeDelta,
    suspendInitialUserCentering,
    syncLocationStatus,
  ]);

  useEffect(() => {
    if (!USE_DEVICE_LOCATION || !locationPermissionGranted || locationPermissionDenied) {
      return;
    }
    if (lastKnownUserLocationRef.current) {
      syncLocationStatus('granted');
      return;
    }

    const timer = setTimeout(() => {
      if (!lastKnownUserLocationRef.current) {
        syncLocationStatus('unavailable');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    locationPermissionDenied,
    locationPermissionGranted,
    syncLocationStatus,
  ]);

  const handleUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      if (!USE_DEVICE_LOCATION) {
        return;
      }

      const { latitude, longitude } = event.nativeEvent.coordinate || {};
      if (latitude == null || longitude == null) {
        return;
      }

      const coord = { latitude, longitude };
      const previousCoord = userLocationRef.current;
      const movedMeters = previousCoord
        ? distanceBetweenCoordinatesMeters(previousCoord, coord)
        : Number.POSITIVE_INFINITY;
      const minMovementMeters = interactive ? 12 : 35;
      userLocationRef.current = coord;
      lastKnownUserLocationRef.current = coord;
      onUserLocationResolved?.(coord);
      setLocationPermissionGranted(true);
      setLocationPermissionDenied(false);
      syncLocationStatus('granted');
      if (
        previousCoord &&
        movedMeters < minMovementMeters &&
        hasCenteredUser &&
        !pendingCenterRef.current
      ) {
        return;
      }
      if (interactive && !followUserRef.current && hasCenteredUser) {
        return;
      }
      const nextRegion: Region = {
        latitude: coord.latitude,
        longitude: coord.longitude,
        latitudeDelta: regionDeltas.latitudeDelta,
        longitudeDelta: regionDeltas.longitudeDelta,
      };

      if (!hasCenteredUser) {
        if (suspendInitialUserCentering) {
          setMarkersEnabled(true);
          return;
        }
        centerToCoordinate(coord, { enableFollow: true });
        setHasCenteredUser(true);
        if (interactive) {
          setRegion(nextRegion);
        }
        lastKnownMapRegionRef.current = nextRegion;
        setMarkersEnabled(true);
        return;
      }

      if (!followUserRef.current) {
        pendingCenterRef.current = false;
        return;
      }

      pendingCenterRef.current = false;
      if (interactive) {
        setRegion(nextRegion);
      }
      lastKnownMapRegionRef.current = nextRegion;
      centerToCoordinate(coord);
      setMarkersEnabled(true);
    },
    [
      centerToCoordinate,
      hasCenteredUser,
      interactive,
      onUserLocationResolved,
      regionDeltas.latitudeDelta,
      regionDeltas.longitudeDelta,
      suspendInitialUserCentering,
      syncLocationStatus,
    ],
  );

  const handleSelectSuggestion = useCallback(
    (item: StoreSuggestion) => {
      setSearchTerm(item.storeName);
      const coord = { latitude: item.lat, longitude: item.lng };
      pendingCenterRef.current = false;
      followUserRef.current = false;
      setFocusCoordinate(coord);
      centerToCoordinate(coord);
      setMarkersEnabled(true);
    },
    [centerToCoordinate],
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setFocusCoordinate(null);
  }, []);

  const visibleBounds = useMemo(() => calculateVisibleBounds(region), [region]);

  useEffect(() => {
    if (!onVisibleRegionChange) {
      return;
    }

    onVisibleRegionChange({
      center: region,
      bounds: visibleBounds,
    });
  }, [onVisibleRegionChange, visibleBounds, region]);

  useEffect(() => {
    onNearbyStateChange?.({
      markers: storeMarkers,
      loading: markersLoading,
      error: markersError,
    });
  }, [markersError, markersLoading, onNearbyStateChange, storeMarkers]);

  useEffect(() => {
    if (!interactive || !isActive || !initialFocusCoordinate || !initialFocusKey) {
      return;
    }
    if (appliedInitialFocusKeyRef.current === initialFocusKey) {
      return;
    }

    appliedInitialFocusKeyRef.current = initialFocusKey;
    followUserRef.current = false;
    pendingCenterRef.current = false;
    setHasCenteredUser(true);
    setFocusCoordinate(initialFocusCoordinate);
    setMarkersEnabled(true);

    const nextRegion: Region = {
      latitude: initialFocusCoordinate.latitude,
      longitude: initialFocusCoordinate.longitude,
      latitudeDelta: regionDeltas.latitudeDelta,
      longitudeDelta: regionDeltas.longitudeDelta,
    };

    setRegion(nextRegion);
    lastKnownMapRegionRef.current = nextRegion;
    isAnimatingRef.current = true;

    if (mapRef.current) {
      mapRef.current.animateToRegion(nextRegion, 220);
    }
  }, [
    initialFocusCoordinate,
    initialFocusKey,
    interactive,
    isActive,
    regionDeltas.latitudeDelta,
    regionDeltas.longitudeDelta,
    suspendInitialUserCentering,
  ]);

  useEffect(() => {
    if (!interactive || !isActive) {
      return;
    }
    if (!routeFitKey || routeFitCoordinates.length < 2) {
      appliedRouteFitKeyRef.current = null;
      return;
    }
    if (appliedRouteFitKeyRef.current === routeFitKey) {
      return;
    }

    appliedRouteFitKeyRef.current = routeFitKey;
    followUserRef.current = false;
    pendingCenterRef.current = false;
    setHasCenteredUser(true);
    setMarkersEnabled(true);
    isAnimatingRef.current = true;

    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(routeFitCoordinates, {
        animated: true,
        edgePadding: {
          top: Math.max(insets.top + 100, 120),
          right: 56,
          bottom: Math.max(insets.bottom + 160, 200),
          left: 56,
        },
      });
    });
  }, [interactive, isActive, insets.bottom, insets.top, routeFitCoordinates, routeFitKey]);

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      if (!interactive) {
        return;
      }
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
      } else {
        followUserRef.current = false;
      }
      setRegion(nextRegion);
      lastKnownMapRegionRef.current = nextRegion;
      if (!markersEnabled && !isDefaultRegion(nextRegion)) {
        setMarkersEnabled(true);
      }
    },
    [interactive, isDefaultRegion, markersEnabled],
  );

  const handleMapPan = useCallback(() => {
    followUserRef.current = false;
    pendingCenterRef.current = false;
  }, []);

  const handleMapTouchStart = useCallback(() => {
    followUserRef.current = false;
    pendingCenterRef.current = false;
  }, []);

  const handlePressMarker = useCallback(
    (marker: NearbyStoreMarker) => {
      onPressMarker?.(marker);
    },
    [onPressMarker],
  );

  const zoomToCluster = useCallback(
    (marker: NearbyStoreMarker) => {
      if (!interactive) {
        onPressMarker?.(marker);
        return;
      }
      const nextRegion: Region = {
        latitude: marker.lat,
        longitude: marker.lng,
        latitudeDelta: Math.max(regionDeltas.latitudeDelta * 0.6, 0.002),
        longitudeDelta: Math.max(regionDeltas.longitudeDelta * 0.6, 0.002),
      };
      if (mapRef.current) {
        mapRef.current.animateToRegion(nextRegion, 220);
      } else {
        setRegion(nextRegion);
      }
      lastKnownMapRegionRef.current = nextRegion;
    },
    [interactive, onPressMarker, regionDeltas.latitudeDelta, regionDeltas.longitudeDelta],
  );

  const handleClusterPress = useCallback(
    (group: { marker: NearbyStoreMarker; items: NearbyStoreMarker[] }) => {
      if (!group.items.length) {
        return;
      }
      zoomToCluster(group.marker);
      if (interactive) {
        triggerClusterHint();
      }
      if (clusterModalTimerRef.current) {
        clearTimeout(clusterModalTimerRef.current);
      }
      const openModal = () => {
        setClusterModal({
          title: group.marker.storeName || '이 위치의 가게',
          items: group.items,
        });
      };
      if (interactive) {
        clusterModalTimerRef.current = setTimeout(openModal, 240);
      } else {
        openModal();
      }
    },
    [interactive, triggerClusterHint, zoomToCluster],
  );

  useEffect(() => {
    if (!onRequestCenterUser) {
      return;
    }
    const handler = () => {
      if (!userLocationRef.current) {
        if (locationStatus === 'denied') {
          Linking.openSettings().catch(() => {});
        }
        return;
      }
      followUserRef.current = true;
      centerToCoordinate(userLocationRef.current, { enableFollow: true });
    };
    onRequestCenterUser(() => handler);
    return () => {
      onRequestCenterUser(undefined);
    };
  }, [centerToCoordinate, locationStatus, onRequestCenterUser]);

  useEffect(() => {
    return () => {
      if (clusterModalTimerRef.current) {
        clearTimeout(clusterModalTimerRef.current);
      }
    };
  }, []);

  const buildMarkerKey = useCallback((marker: NearbyStoreMarker) => {
    return buildStoreMarkerKey(marker);
  }, []);

  const markerElements = useMemo(
    () =>
      markerGroups.map((group) => {
        const markerKey = buildMarkerKey(group.marker);
        if (group.type === 'cluster') {
          const { marker, items, totalFeedCount } = group;
          const clusterKey = items
            .map(buildMarkerKey)
            .sort()
            .join('|');
          return (
            <Marker
              key={`cluster_${clusterKey}`}
              coordinate={{ latitude: marker.lat, longitude: marker.lng }}
              title={marker.storeName || '복합 매장'}
              description={`같은 위치 ${items.length}곳 / 피드 ${totalFeedCount}`}
              anchor={{ x: 0.5, y: 1 }}
              calloutAnchor={{ x: 0.5, y: 0.1 }}
              tracksViewChanges={false}
              onPress={() => handleClusterPress({ marker, items })}
            >
              <View style={styles.clusterPinFrame} collapsable={false}>
                <View style={styles.clusterPin}>
                  <Text style={styles.clusterCount}>{items.length}곳</Text>
                  <Text style={styles.clusterFeed}>피드 {totalFeedCount}</Text>
                </View>
                <View style={styles.clusterTail} />
              </View>
            </Marker>
          );
        }
        const marker = group.marker;
        return (
          <StoreMapMarker
            key={`single_${markerKey}`}
            marker={marker}
            markerKey={markerKey}
            selected={selectedMarkerKey === markerKey}
            onPressMarker={handlePressMarker}
          />
        );
      }),
    [
      buildMarkerKey,
      handlePressMarker,
      handleClusterPress,
      markerGroups,
      selectedMarkerKey,
    ],
  );

  return (
    <View style={[styles.card, interactive && styles.cardInteractive, style]}>
      {interactive && (
        <MapFilters
          searchTerm={searchTerm}
          onChangeSearchTerm={setSearchTerm}
          onClearSearch={handleClearSearch}
          suggestions={suggestions}
          suggestLoading={suggestLoading}
          lastSearchedTerm={lastSearchedTerm}
          onSelectSuggestion={handleSelectSuggestion}
          searchTop={searchTop}
          suggestionTop={suggestionTop}
          filtersVisible={filtersVisible}
          onToggleFilters={() => setFiltersVisible(prev => !prev)}
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onApplyFilters={applyFilters}
          hasPendingChanges={hasPendingChanges}
          categoryOptions={categoryOptions}
          tagOptions={tagOptions}
          draftCategory={draftCategory}
          onSelectCategory={setDraftCategory}
          draftTag={draftTag}
          onSelectTag={setDraftTag}
          radiusMeters={draftRadiusMeters}
          onChangeRadius={setDraftRadiusMeters}
          radiusLabel={radiusLabel}
        />
      )}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        showsUserLocation={USE_DEVICE_LOCATION && locationPermissionGranted && !locationPermissionDenied}
        followsUserLocation={false}
        showsMyLocationButton={
          USE_DEVICE_LOCATION &&
          interactive &&
          locationPermissionGranted &&
          !locationPermissionDenied &&
          !onRequestCenterUser
        }
        onUserLocationChange={
          USE_DEVICE_LOCATION && locationPermissionGranted && !locationPermissionDenied
            ? handleUserLocationChange
            : undefined
        }
        initialRegion={region}
        region={interactive ? undefined : region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={interactive ? handleMapPan : undefined}
        onTouchStart={interactive ? handleMapTouchStart : undefined}
      >
        {normalizedRoutePolyline.length >= 2 ? (
          <Polyline
            coordinates={normalizedRoutePolyline}
            strokeColor="#1F1F1F"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {routeOriginCoordinate ? (
          <Marker
            coordinate={routeOriginCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.routeOriginOuter}>
              <View style={styles.routeOriginInner} />
            </View>
          </Marker>
        ) : null}
        {focusCoordinate && (
          <Marker
            coordinate={focusCoordinate}
            title={normalizedRoutePolyline.length >= 2 ? '도착지' : '선택한 위치'}
            description={
              normalizedRoutePolyline.length >= 2
                ? '길찾기 목적지예요.'
                : '이 위치 기준으로 지도를 둘러보고 있어요.'
            }
          />
        )}
        {markerElements}
      </MapView>
      <ClusterModal
        visible={!!clusterModal}
        title={clusterModal?.title ?? ''}
        items={clusterModal?.items ?? []}
        onClose={() => setClusterModal(null)}
        onSelectItem={(item) => {
          setClusterModal(null);
          handlePressMarker(item);
        }}
      />
      <MapOverlays
        showApplyToast={showApplyToast}
        applyToastOpacity={applyToastOpacity}
        showClusterHint={showClusterHint}
        clusterHintOpacity={clusterHintOpacity}
        showLoadingBadge={showLoadingBadge}
        loadingBadgeOpacity={loadingBadgeOpacity}
        markersError={
          (locationStatus === 'denied' || locationStatus === 'unavailable') &&
          !lastKnownUserLocationRef.current
            ? null
            : markersError
        }
        onRetryMarkers={retryMarkers}
        showCta={false}
        onPressMap={onPressMap}
        locationPromptStatus={
          !lastKnownUserLocationRef.current &&
          (locationStatus === 'denied' || locationStatus === 'unavailable')
            ? locationStatus
            : null
        }
        onOpenSettings={() => {
          Linking.openSettings().catch(() => {});
        }}
      />
      {interactive && filtersVisible && (
        <Pressable
          style={styles.filterBackdrop}
          onPress={() => setFiltersVisible(false)}
        />
      )}
    </View>
  );
};

export default memo(HomeMapPreview);

const styles = StyleSheet.create({
  card: {
    minHeight: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 6,
    backgroundColor: HOME_COLORS.skeletonStrong,
  },
  cardInteractive: {
    flex: 1,
    marginTop: 0,
    borderRadius: 0,
  },
  storePinFrame: {
    width: 64,
    height: 78,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  storePin: {
    alignItems: 'center',
    width: 64,
  },
  storePinSelected: {
    transform: [{ scale: 1.04 }],
  },
  storePinImageWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: HOME_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: HOME_COLORS.textOnDark,
    shadowColor: HOME_COLORS.overlayDark,
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  storePinImageWrapSelected: {
    borderColor: '#f7efe2',
    borderWidth: 3,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 7,
  },
  storePinHead: {
    backgroundColor: HOME_COLORS.mapAccent,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: HOME_COLORS.overlayDark,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  storePinHeadSelected: {
    backgroundColor: '#df7a5b',
  },
  storePinLabel: {
    color: HOME_COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  storePinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: HOME_COLORS.mapAccent,
    marginTop: -1,
  },
  storePinTailSelected: {
    borderTopColor: '#df7a5b',
  },
  storePinImage: {
    width: 54,
    height: 54,
    backgroundColor: HOME_COLORS.skeletonStrong,
  },
  imageBadge: {
    position: 'absolute',
    bottom: -4,
    right: -2,
    backgroundColor: HOME_COLORS.mapAccent,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  imageBadgeText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 10,
    fontWeight: '600',
  },
  clusterPinFrame: {
    width: 92,
    height: 74,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  clusterPin: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.mapCluster,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: HOME_COLORS.mapClusterBorder,
    borderWidth: 1,
  },
  clusterTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: HOME_COLORS.mapCluster,
    marginTop: -1,
  },
  clusterCount: {
    color: HOME_COLORS.textOnDark,
    fontSize: 13,
    fontWeight: '700',
  },
  clusterFeed: {
    color: HOME_COLORS.mapClusterText,
    fontSize: 11,
    marginTop: 2,
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  calloutCard: {
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.overlayLight,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: HOME_COLORS.ink,
  },
  calloutSub: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.textMuted,
  },
  calloutCta: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.ink,
  },
  calloutCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.textOnDark,
  },
  routeOriginOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: HOME_COLORS.overlayDark,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  routeOriginInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
  },
});
