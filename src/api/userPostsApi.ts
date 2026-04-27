// src/api/userPostsApi.ts
import api from './axiosInstance';

export type UserVideoItem = {
  storeId: number;
  title: string | null;
  thumbnail: string | null;
  fileName: string;
  videoDuration: number;
  placeId: string;
  storeName: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserImageItem = {
  feedId: number;
  title: string | null;
  thumbnail: string | null;
  placeId: string;
  storeName: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
};

const unwrapList = <T,>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload.items)) return payload.items as T[];
  if (Array.isArray(payload.content)) return payload.content as T[];
  if (payload.data) {
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.data.items)) return payload.data.items as T[];
    if (Array.isArray(payload.data.content)) return payload.data.content as T[];
  }
  return [];
};

const buildPath = (username: string, path: string) =>
  `/api/users/${encodeURIComponent(username)}/${path}`;

export const fetchUserVideos = async (
  username: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 20, offset = 0 } = params;
  const { data } = await api.get(buildPath(username, 'videos'), {
    params: { limit, offset },
  });
  const list = unwrapList<UserVideoItem>(data);
  return list;
};

export const fetchUserImages = async (
  username: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 20, offset = 0 } = params;
  const { data } = await api.get(buildPath(username, 'images'), {
    params: { limit, offset },
  });
  const list = unwrapList<UserImageItem>(data);
  return list;
};
