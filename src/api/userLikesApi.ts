// src/api/userLikesApi.ts
import api from './axiosInstance';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

const extractList = <T>(payload: any): T[] => {
  const body = payload?.data ?? payload ?? {};
  const list =
    body.items ??
    body.content ??
    body.list ??
    (Array.isArray(body) ? body : []) ??
    [];
  return Array.isArray(list) ? list : [];
};

export type UserLikedVideo = {
  storeId: number;
  title: string | null;
  thumbnail: string | null;
  fileName: string;
  videoDuration: number;
  placeId: string;
  storeName: string | null;
  address: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  likedAt: string;
};

export type UserLikedImage = {
  feedId: number;
  title: string | null;
  thumbnail: string | null;
  placeId: string;
  storeName: string | null;
  address?: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  likedAt: string;
};

export const fetchUserLikedVideos = async (
  username: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 20, offset = 0 } = params;
  try {
    const { data } = await api.get<ApiResponse<UserLikedVideo[]>>('/api/my/likes/videos', {
      params: { limit, offset },
    });
    return extractList<UserLikedVideo>(data);
  } catch (e: any) {
    if (e?.response?.status !== 404 || !username) throw e;
    const { data } = await api.get<ApiResponse<UserLikedVideo[]>>(
      `/api/users/${encodeURIComponent(username)}/likes/videos`,
      { params: { limit, offset } },
    );
    return extractList<UserLikedVideo>(data);
  }
};

export const fetchUserLikedImages = async (
  username: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 20, offset = 0 } = params;
  try {
    const { data } = await api.get<ApiResponse<UserLikedImage[]>>('/api/my/likes/images', {
      params: { limit, offset },
    });
    return extractList<UserLikedImage>(data);
  } catch (e: any) {
    if (e?.response?.status !== 404 || !username) throw e;
    const { data } = await api.get<ApiResponse<UserLikedImage[]>>(
      `/api/users/${encodeURIComponent(username)}/likes/images`,
      { params: { limit, offset } },
    );
    return extractList<UserLikedImage>(data);
  }
};
