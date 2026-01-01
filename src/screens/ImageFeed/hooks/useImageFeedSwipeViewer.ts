// src/screens/ImageFeed/hooks/useImageFeedSwipeViewer.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchImageFeedContext, fetchImageFeedViewer, ImageFeedViewerResponse } from '../../../api/imageFeedApi';

export function useImageFeedSwipeViewer(feedId: number) {
  const [feedIds, setFeedIds] = useState<number[]>([]);
  const [feedIndex, setFeedIndex] = useState(0);
  const [contextLoading, setContextLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ stale closure 방지
  const feedIdsRef = useRef<number[]>([]);
  useEffect(() => {
    feedIdsRef.current = feedIds;
  }, [feedIds]);

  // ✅ 캐시 + 로딩 상태
  const cacheRef = useRef<Map<number, ImageFeedViewerResponse>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((v) => v + 1), []);

  // ✅ 피드별 이미지 인덱스 기억
  const imageIndexByFeedId = useRef<Map<number, number>>(new Map());
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const ensureFeedData = useCallback(
    async (id: number) => {
      if (!id) return;
      if (cacheRef.current.has(id)) return;
      if (loadingRef.current.has(id)) return;

      console.log('[ensureFeedData start]', id);
      loadingRef.current.add(id);

      try {
        const res = await fetchImageFeedViewer(id);
        cacheRef.current.set(id, res);
        console.log('[ensureFeedData done]', id, 'images:', res.images?.length);
        bump();
      } catch (e: any) {
        console.warn('[ensureFeedData fail]', id, e?.message);
      } finally {
        loadingRef.current.delete(id);
      }
    },
    [bump],
  );

  // ✅ context 로딩
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setContextLoading(true);
        setErr(null);

        const ctx = await fetchImageFeedContext(feedId, 3000, 50);
        console.log('[ImageFeedContext]', ctx);

        if (!mounted) return;

        const ids = (ctx.feedIds?.length ? ctx.feedIds : [feedId]).filter(Boolean);
        const idx = Math.max(0, Math.min(ctx.initialIndex ?? 0, ids.length - 1));

        feedIdsRef.current = ids; // ✅ setState 전에 ref 먼저
        setFeedIds(ids);
        setFeedIndex(idx);

        const activeId = ids[idx];
        const savedImgIdx = imageIndexByFeedId.current.get(activeId) ?? 0;
        setActiveImageIndex(savedImgIdx);

        // ✅ initial + 이웃 프리패치
        ensureFeedData(activeId);
        if (ids[idx + 1]) ensureFeedData(ids[idx + 1]);
        if (ids[idx - 1]) ensureFeedData(ids[idx - 1]);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? '컨텍스트를 불러오지 못했습니다.');
      } finally {
        if (!mounted) return;
        setContextLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [feedId, ensureFeedData]);

  const activeFeedId = feedIds[feedIndex];
  const activeData = useMemo(
    () => (activeFeedId ? cacheRef.current.get(activeFeedId) ?? null : null),
    [activeFeedId, tick],
  );

  const getPageData = useCallback(
    (id: number) => {
      void tick;
      return cacheRef.current.get(id) ?? null;
    },
    [tick],
  );

  const getSavedImageIndex = useCallback((id: number) => imageIndexByFeedId.current.get(id) ?? 0, []);
  const setSavedImageIndex = useCallback((id: number, idx: number) => {
    imageIndexByFeedId.current.set(id, idx);
  }, []);

  const onVerticalIndexChange = useCallback(
    (newIndex: number) => {
      const ids = feedIdsRef.current;
      const id = ids[newIndex];

      console.log('[Vertical] viewable index', newIndex, 'feedId', id);

      setFeedIndex(newIndex);

      if (id) {
        ensureFeedData(id);

        const nextId = ids[newIndex + 1];
        const prevId = ids[newIndex - 1];
        if (nextId) ensureFeedData(nextId);
        if (prevId) ensureFeedData(prevId);

        const savedImgIdx = imageIndexByFeedId.current.get(id) ?? 0;
        setActiveImageIndex(savedImgIdx);
      }
    },
    [ensureFeedData],
  );

  return {
    // state
    feedIds,
    feedIndex,
    contextLoading,
    err,

    // active
    activeFeedId,
    activeData,
    activeImageIndex,
    setActiveImageIndex,

    // cache controls
    tick,
    getPageData,
    ensureFeedData,

    // image index memory
    getSavedImageIndex,
    setSavedImageIndex,

    // vertical callback
    onVerticalIndexChange,
  };
}
