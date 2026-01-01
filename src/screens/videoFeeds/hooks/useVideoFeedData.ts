import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVideoFeed, VideoFeedItem } from '../../../api/videoFeedApi';

type Params = {
  username: string;
  initialStoreId: number;
  initialPlaceId: string;
};

const keyOf = (v: VideoFeedItem) => `${v.storeId}_${v.placeId}`;

export const useVideoFeedData = ({ username, initialStoreId, initialPlaceId }: Params) => {
  const [videos, setVideos] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videosRef = useRef<VideoFeedItem[]>([]);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  // loadMore 잠금
  const loadingMoreRef = useRef(false);
  const lastLoadMorePlaceIdRef = useRef<string | null>(null);

  const appendDeduped = useCallback((more: VideoFeedItem[]) => {
    if (!more?.length) return;

    setVideos(prev => {
      const existing = new Set(prev.map(keyOf));
      const deduped = more.filter(v => !existing.has(keyOf(v)));
      return prev.concat(deduped);
    });
  }, []);

  const loadMore = useCallback(
    async (placeIdForNext: string) => {
      if (!placeIdForNext) return;
      if (loadingMoreRef.current) return;
      if (lastLoadMorePlaceIdRef.current === placeIdForNext) return;

      loadingMoreRef.current = true;
      lastLoadMorePlaceIdRef.current = placeIdForNext;
      setLoadingMore(true);

      try {
        const more = await fetchVideoFeed({ username, placeId: placeIdForNext });
        if (more?.length) appendDeduped(more);
      } catch (e) {
        console.error('[VideoFeed] loadMore error', e);
        lastLoadMorePlaceIdRef.current = null;
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [appendDeduped, username],
  );

  const maybeTriggerLoadMore = useCallback(
    (currentIndex: number) => {
      const list = videosRef.current;
      const length = list.length;
      if (length < 3) return;

      const nearEnd = Math.max(0, length - 2);
      if (currentIndex < nearEnd) return;

      const cur = list[currentIndex];
      if (cur?.placeId) loadMore(cur.placeId);
    },
    [loadMore],
  );

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 초기 로딩 시 잠금 리셋
      loadingMoreRef.current = false;
      lastLoadMorePlaceIdRef.current = null;

      const data = await fetchVideoFeed({
        username,
        storeId: initialStoreId,
        placeId: initialPlaceId,
      });

      const safe = data || [];
      setVideos(safe);
      videosRef.current = safe;

      const idx = safe.findIndex(v => v.storeId === initialStoreId);
      const startIndex = idx >= 0 ? idx : 0;

      return { videos: safe, startIndex };
    } catch (e) {
      console.error('[VideoFeed] loadInitial error', e);
      setErrorMsg('동영상 피드를 불러오는데 실패했어요.');
      setVideos([]);
      videosRef.current = [];
      return { videos: [] as VideoFeedItem[], startIndex: 0 };
    } finally {
      setLoading(false);
    }
  }, [username, initialStoreId, initialPlaceId]);

  return {
    videos,
    videosRef,
    loading,
    loadingMore,
    errorMsg,
    loadInitial,
    loadMore,
    maybeTriggerLoadMore,
    setVideos,
  };
};
