// src/api/likeUsersApi.ts
import api from './axiosInstance';

export type StoreLikeUser = {
  userId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  activeRegion?: string | null;
  likedAt?: string | null;
};

type FetchLikedUsersParams = {
  limit?: number;
  offset?: number;
};

const extractUsers = (payload: any): StoreLikeUser[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
};

export const fetchStoreLikedUsers = async (
  storeId: number,
  params: FetchLikedUsersParams = {},
): Promise<StoreLikeUser[]> => {
  const response = await api.get<StoreLikeUser[]>(`/api/likes/${storeId}/users`, {
    params,
  });
  return extractUsers(response.data);
};
