// src/api/homeImageApi.ts
import api from './axiosInstance';
import { getGuestParams } from './guestParams';
import { FEED_IMAGE_BUCKET } from '../config/buckets';
import { proxifyRemoteUrl } from '../config/devProxy';

type HomeSortType = 'RECENT' | 'NEARBY';
type HomeLocation = { latitude: number; longitude: number };

export type HomeImageThumbnail = {
  feedNo: number;
  thumbFileName: string; // 서버에서 images 첫 번째 파일명
  storeName?: string | null;
  placeId?: string | null;
  imageCount?: number | null;
  address?: string | null;
  createdAt?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string | null;
  errorCode?: string | null;
};

type HomeImageThumbnailResponse = {
  items: HomeImageThumbnail[];
};

// ✅ feed image bucket 고정 사용
// - 둘 중 하나만 있어도 동작하게 (프로젝트 키 명이 아직 흔들릴 수 있으니)
const FEED_IMAGE_BUCKET_FALLBACK = FEED_IMAGE_BUCKET;

const joinUrl = (base: string, path: string) => {
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
};

const isHttpUrl = (value?: string | null) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

export function buildFeedImageUrl(fileName?: string | null) {
  if (!fileName) return '';
  if (isHttpUrl(fileName)) return proxifyRemoteUrl(fileName) ?? fileName;
  if (!FEED_IMAGE_BUCKET_FALLBACK) return fileName; // base 없으면 디버깅용으로 파일명 그대로
  return proxifyRemoteUrl(joinUrl(FEED_IMAGE_BUCKET_FALLBACK, fileName)) ?? fileName;
}

export async function fetchHomeImageThumbnails(
  size = 4,
  options?: { sortType?: HomeSortType; location?: HomeLocation | null; radius?: number },
) {
  const params: Record<string, any> = { size };
  if (options?.sortType) {
    params.sortType = options.sortType;
  }
  if (options?.sortType === 'NEARBY' && options.location) {
    params.lat = options.location.latitude;
    params.lng = options.location.longitude;
    if (options.radius) {
      params.radius = options.radius;
    }
  }
  const guestParams = await getGuestParams();
  const res = await api.get<ApiResponse<HomeImageThumbnailResponse>>(
    '/api/home/image-thumbnails',
    { params: { ...params, ...guestParams } },
  );

  const items = res.data?.data?.items ?? [];
  return items
    .map((raw) => normalizeHomeImageThumbnail(raw))
    .filter((item) => item.feedNo > 0);
}

const normalizeHomeImageThumbnail = (raw: any): HomeImageThumbnail => {
  const item = raw ?? {};
  return {
    feedNo: Number(item.feedNo ?? item.feedId ?? item.id ?? item.feed_id ?? 0),
    thumbFileName:
      item.thumbFileName ??
      item.thumb_file_name ??
      item.thumbnail ??
      item.thumbnailUrl ??
      item.thumbnail_url ??
      '',
    storeName: item.storeName ?? item.store_name ?? null,
    placeId: item.placeId ?? item.place_id ?? null,
    imageCount: item.imageCount ?? item.image_count ?? item.imagesCount ?? null,
    address: item.address ?? item.roadAddress ?? item.road_address ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
  };
};
