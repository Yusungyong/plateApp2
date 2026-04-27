// src/hooks/useLike.ts
import { useState, useCallback, useEffect } from 'react';
import { toggleImageFeedLike, toggleVideoFeedLike } from '../api/likesApi';

type UseLikeParams = {
  initialIsLiked?: boolean;
  initialLikeCount?: number;
  onSuccess?: (isLiked: boolean, likeCount: number) => void;
  onError?: (error: Error) => void;
};

export const useImageFeedLike = (feedId: number, params: UseLikeParams = {}) => {
  const { initialIsLiked = false, initialLikeCount = 0, onSuccess, onError } = params;

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  // feedId나 초기값이 변경되면 상태 동기화
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
  }, [feedId, initialIsLiked, initialLikeCount]);

  const toggleLike = useCallback(async () => {
    if (loading) return;

    const prevIsLiked = isLiked;
    const prevCount = likeCount;

    // Optimistic UI update
    setIsLiked(!prevIsLiked);
    setLikeCount(prevCount + (prevIsLiked ? -1 : 1));
    setLoading(true);

    try {
      const result = await toggleImageFeedLike(feedId);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
      onSuccess?.(result.isLiked, result.likeCount);
    } catch (err) {
      // Rollback on error
      setIsLiked(prevIsLiked);
      setLikeCount(prevCount);
      const error = err instanceof Error ? err : new Error('Failed to toggle like');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [feedId, isLiked, likeCount, loading, onSuccess, onError]);

  return {
    isLiked,
    likeCount,
    loading,
    toggleLike,
    setIsLiked,
    setLikeCount,
  };
};

export const useVideoFeedLike = (storeId: number, params: UseLikeParams = {}) => {
  const { initialIsLiked = false, initialLikeCount = 0, onSuccess, onError } = params;

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  // storeId나 초기값이 변경되면 상태 동기화
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
  }, [storeId, initialIsLiked, initialLikeCount]);

  const toggleLike = useCallback(async () => {
    if (loading) return;

    const prevIsLiked = isLiked;
    const prevCount = likeCount;

    // Optimistic UI update
    setIsLiked(!prevIsLiked);
    setLikeCount(prevCount + (prevIsLiked ? -1 : 1));
    setLoading(true);

    try {
      const result = await toggleVideoFeedLike(storeId);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
      onSuccess?.(result.isLiked, result.likeCount);
    } catch (err) {
      // Rollback on error
      setIsLiked(prevIsLiked);
      setLikeCount(prevCount);
      const error = err instanceof Error ? err : new Error('Failed to toggle like');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [storeId, isLiked, likeCount, loading, onSuccess, onError]);

  return {
    isLiked,
    likeCount,
    loading,
    toggleLike,
    setIsLiked,
    setLikeCount,
  };
};
