// src/screens/ImageFeed/hooks/useImageFeedSwipeViewer.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchImageFeedContext, fetchImageFeedViewer, ImageFeedViewerResponse } from '../../../api/imageFeedApi';

export function useImageFeedSwipeViewer(
  feedId: number,
  options?: { feedIds?: number[]; initialIndex?: number; enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
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
  const [pageDataById, setPageDataById] = useState<Map<number, ImageFeedViewerResponse>>(
    () => new Map(),
  );
  const loadingRef = useRef<Set<number>>(new Set());

  // ✅ 피드별 이미지 인덱스 기억
  const imageIndexByFeedId = useRef<Map<number, number>>(new Map());
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const setCachedFeedData = useCallback((id: number, data: ImageFeedViewerResponse) => {
    setPageDataById((prev) => {
      if (prev.get(id) === data) {
        return prev;
      }
      const next = new Map(prev);
      next.set(id, data);
      cacheRef.current = next;
      return next;
    });
  }, []);

  const ensureFeedData = useCallback(
    async (id: number) => {
      if (!enabled) return;
      if (!id) return;
      if (cacheRef.current.has(id)) return;
      if (loadingRef.current.has(id)) return;

      loadingRef.current.add(id);

      try {
        const res = await fetchImageFeedViewer(id);
        setCachedFeedData(id, res);
      } catch {
      } finally {
        loadingRef.current.delete(id);
      }
    },
    [enabled, setCachedFeedData],
  );

  // ✅ context 로딩
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    (async () => {
      try {
        setContextLoading(true);
        setErr(null);

        if (options?.feedIds?.length) {
          const ids = options.feedIds.filter(Boolean);
          const fallbackIndex =
            typeof options.initialIndex === 'number'
              ? Math.max(0, Math.min(options.initialIndex, ids.length - 1))
              : Math.max(0, ids.indexOf(feedId));
          const idx = fallbackIndex >= 0 ? fallbackIndex : 0;

          feedIdsRef.current = ids;
          setFeedIds(ids);
          setFeedIndex(idx);

          const activeId = ids[idx];
          const savedImgIdx = imageIndexByFeedId.current.get(activeId) ?? 0;
          setActiveImageIndex(savedImgIdx);

          ensureFeedData(activeId);
          if (ids[idx + 1]) ensureFeedData(ids[idx + 1]);
          if (ids[idx - 1]) ensureFeedData(ids[idx - 1]);

          if (mounted) {
            setContextLoading(false);
          }
          return;
        }

        const ctx = await fetchImageFeedContext(feedId, 3000, 50);
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
        const status = e?.response?.status;
        if (status === 404) {
          const ids = [feedId].filter(Boolean);
          feedIdsRef.current = ids;
          setFeedIds(ids);
          setFeedIndex(0);
          const savedImgIdx = imageIndexByFeedId.current.get(feedId) ?? 0;
          setActiveImageIndex(savedImgIdx);
          ensureFeedData(feedId);
          return;
        }
        setErr(e?.message ?? '컨텍스트를 불러오지 못했습니다.');
      } finally {
        if (!mounted) return;
        setContextLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, feedId, ensureFeedData, options?.feedIds, options?.initialIndex]);

  const activeFeedId = feedIds[feedIndex];
  const activeData = useMemo(
    () => (activeFeedId ? pageDataById.get(activeFeedId) ?? null : null),
    [activeFeedId, pageDataById],
  );

  const getSavedImageIndex = useCallback((id: number) => imageIndexByFeedId.current.get(id) ?? 0, []);
  const setSavedImageIndex = useCallback((id: number, idx: number) => {
    imageIndexByFeedId.current.set(id, idx);
  }, []);

  const onVerticalIndexChange = useCallback(
    (newIndex: number) => {
      const ids = feedIdsRef.current;
      const id = ids[newIndex];

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

  const removeFeedId = useCallback((id: number) => {
    if (!id) return;
    imageIndexByFeedId.current.delete(id);
    loadingRef.current.delete(id);
    setPageDataById((prev) => {
      if (!prev.has(id)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(id);
      cacheRef.current = next;
      return next;
    });

    setFeedIds((prev) => {
      const next = prev.filter((fid) => fid !== id);
      feedIdsRef.current = next;
      const nextIndex = Math.min(feedIndex, Math.max(0, next.length - 1));
      setFeedIndex(nextIndex);
      const activeId = next[nextIndex];
      if (activeId) {
        const savedImgIdx = imageIndexByFeedId.current.get(activeId) ?? 0;
        setActiveImageIndex(savedImgIdx);
        ensureFeedData(activeId);
      }
      return next;
    });
  }, [ensureFeedData, feedIndex]);

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
    pageDataById,

    // image index memory
    getSavedImageIndex,
    setSavedImageIndex,

    // vertical callback
    onVerticalIndexChange,
    removeFeedId,
  };
}
