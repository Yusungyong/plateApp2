// src/api/videoFeedApi.ts
import api from './axiosInstance';
import { getGuestParams } from './guestParams';
import { createLogger } from '../utils/logger';

const logger = createLogger('[videoFeedApi]');

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
  createdAt?: string | null;

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
  const guestParams = await getGuestParams();
  const requestParams = { ...params, ...guestParams };
  logger.debug('fetchVideoFeed request', {
    endpoint: '/api/home/feed',
    params: requestParams,
  });
  const response = await api.get<VideoFeedItem[]>('/api/home/feed', {
    params: requestParams,
  });
  const list = response.data ?? [];
  const normalized = list.map(normalizeVideoFeedItem);
  logger.debug(
    'fetchVideoFeed response',
    normalized.map(item => ({
      storeId: item.storeId,
      placeId: item.placeId,
      fileName: item.fileName,
      thumbnail: item.thumbnail,
      createdAt: item.createdAt,
      username: item.username,
    })),
  );
  return normalized;
};

const normalizeVideoFeedItem = (raw: any): VideoFeedItem => {
  const item = raw ?? {};
  return {
    storeId: Number(item.storeId ?? item.store_id ?? 0),
    placeId: String(item.placeId ?? item.place_id ?? ''),
    title: item.title ?? null,
    storeName: item.storeName ?? item.store_name ?? null,
    address: item.address ?? null,
    fileName: item.fileName ?? item.file_name ?? null,
    thumbnail: item.thumbnail ?? item.thumbnail_url ?? null,
    videoDuration: item.videoDuration ?? item.video_duration ?? null,
    commentCount:
      item.commentCount ??
      item.commentsCount ??
      item.comment_count ??
      item.comments_count ??
      null,
    profileImageUrl:
      item.profileImageUrl ??
      item.profile_image_url ??
      item.profileImage ??
      item.profile_image ??
      item.profileImagePath ??
      item.profile_image_path ??
      null,
    username: item.username ?? null,
    likeCount:
      item.likeCount ??
      item.likesCount ??
      item.like_count ??
      item.likes_count ??
      null,
    likedByMe:
      item.likedByMe ??
      item.liked ??
      item.liked_by_me ??
      item.isLiked ??
      null,
    createdAt: item.createdAt ?? item.created_at ?? null,
  };
};

export type VideoPostPayload = {
  title: string;
  storeName: string;
  placeId: string;
  videoUrl: string;
  address?: string;
  description?: string;
  withFriends?: string;
  muteYn?: 'Y' | 'N';
  openYn?: 'Y' | 'N';
  useYn?: 'Y' | 'N';
};

export const createVideoPost = async (payload: FormData) => {
  const res = await api.post('/api/videos', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return res.data;
};

export const updateVideoPost = async (storeId: number, payload: Partial<VideoPostPayload>) => {
  const res = await api.patch(`/api/videos/${storeId}`, payload);
  return res.data;
};

export const updateVideoPostWithFile = async (storeId: number, payload: FormData) => {
  const res = await api.patch(`/api/videos/${storeId}`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return res.data;
};

export const deleteVideoPost = async (storeId: number) => {
  const res = await api.delete(`/api/videos/${storeId}`);
  return res.data;
};

export const likeStore = async (storeId: number) => {
  await api.post(`/api/likes/${storeId}`);
};

export const unlikeStore = async (storeId: number) => {
  await api.delete(`/api/likes/${storeId}`);
};
