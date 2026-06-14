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

const groupImageKey = (item: ImageFeedGroupImageItem) =>
  `${item.feedId ?? 'feed'}_${item.fileName ?? 'image'}`;

export function useImageFeedGroupViewer(
  groupId: string | null | undefined,
  options?: { groupIds?: string[]; initialIndex?: number; enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [contextLoading, setContextLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const groupIdsRef = useRef<string[]>([]);

  useEffect(() => {
    groupIdsRef.current = groupIds;
  }, [groupIds]);

  const cacheRef = useRef<Map<string, GroupData>>(new Map());
  const [pageDataById, setPageDataById] = useState<Map<string, GroupData>>(() => new Map());
  const loadingGroupsRef = useRef<Set<string>>(new Set());

  const imageIndexByGroupId = useRef<Map<string, number>>(new Map());
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const setCachedGroupData = useCallback((id: string, data: GroupData) => {
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

  const seedGroupEntries = useCallback((items: ImageFeedGroupItem[]) => {
    setPageDataById((prev) => {
      let changed = false;
      const next = new Map(prev);

      items.forEach((item) => {
        const existing = next.get(item.groupId);
        if (existing?.group === item) {
          return;
        }

        next.set(item.groupId, {
          group: item,
          images: existing?.images ?? [],
          nextCursor: existing?.nextCursor ?? null,
          hasMore: existing?.hasMore ?? true,
        });
        changed = true;
      });

      if (!changed) {
        return prev;
      }

      cacheRef.current = next;
      return next;
    });
  }, []);

  const ensureGroupImages = useCallback(
    async (id: string, opts?: { append?: boolean }) => {
      if (!enabled) return;
      if (!id) return;

      const cached = cacheRef.current.get(id);
      if (!opts?.append && cached?.images?.length) return;
      if (loadingGroupsRef.current.has(id)) return;

      loadingGroupsRef.current.add(id);
      try {
        const cursor = opts?.append ? cached?.nextCursor ?? null : null;
        const res = await fetchImageFeedGroupImages(id, { limit: 5, cursor });
        const nextItems = res.items ?? [];
        const existingKeys = new Set((cached?.images ?? []).map(groupImageKey));
        const dedupedItems = opts?.append
          ? nextItems.filter((item) => !existingKeys.has(groupImageKey(item)))
          : nextItems;

        const merged = opts?.append
          ? [...(cached?.images ?? []), ...dedupedItems]
          : dedupedItems;

        const nextData: GroupData = {
          group: cached?.group ?? { groupId: id },
          images: merged,
          nextCursor: res.nextCursor ?? null,
          hasMore: res.hasMore ?? false,
        };
        setCachedGroupData(id, nextData);
      } catch (e: any) {
        setErr(e?.message ?? '이미지 로딩 실패');
      } finally {
        loadingGroupsRef.current.delete(id);
      }
    },
    [enabled, setCachedGroupData],
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

          groupIdsRef.current = ids;
          setGroupIds(ids);
          setGroupIndex(idx);

          const activeId = ids[idx];
          const savedIdx = imageIndexByGroupId.current.get(activeId) ?? 0;
          setActiveImageIndex(savedIdx);

          if (activeId) {
            await ensureGroupImages(activeId);
          }
          if (mounted) {
            setContextLoading(false);
          }
          if (ids[idx + 1]) {
            ensureGroupImages(ids[idx + 1]).catch(() => undefined);
          }
          if (ids[idx - 1]) {
            ensureGroupImages(ids[idx - 1]).catch(() => undefined);
          }
          return;
        }

        const res = await fetchImageFeedGroups({ limit: 20 });
        if (!mounted) return;

        const items = res.items ?? [];
        const ids = items.map((item) => item.groupId).filter(Boolean);
        const idx = Math.max(0, ids.indexOf(groupId ?? '') || 0);

        groupIdsRef.current = ids;
        setGroupIds(ids);
        setGroupIndex(idx);
        seedGroupEntries(items);

        const activeId = ids[idx];
        const savedIdx = imageIndexByGroupId.current.get(activeId) ?? 0;
        setActiveImageIndex(savedIdx);

        if (activeId) {
          await ensureGroupImages(activeId);
        }
        if (mounted) {
          setContextLoading(false);
        }
        if (ids[idx + 1]) {
          ensureGroupImages(ids[idx + 1]).catch(() => undefined);
        }
        if (ids[idx - 1]) {
          ensureGroupImages(ids[idx - 1]).catch(() => undefined);
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
  }, [enabled, groupId, options?.groupIds, options?.initialIndex, ensureGroupImages, seedGroupEntries]);

  const activeGroupId = groupIds[groupIndex];
  const activeGroupData = useMemo(
    () => (activeGroupId ? pageDataById.get(activeGroupId) ?? null : null),
    [activeGroupId, pageDataById],
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
      const ids = groupIdsRef.current;
      const id = ids[nextIndex];

      setGroupIndex(nextIndex);
      if (!id) return;

      ensureGroupImages(id).catch(() => undefined);
      if (ids[nextIndex + 1]) {
        ensureGroupImages(ids[nextIndex + 1]).catch(() => undefined);
      }
      if (ids[nextIndex - 1]) {
        ensureGroupImages(ids[nextIndex - 1]).catch(() => undefined);
      }

      const savedIdx = imageIndexByGroupId.current.get(id) ?? 0;
      setActiveImageIndex(savedIdx);
    },
    [ensureGroupImages],
  );

  return {
    groupIds,
    groupIndex,
    contextLoading,
    err,
    activeGroupId,
    activeGroupData,
    activeImageIndex,
    setActiveImageIndex,
    pageDataById,
    getSavedImageIndex,
    setSavedImageIndex,
    onVerticalIndexChange,
    loadMoreImages,
  };
}
