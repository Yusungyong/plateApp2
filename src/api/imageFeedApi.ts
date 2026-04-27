// src/api/imageFeedApi.ts
import api from './axiosInstance';
import { getGuestParams } from './guestParams';

export type ImageFeedViewerImageItem = {
  orderNo: number;
  fileName: string;
};

export type ImageFeedViewerResponse = {
  feedId: number;
  username: string;
  nickName: string | null;
  profileImageUrl: string | null;

  feedTitle: string | null;
  content: string;

  storeName: string | null;
  location: string | null;
  placeId: string | null;

  thumbnail: string | null;

  commentCount: number;
  likeCount: number;
  likedByMe?: boolean;

  createdAt: string | null;
  updatedAt: string | null;

  images: ImageFeedViewerImageItem[];
};

export type ImageFeedContextResponse = {
  feedIds: number[];
  initialIndex: number;
};

export type ImageFeedGroupItem = {
  groupId: string;
  placeId?: string | null;
  storeName?: string | null;
  address?: string | null;
  thumbnail?: string | null;
  imageCount?: number | null;
  latestFeedId?: number | null;
  latestCreatedAt?: string | null;
};

export type ImageFeedGroupListResponse = {
  items: ImageFeedGroupItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type ImageFeedGroupImageItem = {
  feedId: number;
  fileName: string;
  createdAt?: string | null;
  username?: string | null;
  nickName?: string | null;
  profileImageUrl?: string | null;
};

export type ImageFeedGroupImagesResponse = {
  items: ImageFeedGroupImageItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

// 백엔드 ApiResponse 래퍼
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string | null;
  errorCode?: string | null;
  requestId?: string | null;
  timestamp?: string | null;
};

export async function fetchImageFeedViewer(feedId: number) {
  const guestParams = await getGuestParams();
  const res = await api.get(`/api/image-feeds/${feedId}`, { params: guestParams });
  const payload = res.data;
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as ApiResponse<ImageFeedViewerResponse>).data
      : (payload as ImageFeedViewerResponse);
  return data;
}

// ✅ 추가: 주변 피드ID 스트립
export async function fetchImageFeedContext(
  baseFeedId: number,
  radiusM: number = 3000,
  limit: number = 50,
) {
  const guestParams = await getGuestParams();
  const res = await api.get<ApiResponse<ImageFeedContextResponse> | ImageFeedContextResponse>(
    `/api/image-feeds/context`,
    { params: { baseFeedId, radiusM, limit, ...guestParams } },
  );
  const payload = res.data;
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as ApiResponse<ImageFeedContextResponse>).data
      : (payload as ImageFeedContextResponse);
  return data;
}

export async function fetchImageFeedGroups(params?: {
  limit?: number;
  cursor?: string | null;
  sort?: 'RECENT' | 'NEARBY';
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const guestParams = await getGuestParams();
  const res = await api.get<ApiResponse<ImageFeedGroupListResponse> | ImageFeedGroupListResponse>(
    '/api/image-feeds/groups',
    { params: { ...(params ?? {}), ...guestParams } },
  );
  const payload = res.data;
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as ApiResponse<ImageFeedGroupListResponse>).data
      : (payload as ImageFeedGroupListResponse);
  return data;
}

export async function fetchImageFeedGroupImages(
  groupId: string,
  params?: { limit?: number; cursor?: string | null },
) {
  const guestParams = await getGuestParams();
  const res = await api.get<
    ApiResponse<ImageFeedGroupImagesResponse> | ImageFeedGroupImagesResponse
  >(`/api/image-feeds/groups/${groupId}/images`, { params: { ...(params ?? {}), ...guestParams } });
  const payload = res.data;
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as ApiResponse<ImageFeedGroupImagesResponse>).data
      : (payload as ImageFeedGroupImagesResponse);
  return data;
}

export type ImageFeedPayload = {
  content: string;
  address: string;
  storeName?: string;
  placeId?: string;
  withFriends?: string;
  imageUrls: string[];
};

export const createImageFeed = async (payload: FormData) => {
  const res = await api.post('/api/image-feeds', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateImageFeed = async (feedId: number, payload: Partial<ImageFeedPayload>) => {
  const res = await api.patch(`/api/image-feeds/${feedId}`, payload);
  return res.data;
};

export const deleteImageFeed = async (feedId: number) => {
  const res = await api.delete(`/api/image-feeds/${feedId}`);
  return res.data;
};

export const addImageFeedImages = async (feedId: number, payload: FormData) => {
  const res = await api.post(`/api/image-feeds/${feedId}/images`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
