// src/screens/home/hooks/useHomeMissionCandidates.ts
import { useCallback, useMemo, useRef, useState } from 'react';
import type { LatLng } from 'react-native-maps';

import { fetchHomeVideoThumbnails } from '../../../api/homeVideoApi';
import { fetchHomeImageThumbnails } from '../../../api/homeImageApi';
import type { HomeSortType, LoadingState } from '../types';

interface User {
  username?: string;
}

type HomeMissionQuery = {
  sortType: HomeSortType;
  location?: LatLng | null;
};

export type HomeMissionCandidate = {
  key: string;
  type: 'image' | 'video';
  feedNo?: number;
  storeId?: number;
  placeId?: string | null;
  storeName?: string | null;
  address?: string | null;
  thumbnail?: string | null;
  createdAt?: string | null;
};

type CacheEntry = {
  key: string;
  fetchedAt: number;
  items: HomeMissionCandidate[];
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const buildCacheKey = (query: HomeMissionQuery, user?: User | null) => {
  const lat = query.location?.latitude ?? null;
  const lng = query.location?.longitude ?? null;
  const userKey = user?.username ?? 'guest';
  if (lat == null || lng == null) {
    return `${userKey}:${query.sortType}:na`;
  }
  return `${userKey}:${query.sortType}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
};

export const useHomeMissionCandidates = (
  user: User | null,
  query: HomeMissionQuery,
  limit = 50,
) => {
  const [state, setState] = useState<LoadingState<HomeMissionCandidate[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const cacheKey = useMemo(() => buildCacheKey(query, user), [query, user]);

  const loadCandidates = useCallback(async (force = false) => {
    try {
      if (query.sortType === 'NEARBY' && !query.location) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: '현재 위치를 확인 중입니다.',
        }));
        return [] as HomeMissionCandidate[];
      }

      const cached = cacheRef.current.get(cacheKey);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setState({ data: cached.items, loading: false, error: null });
        return cached.items;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));
      const [videosPage, images] = await Promise.all([
        fetchHomeVideoThumbnails(0, limit, user, {
          sortType: query.sortType,
          location: query.location ?? null,
        }),
        fetchHomeImageThumbnails(limit, {
          sortType: query.sortType,
          location: query.location ?? null,
        }),
      ]);

      const videoItems: HomeMissionCandidate[] = (videosPage.content ?? [])
        .filter((item) => item.storeId && item.thumbnail)
        .map((item) => ({
          key: `video-${item.storeId}`,
          type: 'video' as const,
          storeId: item.storeId,
          placeId: item.placeId ?? null,
          storeName: item.storeName ?? null,
          address: item.address ?? null,
          thumbnail: item.thumbnail ?? null,
          createdAt: item.createdAt ?? item.updatedAt ?? null,
        }));

      const imageItems: HomeMissionCandidate[] = (images ?? [])
        .filter((item) => item.feedNo && item.thumbFileName)
        .map((item) => ({
          key: `image-${item.feedNo}`,
          type: 'image' as const,
          feedNo: item.feedNo,
          storeName: item.storeName ?? null,
          address: item.address ?? null,
          thumbnail: item.thumbFileName ?? null,
        }));

      const items = [...imageItems, ...videoItems];
      cacheRef.current.set(cacheKey, { key: cacheKey, fetchedAt: Date.now(), items });
      setState({ data: items, loading: false, error: null });
      return items;
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '랜덤 추천 후보를 불러오는 데 실패했습니다.',
      }));
      return [] as HomeMissionCandidate[];
    }
  }, [cacheKey, limit, query.location, query.sortType, user]);

  return {
    candidates: state.data,
    loading: state.loading,
    error: state.error,
    loadCandidates,
  };
};
