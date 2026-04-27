import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchImageFeedGroups,
  fetchImageFeedGroupImages,
  ImageFeedGroupItem,
  ImageFeedGroupImageItem,
} from '../../../api/imageFeedApi';

type GroupData = {
  group: ImageFeedGroupItem;
  images: ImageFeedGroupImageItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export function useImageFeedGroupViewer(
  groupId: string | null | undefined,
  options?: { groupIds?: string[]; initialIndex?: number; enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [contextLoading, setContextLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, GroupData>>(new Map());
  const loadingGroupsRef = useRef<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((v) => v + 1), []);

  const imageIndexByGroupId = useRef<Map<string, number>>(new Map());
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const ensureGroupImages = useCallback(
    async (id: string, opts?: { append?: boolean }) => {
      if (!enabled) return;
      if (!id) return;

      const cached = cacheRef.current.get(id);
      if (loadingGroupsRef.current.has(id)) return;

      loadingGroupsRef.current.add(id);
      try {
        const cursor = opts?.append ? cached?.nextCursor ?? null : null;
        const res = await fetchImageFeedGroupImages(id, { limit: 5, cursor });
        const nextItems = res.items ?? [];

        const merged = opts?.append
          ? [...(cached?.images ?? []), ...nextItems]
          : nextItems;

        const nextData: GroupData = {
          group: cached?.group ?? { groupId: id },
          images: merged,
          nextCursor: res.nextCursor ?? null,
          hasMore: res.hasMore ?? false,
        };
        cacheRef.current.set(id, nextData);
        bump();
      } catch (e: any) {
        setErr(e?.message ?? '이미지 로딩 실패');
      } finally {
        loadingGroupsRef.current.delete(id);
      }
    },
    [bump, enabled],
  );

  const loadMoreImages = useCallback(
    async (id: string) => {
      const cached = cacheRef.current.get(id);
      if (!cached?.hasMore) return;
      await ensureGroupImages(id, { append: true });
    },
    [ensureGroupImages],
  );

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    (async () => {
      try {
        setContextLoading(true);
        setErr(null);

        if (options?.groupIds?.length) {
          const ids = options.groupIds.filter(Boolean);
          const fallbackIndex =
            typeof options.initialIndex === 'number'
              ? Math.max(0, Math.min(options.initialIndex, ids.length - 1))
              : Math.max(0, ids.indexOf(groupId ?? ''));
          const idx = fallbackIndex >= 0 ? fallbackIndex : 0;

          setGroupIds(ids);
          setGroupIndex(idx);

          const activeId = ids[idx];
          const savedIdx = imageIndexByGroupId.current.get(activeId) ?? 0;
          setActiveImageIndex(savedIdx);

          await ensureGroupImages(activeId);
          if (ids[idx + 1]) await ensureGroupImages(ids[idx + 1]);
          if (ids[idx - 1]) await ensureGroupImages(ids[idx - 1]);

          if (mounted) {
            setContextLoading(false);
          }
          return;
        }

        const res = await fetchImageFeedGroups({ limit: 20 });
        if (!mounted) return;

        const items = res.items ?? [];
        const ids = items.map((item) => item.groupId).filter(Boolean);
        const idx = Math.max(0, ids.indexOf(groupId ?? '') || 0);

        setGroupIds(ids);
        setGroupIndex(idx);

        items.forEach((item) => {
          if (!cacheRef.current.has(item.groupId)) {
            cacheRef.current.set(item.groupId, {
              group: item,
              images: [],
              nextCursor: null,
              hasMore: true,
            });
          }
        });

        const activeId = ids[idx];
        const savedIdx = imageIndexByGroupId.current.get(activeId) ?? 0;
        setActiveImageIndex(savedIdx);

        if (activeId) {
          await ensureGroupImages(activeId);
          if (ids[idx + 1]) await ensureGroupImages(ids[idx + 1]);
          if (ids[idx - 1]) await ensureGroupImages(ids[idx - 1]);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? '그룹 목록을 불러오지 못했습니다.');
      } finally {
        if (!mounted) return;
        setContextLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, groupId, options?.groupIds, options?.initialIndex, ensureGroupImages]);

  const activeGroupId = groupIds[groupIndex];
  const activeGroupData = useMemo(
    () => (activeGroupId ? cacheRef.current.get(activeGroupId) ?? null : null),
    [activeGroupId, tick],
  );

  const getPageData = useCallback(
    (id: string) => {
      void tick;
      return cacheRef.current.get(id) ?? null;
    },
    [tick],
  );

  const getSavedImageIndex = useCallback(
    (id: string) => imageIndexByGroupId.current.get(id) ?? 0,
    [],
  );
  const setSavedImageIndex = useCallback((id: string, idx: number) => {
    imageIndexByGroupId.current.set(id, idx);
  }, []);

  const onVerticalIndexChange = useCallback(
    (nextIndex: number) => {
      setGroupIndex(nextIndex);
    },
    [],
  );

  return {
    groupIds,
    groupIndex,
    contextLoading,
    err,
    tick,
    activeGroupId,
    activeGroupData,
    activeImageIndex,
    setActiveImageIndex,
    getPageData,
    getSavedImageIndex,
    setSavedImageIndex,
    onVerticalIndexChange,
    loadMoreImages,
  };
}
