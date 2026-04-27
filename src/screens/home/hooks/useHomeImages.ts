// src/screens/home/hooks/useHomeImages.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { fetchHomeImageThumbnails } from '../../../api/homeImageApi';
import type { HomeImageThumbnail, HomeSortType, LoadingState } from '../types';
import type { LatLng } from 'react-native-maps';
import { createLogger } from '../../../utils/logger';

type HomeImageQuery = {
  sortType: HomeSortType;
  location?: LatLng | null;
};

type CacheEntry = {
  items: HomeImageThumbnail[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const logger = createLogger('[useHomeImages]');

export const useHomeImages = (limit: number = 6, query: HomeImageQuery) => {
  const [state, setState] = useState<LoadingState<HomeImageThumbnail[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const cacheKey = useMemo(() => {
    const loc = query.location
      ? `${query.location.latitude.toFixed(5)}:${query.location.longitude.toFixed(5)}`
      : 'none';
    return `${query.sortType}|${loc}|${limit}`;
  }, [query.location, query.sortType, limit]);

  const loadImages = useCallback(async (force?: boolean) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      logger.debug('using cached home images', {
        cacheKey,
        count: cached.items.length,
      });
      setState({ data: cached.items, loading: false, error: null });
      return;
    }
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const items = await fetchHomeImageThumbnails(limit, {
        sortType: query.sortType,
        location: query.location,
      });
      const safe = items ?? [];
      logger.debug('fetched home images', {
        cacheKey,
        count: safe.length,
        items: safe.map((item) => ({
          feedNo: item.feedNo,
          thumbFileName: item.thumbFileName,
          storeName: item.storeName,
          createdAt: item.createdAt,
          imageCount: item.imageCount,
        })),
      });
      cacheRef.current.set(cacheKey, { items: safe, fetchedAt: Date.now() });
      setState({ data: safe, loading: false, error: null });
    } catch (e: any) {
      logger.warn('failed to fetch home images', {
        cacheKey,
        sortType: query.sortType,
        location: query.location,
        error: e,
      });
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
    loadImages,
  };
};
