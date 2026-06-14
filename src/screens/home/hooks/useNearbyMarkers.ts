// src/screens/home/hooks/useNearbyMarkers.ts
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { LatLng, Region } from 'react-native-maps';
import { fetchNearbyStoreMarkers, type NearbyStoreMarker } from '../../../api/mapStoreApi';

let lastNearbyMarkersCache: NearbyStoreMarker[] = [];
let lastNearbyCenterCache: LatLng | null = null;
let lastNearbyUpdatedAt = 0;
let hasNearbySnapshot = false;

const STALE_CACHE_MS = 3 * 60 * 1000;

const markerIdentity = (marker: NearbyStoreMarker) =>
  [
    marker.storeId ?? '',
    marker.placeId ?? '',
    marker.category ?? '',
    marker.lat.toFixed(6),
    marker.lng.toFixed(6),
    marker.feedCount ?? 0,
    marker.thumbnail ?? '',
    marker.contentType ?? '',
    marker.imageFeedId ?? '',
  ].join('|');

const areMarkerListsEqual = (
  previous: NearbyStoreMarker[],
  next: NearbyStoreMarker[],
) => {
  if (previous === next) {
    return true;
  }
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (markerIdentity(previous[index]) !== markerIdentity(next[index])) {
      return false;
    }
  }

  return true;
};

type MarkerFilterOptions = {
  radiusMeters?: number;
  category?: string;
  tags?: string[];
  enabled?: boolean;
};

