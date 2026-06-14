import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  sendHomeImpressions,
  type HomeImpressionItem,
} from '../../../api/homeImpressionApi';
import type { HomeContentFeedItem } from '../mockContentFeedData';

type User = {
  username?: string | null;
};

type TrackContentFeedParams = {
  item: HomeContentFeedItem;
  positionNo?: number | null;
  requestId?: string | null;
};

const BATCH_SIZE = 5;
const FLUSH_DELAY_MS = 2500;

const buildSessionId = () =>
  `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const getContentIdentity = (item: HomeContentFeedItem) => {
  if (item.contentType === 'VIDEO') {
    return item.storeId > 0 ? `VIDEO:${item.storeId}` : null;
  }

  const feedNo = item.imageFeedId ?? item.feedId;
  return feedNo > 0 ? `IMAGE:${feedNo}` : null;
};

const toImpressionItem = (
  item: HomeContentFeedItem,
  positionNo?: number | null,
): HomeImpressionItem | null => {
  if (item.contentType === 'VIDEO') {
    if (!item.storeId || item.storeId <= 0) {
      return null;
    }
    return {
      contentType: 'VIDEO',
      storeId: item.storeId,
      positionNo: positionNo ?? null,
      clientImpressedAt: new Date().toISOString(),
    };
  }

  const feedNo = item.imageFeedId ?? item.feedId;
  if (!feedNo || feedNo <= 0) {
    return null;
  }
  return {
    contentType: 'IMAGE',
    feedNo,
    positionNo: positionNo ?? null,
    clientImpressedAt: new Date().toISOString(),
  };
};

export const useHomeImpressionTracker = (user: User | null) => {
  const sessionId = useMemo(buildSessionId, []);
  const sentKeysRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<
    Array<{
      requestId?: string | null;
      item: HomeImpressionItem;
    }>
  >([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);
  const isAuthenticated = Boolean(user?.username);

  const clearFlushTimer = useCallback(() => {
    if (!flushTimerRef.current) {
      return;
    }
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) {
      return;
    }

    clearFlushTimer();
    flushingRef.current = true;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    const groupedByRequest = new Map<string, HomeImpressionItem[]>();
    const requestIdByKey = new Map<string, string | null>();

    batch.forEach(({ requestId, item }) => {
      const key = requestId ?? '';
      const prev = groupedByRequest.get(key) ?? [];
      prev.push(item);
      groupedByRequest.set(key, prev);
      requestIdByKey.set(key, requestId ?? null);
    });

    try {
      await Promise.all(
        Array.from(groupedByRequest.entries()).map(([key, items]) =>
          sendHomeImpressions(items, {
            surface: 'home',
            requestId: requestIdByKey.get(key) ?? null,
            sessionId,
            isAuthenticated,
          }),
        ),
      );
    } catch {
      // 서버 실패 시에도 같은 렌더링 세션 중복 전송은 막는다.
    } finally {
      flushingRef.current = false;
      if (queueRef.current.length > 0) {
        flushTimerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    }
  }, [clearFlushTimer, isAuthenticated, sessionId]);

  const scheduleFlush = useCallback(() => {
    if (queueRef.current.length >= BATCH_SIZE) {
      flush().catch(() => {});
      return;
    }
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
    }
  }, [flush]);

  const trackContentFeedImpression = useCallback(
    ({ item, positionNo, requestId }: TrackContentFeedParams) => {
      if (item.isMock) {
        return;
      }
      const identity = getContentIdentity(item);
      if (!identity || sentKeysRef.current.has(identity)) {
        return;
      }

      const impression = toImpressionItem(item, positionNo);
      if (!impression) {
        return;
      }

      sentKeysRef.current.add(identity);
      queueRef.current.push({ requestId: requestId ?? null, item: impression });
      scheduleFlush();
    },
    [scheduleFlush],
  );

  useEffect(
    () => () => {
      clearFlushTimer();
      flush().catch(() => {});
    },
    [clearFlushTimer, flush],
  );

  return {
    trackContentFeedImpression,
    flushHomeImpressions: flush,
  };
};
