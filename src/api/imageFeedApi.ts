// src/api/imageFeedApi.ts
import api from './axiosInstance';
import { getGuestParams } from './guestParams';

export type ImageFeedViewerImageItem = {
  imageId?: number | null;
  orderNo: number;
  fileName: string;
  thumbnailUrl?: string | null;
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
  lat?: number | null;
  lng?: number | null;

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
  lat?: number | null;
  lng?: number | null;
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

const toOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeImageFeedViewerResponse = (
  data: ImageFeedViewerResponse,
): ImageFeedViewerResponse => ({
  ...data,
  lat: toOptionalNumber((data as any)?.lat),
  lng: toOptionalNumber((data as any)?.lng),
});

const normalizeImageFeedGroupItem = (item: ImageFeedGroupItem): ImageFeedGroupItem => ({
  ...item,
  lat: toOptionalNumber((item as any)?.lat),
  lng: toOptionalNumber((item as any)?.lng),
});

const normalizeImageFeedGroupListResponse = (
  data: ImageFeedGroupListResponse,
): ImageFeedGroupListResponse => ({
  ...data,
  items: Array.isArray(data.items)
    ? data.items.map((item) => normalizeImageFeedGroupItem(item))
    : [],
});

export async function fetchImageFeedViewer(feedId: number) {
  const guestParams = await getGuestParams();
  const res = await api.get(`/api/image-feeds/${feedId}`, { params: guestParams });
  const payload = res.data;
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as ApiResponse<ImageFeedViewerResponse>).data
      : (payload as ImageFeedViewerResponse);
  return normalizeImageFeedViewerResponse(data);
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
  return normalizeImageFeedGroupListResponse(data);
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
  lat?: number;
  lng?: number;
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

export const deleteImageFeedImage = async (feedId: number, imageId: number) => {
  const res = await api.delete(`/api/image-feeds/${feedId}/images/${imageId}`);
  return res.data;
};

export const reorderImageFeedImages = async (feedId: number, imageIds: number[]) => {
  const res = await api.patch(`/api/image-feeds/${feedId}/images/order`, {
    imageIds,
  });
  return res.data;
};

export const replaceImageFeedImage = async (
  feedId: number,
  imageId: number,
  file: {
    uri: string;
    name: string;
    type: string;
  },
) => {
  const body = new FormData();
  body.append('file', file as unknown as Blob);
  const res = await api.put(`/api/image-feeds/${feedId}/images/${imageId}`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
