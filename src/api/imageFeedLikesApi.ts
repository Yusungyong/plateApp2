// src/api/imageFeedLikesApi.ts
import api from './axiosInstance';

export type ImageFeedLikeUser = {
  userId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  activeRegion?: string | null;
  likedAt?: string | null;
};

const extractUsers = (payload: any): ImageFeedLikeUser[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
};

type FetchParams = {
  limit?: number;
  offset?: number;
};

export const fetchImageFeedLikedUsers = async (
  feedId: number,
  params: FetchParams = {},
): Promise<ImageFeedLikeUser[]> => {
  const response = await api.get<ImageFeedLikeUser[]>(`/api/image-feeds/${feedId}/likes/users`, {
    params,
  });
  return extractUsers(response.data);
};