export const useNearbyMarkers = (
  region: Region,
  interactive: boolean,
  isActive: boolean,
  options?: MarkerFilterOptions,
) => {
  const [markers, setMarkers] = useState<NearbyStoreMarker[]>(() => lastNearbyMarkersCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousRegionRef = useRef<Region | null>(null);
  const lastRequestTsRef = useRef<number>(0);
  const lastRequestCenterRef = useRef<LatLng | null>(null);
  const requestSeqRef = useRef(0);
  const lastFilterKeyRef = useRef<string>('');
  const lastHandledRetryTokenRef = useRef(0);
  const [retryToken, setRetryToken] = useState(0);

  const distanceMeters = (a: LatLng, b: LatLng) => {
    const earthRadiusMeters = 111_000;
    const dLat = (b.latitude - a.latitude) * earthRadiusMeters;
    const dLng =
      (b.longitude - a.longitude) *
      earthRadiusMeters *
      Math.cos((a.latitude * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  const autoRadiusMeters = useMemo(() => {
    const earthRadiusMeters = 111_000;
    const latMeters = region.latitudeDelta * earthRadiusMeters;
    const lngMeters =
      region.longitudeDelta *
      earthRadiusMeters *
      Math.cos((region.latitude * Math.PI) / 180);
    const approx = Math.max(latMeters, Math.abs(lngMeters)) / 2;
    return Math.min(Math.max(Math.round(approx), 300), 5000);
  }, [region.latitude, region.latitudeDelta, region.longitudeDelta]);
  const radiusMeters = options?.radiusMeters ?? autoRadiusMeters;
  const filterKey = useMemo(() => {
    const categoryKey = options?.category ?? 'all';
    const tagsKey = (options?.tags ?? []).slice().sort().join(',');
    const radiusKey = options?.radiusMeters ?? 'auto';
    return `${categoryKey}|${tagsKey}|${radiusKey}`;
  }, [options?.category, options?.radiusMeters, options?.tags]);

  const requestMarkers = useCallback(
    async (nextRegion: Region, radius: number) => {
      const res = await fetchNearbyStoreMarkers({
        lat: nextRegion.latitude,
        lng: nextRegion.longitude,
        radius,
        category: options?.category,
        tags: options?.tags,
      });
      return res.items ?? [];
    },
    [options?.category, options?.tags],
  );

  const commitMarkers = useCallback((incoming: NearbyStoreMarker[]) => {
    setMarkers((prev) => (areMarkerListsEqual(prev, incoming) ? prev : incoming));
  }, []);

  const retry = useCallback(() => {
    lastRequestTsRef.current = 0;
    setRetryToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isActive) {
      previousRegionRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }

    const forceRefresh = retryToken !== lastHandledRetryTokenRef.current;
    if (forceRefresh) {
      lastHandledRetryTokenRef.current = retryToken;
    }

    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      lastNearbyMarkersCache = [];
      lastNearbyCenterCache = null;
      lastNearbyUpdatedAt = 0;
      hasNearbySnapshot = false;
      previousRegionRef.current = null;
      lastRequestTsRef.current = 0;
      setLoading(false);
      setMarkers([]);
      setError(null);
    }

    if (options?.enabled === false) {
      setLoading(false);
      if (Date.now() - lastNearbyUpdatedAt > STALE_CACHE_MS) {
        lastNearbyMarkersCache = [];
        lastNearbyCenterCache = null;
        lastNearbyUpdatedAt = 0;
        hasNearbySnapshot = false;
        setMarkers([]);
      }
      return;
    }

    const shouldRequest = (() => {
      const prev = previousRegionRef.current;
      previousRegionRef.current = region;
      if (!prev) {
        return true;
      }
      if (!interactive) {
        const lastCenter = lastRequestCenterRef.current ?? prev;
        const moved = distanceMeters(lastCenter, region);
        const thresholdMeters = 200;
        return moved >= thresholdMeters;
      }
      const deltaLat = Math.abs(prev.latitude - region.latitude);
      const deltaLng = Math.abs(prev.longitude - region.longitude);
      const threshold = Math.max(region.latitudeDelta, region.longitudeDelta) * 0.3;
      return deltaLat > threshold || deltaLng > threshold;
    })();

    if (shouldRequest) {
      const cacheFresh =
        hasNearbySnapshot &&
        lastNearbyCenterCache &&
        Date.now() - lastNearbyUpdatedAt <= STALE_CACHE_MS;
      if (cacheFresh && !forceRefresh) {
        const cachedCenter = lastNearbyCenterCache;
        if (!cachedCenter) {
          return undefined;
        }
        const distanceFromCache = distanceMeters(cachedCenter, region);
        const reuseDistance = interactive
          ? Math.max(Math.min(radiusMeters * 0.2, 240), 120)
          : Math.max(Math.min(radiusMeters * 0.25, 360), 180);
        if (distanceFromCache <= reuseDistance) {
          commitMarkers(lastNearbyMarkersCache);
          setLoading(false);
          setError(null);
          return;
        }
      }
      const now = Date.now();
      const cooldownMs = interactive ? 1200 : 8000;
      const lastRequestCenter = lastRequestCenterRef.current;
      const centerDriftMeters = lastRequestCenter
        ? distanceMeters(lastRequestCenter, region)
        : Number.POSITIVE_INFINITY;
      const bypassCooldown =
        !interactive &&
        centerDriftMeters >= Math.max(radiusMeters * 0.8, 500);
      if (now - lastRequestTsRef.current < cooldownMs && !bypassCooldown) {
        return undefined;
      }
      lastRequestTsRef.current = now;
      requestSeqRef.current += 1;
      const requestSeq = requestSeqRef.current;
      setLoading(true);
      requestMarkers(region, radiusMeters)
        .then((items) => {
          if (requestSeq !== requestSeqRef.current) {
            setLoading(false);
            return;
          }
          setError(null);
          if (items.length > 0) {
            const nextItems = areMarkerListsEqual(lastNearbyMarkersCache, items)
              ? lastNearbyMarkersCache
              : items;
            commitMarkers(nextItems);
            hasNearbySnapshot = true;
            lastNearbyMarkersCache = nextItems;
            lastNearbyCenterCache = {
              latitude: region.latitude,
              longitude: region.longitude,
            };
            lastNearbyUpdatedAt = Date.now();
            setLoading(false);
            return;
          }
          const recentCacheStillFresh = Date.now() - lastNearbyUpdatedAt <= STALE_CACHE_MS;
          if (
            lastNearbyMarkersCache.length > 0 &&
            lastNearbyCenterCache &&
            recentCacheStillFresh
          ) {
            const distanceFromCache = distanceMeters(lastNearbyCenterCache, region);
            const keepCached = distanceFromCache <= radiusMeters * 0.6;
            commitMarkers(keepCached ? lastNearbyMarkersCache : []);
            hasNearbySnapshot = true;
            lastNearbyMarkersCache = keepCached ? lastNearbyMarkersCache : [];
            lastNearbyCenterCache = {
              latitude: region.latitude,
              longitude: region.longitude,
            };
            lastNearbyUpdatedAt = Date.now();
            setLoading(false);
            return;
          }
          hasNearbySnapshot = true;
          lastNearbyMarkersCache = [];
          lastNearbyCenterCache = {
            latitude: region.latitude,
            longitude: region.longitude,
          };
          lastNearbyUpdatedAt = Date.now();
          commitMarkers([]);
          setLoading(false);
        })
        .catch(() => {
          if (requestSeq !== requestSeqRef.current) {
            setLoading(false);
            return;
          }
          setError('주변 가게를 불러오지 못했어요.');
          const recentCacheStillFresh = Date.now() - lastNearbyUpdatedAt <= STALE_CACHE_MS;
          if (lastNearbyMarkersCache.length > 0 && recentCacheStillFresh) {
            commitMarkers(lastNearbyMarkersCache);
          } else {
            commitMarkers([]);
          }
          setLoading(false);
        });
      lastRequestCenterRef.current = {
        latitude: region.latitude,
        longitude: region.longitude,
      };
      return undefined;
    }
    return undefined;
  }, [
    filterKey,
    interactive,
    isActive,
    options?.enabled,
    radiusMeters,
    region,
    commitMarkers,
    requestMarkers,
    retryToken,
  ]);

  return { markers, loading, error, retry };
};
