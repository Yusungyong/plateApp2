// src/screens/home/hooks/useNearbyMarkers.ts
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { LatLng, Region } from 'react-native-maps';
import { fetchNearbyStoreMarkers, type NearbyStoreMarker } from '../../../api/mapStoreApi';
import { createLogger } from '../../../utils/logger';

let lastNearbyMarkersCache: NearbyStoreMarker[] = [];
let lastNearbyCenterCache: LatLng | null = null;
let lastNearbyUpdatedAt = 0;

const STALE_CACHE_MS = 3 * 60 * 1000;
const logger = createLogger('[useNearbyMarkers]');

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

    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      lastNearbyMarkersCache = [];
      lastNearbyCenterCache = null;
      lastNearbyUpdatedAt = 0;
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
      if (bypassCooldown) {
        logger.debug('bypassing nearby marker cooldown for location jump', {
          centerDriftMeters,
          radiusMeters,
          previousCenter: lastRequestCenter,
          nextCenter: {
            latitude: region.latitude,
            longitude: region.longitude,
          },
        });
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
          logger.debug('fetched nearby markers', {
            center: {
              latitude: region.latitude,
              longitude: region.longitude,
            },
            radiusMeters,
            total: items.length,
            items: items.slice(0, 6).map((item) => ({
              storeId: item.storeId,
              placeId: item.placeId,
              storeName: item.storeName,
              thumbnail: item.thumbnail,
              contentType: item.contentType,
              feedCount: item.feedCount,
              lat: item.lat,
              lng: item.lng,
            })),
          });
          setError(null);
          if (items.length > 0) {
            setMarkers(items);
            lastNearbyMarkersCache = items;
            lastNearbyCenterCache = {
              latitude: region.latitude,
              longitude: region.longitude,
            };
            lastNearbyUpdatedAt = Date.now();
            setLoading(false);
            return;
          }
          const cacheFresh = Date.now() - lastNearbyUpdatedAt <= STALE_CACHE_MS;
          if (lastNearbyMarkersCache.length > 0 && lastNearbyCenterCache && cacheFresh) {
            const distanceFromCache = distanceMeters(lastNearbyCenterCache, region);
            const keepCached = distanceFromCache <= radiusMeters * 0.6;
            setMarkers(keepCached ? lastNearbyMarkersCache : []);
            setLoading(false);
            return;
          }
          setMarkers([]);
          setLoading(false);
        })
        .catch(() => {
          if (requestSeq !== requestSeqRef.current) {
            setLoading(false);
            return;
          }
          logger.warn('failed to fetch nearby markers', {
            center: {
              latitude: region.latitude,
              longitude: region.longitude,
            },
            radiusMeters,
            interactive,
            filterKey,
          });
          setError('주변 가게를 불러오지 못했어요.');
          const cacheFresh = Date.now() - lastNearbyUpdatedAt <= STALE_CACHE_MS;
          if (lastNearbyMarkersCache.length > 0 && cacheFresh) {
            setMarkers(lastNearbyMarkersCache);
          } else {
            setMarkers([]);
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
    requestMarkers,
    retryToken,
  ]);

  return { markers, loading, error, retry };
};
