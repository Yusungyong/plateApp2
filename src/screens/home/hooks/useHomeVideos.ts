// src/screens/home/hooks/useHomeVideos.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { fetchHomeVideoThumbnails, HomeVideoThumbnail } from '../../../api/homeVideoApi';
import type { HomeSortType, LoadingState } from '../types';
import type { LatLng } from 'react-native-maps';
import { createLogger } from '../../../utils/logger';
import { resolveHomeVideoThumbRemoteUrl } from '../utils/videoUtils';

interface User {
  username?: string;
}

type HomeVideoQuery = {
  sortType: HomeSortType;
  location?: LatLng | null;
};

type CacheEntry = {
  items: HomeVideoThumbnail[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const logger = createLogger('[useHomeVideos]');

const logVideoThumbnailUrls = (
  items: HomeVideoThumbnail[],
  cacheKey: string,
  source: 'cache' | 'network',
) => {
  logger.log(`home video thumbnail urls (${source}:${cacheKey})`);
  items.forEach((item) => {
    const createdAt = item.createdAt ?? item.updatedAt;
    const url = resolveHomeVideoThumbRemoteUrl(item.thumbnail, createdAt);
    logger.log(url ?? 'thumbnail url missing');
  });
};

export const useHomeVideos = (user: User | null, query: HomeVideoQuery) => {
  const [state, setState] = useState<LoadingState<HomeVideoThumbnail[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const cacheKey = useMemo(() => {
    const loc = query.location
      ? `${query.location.latitude.toFixed(5)}:${query.location.longitude.toFixed(5)}`
      : 'none';
    const userKey = user?.username ?? 'guest';
    return `${userKey}|${query.sortType}|${loc}`;
  }, [query.location, query.sortType, user?.username]);

  const loadVideos = useCallback(async (force?: boolean) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      logger.debug('using cached home videos', {
        cacheKey,
        count: cached.items.length,
      });
      logVideoThumbnailUrls(cached.items, cacheKey, 'cache');
      setState({ data: cached.items, loading: false, error: null });
      return;
    }
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const page = await fetchHomeVideoThumbnails(0, 8, user, {
        sortType: query.sortType,
        location: query.location,
      });
      const items = (page.content ?? []).slice(0, 4);
      logger.debug('fetched home videos', {
        cacheKey,
        total: page.content?.length ?? 0,
        visible: items.length,
        items: items.map((item) => ({
          storeId: item.storeId,
          title: item.title,
          fileName: item.fileName,
          thumbnail: item.thumbnail,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });
      logVideoThumbnailUrls(items, cacheKey, 'network');
      cacheRef.current.set(cacheKey, { items, fetchedAt: Date.now() });
      setState({ data: items, loading: false, error: null });
    } catch (e) {
      logger.warn('failed to fetch home videos', {
        cacheKey,
        sortType: query.sortType,
        location: query.location,
        error: e,
      });
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '비디오 목록을 불러오는 데 실패했습니다.',
      }));
    }
  }, [cacheKey, query.location, query.sortType, user]);

  return {
    videos: state.data,
    loading: state.loading,
    error: state.error,
    loadVideos,
  };
};
