// src/screens/home/hooks/useHomeImages.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { fetchHomeImageThumbnails } from '../../../api/homeImageApi';
import type { HomeImageThumbnail, HomeSortType, LoadingState } from '../types';
import type { LatLng } from 'react-native-maps';

type HomeImageQuery = {
  sortType: Extract<HomeSortType, 'RECENT' | 'NEARBY'>;
  location?: LatLng | null;
};

type CacheEntry = {
  items: HomeImageThumbnail[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;

const areImageListsEqual = (
  previous: HomeImageThumbnail[],
  next: HomeImageThumbnail[],
) => {
  if (previous === next) {
    return true;
  }
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const prev = previous[index];
    const item = next[index];
    if (
      prev.feedNo !== item.feedNo ||
      prev.thumbFileName !== item.thumbFileName ||
      prev.imageCount !== item.imageCount ||
      prev.createdAt !== item.createdAt
    ) {
      return false;
    }
  }

  return true;
};

export const useHomeImages = (limit: number = 6, query: HomeImageQuery) => {
  const [state, setState] = useState<LoadingState<HomeImageThumbnail[]>>({
    data: [],
    loading: false,
    error: null,
  });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const cacheKey = useMemo(() => {
    const loc = query.location
      ? `${query.location.latitude.toFixed(5)}:${query.location.longitude.toFixed(5)}`
      : 'none';
    return `${query.sortType}|${loc}|${limit}`;
  }, [query.location, query.sortType, limit]);

  const loadImages = useCallback(async (force?: boolean) => {
    const location = query.location ?? null;
    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setHasLoadedOnce(true);
      setState((prev) => {
        if (
          !prev.loading &&
          prev.error == null &&
          areImageListsEqual(prev.data, cached.items)
        ) {
          return prev;
        }
        return { data: cached.items, loading: false, error: null };
      });
      return;
    }
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const items = await fetchHomeImageThumbnails(limit, {
        sortType: query.sortType,
        location,
      });
      const safe = items ?? [];
      setHasLoadedOnce(true);
      cacheRef.current.set(cacheKey, { items: safe, fetchedAt: Date.now() });
      setState((prev) => {
        if (prev.error == null && areImageListsEqual(prev.data, safe)) {
          if (!prev.loading) {
            return prev;
          }
        }
        return { data: safe, loading: false, error: null };
      });
    } catch {
      setHasLoadedOnce(true);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '이미지 피드를 불러오는 데 실패했습니다.',
      }));
    }
  }, [cacheKey, limit, query.location, query.sortType]);

  return {
    images: state.data,
    loading: state.loading,
    error: state.error,
    hasLoadedOnce,
    loadImages,
  };
};
