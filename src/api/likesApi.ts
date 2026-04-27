// src/api/likesApi.ts
import api from './axiosInstance';

// ========================================
// Types
// ========================================
export type LikeResponse = {
  success: boolean;
  isLiked: boolean;
  likeCount: number;
};

export type LikeUser = {
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  activeRegion?: string | null;
  createdAt: string;
};

// ========================================
// Video Feed Likes (Store) - fp_50 테이블
// ========================================
export const toggleVideoFeedLike = async (storeId: number): Promise<LikeResponse> => {
  const response = await api.post<LikeResponse>(`/api/stores/${storeId}/likes/toggle`);
  return extractLikeResponse(response.data);
};

export const fetchVideoFeedLikedUsers = async (
  storeId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<LikeUser[]> => {
  const response = await api.get<LikeUser[]>(`/api/stores/${storeId}/likes/users`, { params });
  return extractUsers(response.data);
};

export const getVideoFeedLikeStatus = async (storeId: number): Promise<{ isLiked: boolean; likeCount: number }> => {
  const response = await api.get<{ isLiked: boolean; likeCount: number }>(`/api/stores/${storeId}/likes/status`);
  const extracted = extractLikeResponse(response.data);
  return { isLiked: extracted.isLiked, likeCount: extracted.likeCount };
};

// ========================================
// Image Feed Likes - fp_60 테이블
// ========================================
export const toggleImageFeedLike = async (feedId: number): Promise<LikeResponse> => {
  const response = await api.post<LikeResponse>(`/api/image-feeds/${feedId}/likes/toggle`);
  return extractLikeResponse(response.data);
};

export const fetchImageFeedLikedUsers = async (
  feedId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<LikeUser[]> => {
  const response = await api.get<LikeUser[]>(`/api/image-feeds/${feedId}/likes/users`, { params });
  return extractUsers(response.data);
};

export const getImageFeedLikeStatus = async (feedId: number): Promise<{ isLiked: boolean; likeCount: number }> => {
  const response = await api.get<{ isLiked: boolean; likeCount: number }>(`/api/image-feeds/${feedId}/likes/status`);
  const extracted = extractLikeResponse(response.data);
  return { isLiked: extracted.isLiked, likeCount: extracted.likeCount };
};

// ========================================
// Helper
// ========================================
const extractLikeResponse = (payload: any): LikeResponse => {
  // 서버 응답: { success: true, data: { liked, likeCount } } 또는 { success: true, data: { isLiked, likeCount } }
  if (payload?.data && typeof payload.data === 'object') {
    return {
      success: payload.success ?? true,
      // 서버가 'liked' 또는 'isLiked' 둘 다 지원
      isLiked: payload.data.liked ?? payload.data.isLiked ?? false,
      likeCount: payload.data.likeCount ?? 0,
    };
  }

  // 또는 평평한 구조: { success, liked/isLiked, likeCount }
  return {
    success: payload?.success ?? true,
    isLiked: payload?.liked ?? payload?.isLiked ?? false,
    likeCount: payload?.likeCount ?? 0,
  };
};

const extractUsers = (payload: any): LikeUser[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
};
