// src/api/videoFeedApi.ts
import api from './axiosInstance';

export interface VideoFeedItem {
  storeId: number;
  placeId: string;

  title?: string | null;
  storeName?: string | null;
  address?: string | null;

  fileName?: string | null;
  thumbnail?: string | null;

  videoDuration?: number | null;

  commentCount?: number | null;
  profileImageUrl?: string | null;

  username?: string | null;

  // ✅ 좋아요 (백엔드 피드에서 내려오는 값)
  likeCount?: number | null;
  likedByMe?: boolean | null;
}

type FetchVideoFeedParams = {
  username: string;
  placeId: string;
  storeId?: number;
};

export const fetchVideoFeed = async (
  params: FetchVideoFeedParams,
): Promise<VideoFeedItem[]> => {
  const response = await api.get<VideoFeedItem[]>('/api/home/feed', { params });
  return response.data ?? [];
};


export const likeStore = async (storeId: number) => {
  await api.post(`/likes/${storeId}`);
};

export const unlikeStore = async (storeId: number) => {
  await api.delete(`/likes/${storeId}`);
};