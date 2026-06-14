import { useCallback, useRef, useState } from 'react';
import type { LatLng } from 'react-native-maps';

import {
  fetchRecommendations,
  type RecommendationResponse,
  type RecommendationSurface,
} from '../../../api/recommendationsApi';

type User = {
  username?: string | null;
};

type Query = {
  location?: LatLng | null;
  currentMonth?: number;
  surfaces?: RecommendationSurface[];
  enabled?: boolean;
};

type State = {
  response: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
};

const CACHE_TTL_MS = 3 * 60 * 1000;

export const useHomeRecommendations = (user: User | null, query: Query) => {
  const [state, setState] = useState<State>({
    response: null,
    loading: false,
    error: null,
  });
  const cacheRef = useRef<{ key: string; response: RecommendationResponse; fetchedAt: number } | null>(
    null,
  );

  const loadRecommendations = useCallback(
    async (force?: boolean) => {
      if (query.enabled === false) {
        return;
      }

      const loc = query.location
        ? `${query.location.latitude.toFixed(5)}:${query.location.longitude.toFixed(5)}`
        : 'none';
      const key = `${user?.username ?? 'guest'}|${loc}|${query.currentMonth ?? 'month'}|${
        query.surfaces?.join(',') ?? 'all'
      }`;
      const cached = cacheRef.current;

      if (!force && cached?.key === key && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setState({ response: cached.response, loading: false, error: null });
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: !prev.response,
          error: null,
        }));
        const response = await fetchRecommendations({
          surfaces: query.surfaces,
          limitPerSurface: 6,
          location: query.location ?? null,
          currentMonth: query.currentMonth,
        });
        cacheRef.current = { key, response, fetchedAt: Date.now() };
        setState({ response, loading: false, error: null });
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: '추천을 불러오지 못했어요.',
        }));
      }
    },
    [query.currentMonth, query.enabled, query.location, query.surfaces, user?.username],
  );

  return {
    sections: state.response?.sections ?? [],
    requestId: state.response?.requestId ?? null,
    generatedAt: state.response?.generatedAt ?? null,
    loading: state.loading,
    error: state.error,
    loadRecommendations,
  };
};
