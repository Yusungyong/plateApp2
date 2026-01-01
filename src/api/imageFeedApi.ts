// src/api/imageFeedApi.ts
import api from './axiosInstance';

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

  createdAt: string | null;
  updatedAt: string | null;

  images: ImageFeedViewerImageItem[];
};

export type ImageFeedContextResponse = {
  feedIds: number[];
  initialIndex: number;
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
  const res = await api.get<ApiResponse<ImageFeedViewerResponse>>(
    `/image-feeds/${feedId}`,
  );
  return res.data.data;
}

// ✅ 추가: 주변 피드ID 스트립
export async function fetchImageFeedContext(
  baseFeedId: number,
  radiusM: number = 3000,
  limit: number = 50,
) {
  const res = await api.get<ApiResponse<ImageFeedContextResponse>>(
    `/image-feeds/context`,
    { params: { baseFeedId, radiusM, limit } },
  );
  return res.data.data;
}
