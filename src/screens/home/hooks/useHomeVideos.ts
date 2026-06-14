// src/screens/home/hooks/useHomeVideos.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { fetchHomeVideoThumbnails, HomeVideoThumbnail } from '../../../api/homeVideoApi';
import type { HomeSortType, LoadingState } from '../types';
import type { LatLng } from 'react-native-maps';

interface User {
  username?: string;
}

type HomeVideoQuery = {
  sortType: Extract<HomeSortType, 'RECENT' | 'NEARBY'>;
  location?: LatLng | null;
};

type CacheEntry = {
  items: HomeVideoThumbnail[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;

const areVideoListsEqual = (
  previous: HomeVideoThumbnail[],
  next: HomeVideoThumbnail[],
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
      prev.storeId !== item.storeId ||
      prev.placeId !== item.placeId ||
      prev.thumbnail !== item.thumbnail ||
      prev.updatedAt !== item.updatedAt ||
      prev.createdAt !== item.createdAt
    ) {
      return false;
    }
  }

  return true;
};

export const useHomeVideos = (user: User | null, query: HomeVideoQuery) => {
  const [state, setState] = useState<LoadingState<HomeVideoThumbnail[]>>({
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
    const userKey = user?.username ?? 'guest';
    return `${userKey}|${query.sortType}|${loc}`;
  }, [query.location, query.sortType, user?.username]);

  const loadVideos = useCallback(async (force?: boolean) => {
    const location = query.location ?? null;
    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setHasLoadedOnce(true);
      setState((prev) => {
        if (
          !prev.loading &&
          prev.error == null &&
          areVideoListsEqual(prev.data, cached.items)
        ) {
          return prev;
        }
        return { data: cached.items, loading: false, error: null };
      });
      return;
    }
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const page = await fetchHomeVideoThumbnails(0, 8, null, {
        sortType: query.sortType,
        location,
      });
      const items = (page.content ?? []).slice(0, 4);
      setHasLoadedOnce(true);
      cacheRef.current.set(cacheKey, { items, fetchedAt: Date.now() });
      setState((prev) => {
        if (prev.error == null && areVideoListsEqual(prev.data, items)) {
          if (!prev.loading) {
            return prev;
          }
        }
        return { data: items, loading: false, error: null };
      });
    } catch {
      setHasLoadedOnce(true);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '비디오 목록을 불러오는 데 실패했습니다.',
      }));
    }
  }, [cacheKey, query.location, query.sortType]);

  return {
    videos: state.data,
    loading: state.loading,
    error: state.error,
    hasLoadedOnce,
    loadVideos,
  };
};
