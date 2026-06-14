import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchHomeSeasonal } from '../../../api/homeSeasonalApi';
import type { LoadingState, SeasonalHomeData } from '../types';
const CACHE_TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  data: SeasonalHomeData;
  fetchedAt: number;
};

export const useHomeSeasonal = (month: number) => {
  const [state, setState] = useState<LoadingState<SeasonalHomeData | null>>({
    data: null,
    loading: false,
    error: null,
  });

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const buildCacheKey = useCallback(
    (seasonalFoodId?: number | null, basis: 'MONTH' | 'TERM' = 'MONTH', date?: string | null) =>
      `${month}|${basis}|${date ?? 'default-date'}|${seasonalFoodId ?? 'default'}`,
    [month],
  );

  const activeSeasonalFoodId = useMemo(
    () => state.data?.hero?.seasonalFoodId ?? null,
    [state.data?.hero?.seasonalFoodId],
  );

  const loadSeasonal = useCallback(
    async (options?: {
      seasonalFoodId?: number | null;
      force?: boolean;
      basis?: 'MONTH' | 'TERM';
      date?: string | null;
    }) => {
      const seasonalFoodId = options?.seasonalFoodId ?? null;
      const force = options?.force ?? false;
      const basis = options?.basis ?? 'MONTH';
      const date = options?.date ?? null;
      const cacheKey = buildCacheKey(seasonalFoodId, basis, date);
      const cached = cacheRef.current.get(cacheKey);

      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setState({ data: cached.data, loading: false, error: null });
        return cached.data;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const data = await fetchHomeSeasonal({
          month,
          seasonalFoodId,
          basis,
          date,
        });
        cacheRef.current.set(cacheKey, {
          data,
          fetchedAt: Date.now(),
        });
        setState({ data, loading: false, error: null });
        return data;
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: '제철음식 정보를 불러오는 데 실패했습니다.',
        }));
        return null;
      }
    },
    [buildCacheKey, month],
  );

  return {
    seasonal: state.data,
    loading: state.loading,
    error: state.error,
    activeSeasonalFoodId,
    loadSeasonal,
  };
};
