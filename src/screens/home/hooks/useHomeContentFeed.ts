import { useCallback, useMemo, useRef, useState } from 'react';
import type { LatLng } from 'react-native-maps';

import {
  fetchHomeContentFeed,
  fetchHomeContentSearch,
  type HomeContentFeedResponse,
} from '../../../api/homeContentFeedApi';
import type { HomeContentFeedItem } from '../mockContentFeedData';

type User = {
  username?: string | null;
};

type Query = {
  location?: LatLng | null;
  enabled?: boolean;
  searchQuery?: string;
};

type LoadingState = {
  items: HomeContentFeedItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  trackingToken: string | null;
  hasLoadedOnce: boolean;
};

type CacheEntry = {
  response: HomeContentFeedResponse;
  fetchedAt: number;
};

const CACHE_TTL_MS = 3 * 60 * 1000;

export const useHomeContentFeed = (user: User | null, query: Query) => {
  const [state, setState] = useState<LoadingState>({
    items: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    nextCursor: null,
    trackingToken: null,
    hasLoadedOnce: false,
  });
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const cacheKey = useMemo(() => {
    const loc = query.location
      ? `${query.location.latitude.toFixed(5)}:${query.location.longitude.toFixed(5)}`
      : 'none';
    const search = String(query.searchQuery ?? '').trim().toLowerCase();
    return `${user?.username ?? 'guest'}|${loc}|${search}`;
  }, [query.location, query.searchQuery, user?.username]);

  const trimmedSearchQuery = useMemo(
    () => String(query.searchQuery ?? '').trim(),
    [query.searchQuery],
  );

  const loadInitial = useCallback(
    async (force?: boolean) => {
      if (query.enabled === false) {
        return;
      }
      const cached = cacheRef.current.get(cacheKey);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setState({
          items: cached.response.items,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: null,
          nextCursor: cached.response.nextCursor ?? null,
          trackingToken: cached.response.trackingToken ?? null,
          hasLoadedOnce: true,
        });
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: prev.hasLoadedOnce ? prev.loading : true,
          refreshing: prev.hasLoadedOnce,
          error: null,
        }));
        const response =
          trimmedSearchQuery.length > 0
            ? await fetchHomeContentSearch(trimmedSearchQuery, {
                limit: 10,
                location: query.location ?? null,
              })
            : await fetchHomeContentFeed({
                limit: 10,
                location: query.location ?? null,
              });
        cacheRef.current.set(cacheKey, { response, fetchedAt: Date.now() });
        setState({
          items: response.items,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: null,
          nextCursor: response.nextCursor ?? null,
          trackingToken: response.trackingToken ?? null,
          hasLoadedOnce: true,
        });
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: '컨텐츠 피드를 불러오는 데 실패했어요.',
          hasLoadedOnce: true,
        }));
      }
    },
    [cacheKey, query.enabled, query.location, trimmedSearchQuery],
  );

  const loadMore = useCallback(async () => {
    if (
      query.enabled === false ||
      state.loading ||
      state.loadingMore ||
      !state.nextCursor
    ) {
      return;
      }

      try {
        setState((prev) => ({ ...prev, loadingMore: true }));
      const response =
        trimmedSearchQuery.length > 0
          ? await fetchHomeContentSearch(trimmedSearchQuery, {
              limit: 10,
              cursor: state.nextCursor,
              location: query.location ?? null,
            })
          : await fetchHomeContentFeed({
              limit: 10,
              cursor: state.nextCursor,
              location: query.location ?? null,
            });
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...response.items].filter(
          (item, index, array) =>
            array.findIndex((candidate) => candidate.feedKey === item.feedKey) === index,
        ),
        loadingMore: false,
        nextCursor: response.nextCursor ?? null,
        trackingToken: response.trackingToken ?? prev.trackingToken,
      }));
    } catch {
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [
    query.enabled,
    query.location,
    state.loading,
    state.loadingMore,
    state.nextCursor,
    trimmedSearchQuery,
  ]);

  return {
    items: state.items,
    loading: state.loading,
    refreshing: state.refreshing,
    loadingMore: state.loadingMore,
    error: state.error,
    nextCursor: state.nextCursor,
    trackingToken: state.trackingToken,
    hasLoadedOnce: state.hasLoadedOnce,
    loadInitial,
    loadMore,
  };
};
