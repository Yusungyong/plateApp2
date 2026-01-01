// src/api/homeImageApi.ts
import api from './axiosInstance';
import Config from 'react-native-config';

export type HomeImageThumbnail = {
  feedNo: number;
  thumbFileName: string; // 서버에서 images 첫 번째 파일명
  storeName?: string | null;
  placeId?: string | null;
  imageCount?: number | null;
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
const FEED_IMAGE_BUCKET =
  (Config as any).FEED_IMAGE_BUCKET ||
  (Config as any).FEEDIMAGEBUCKET ||
  (Config as any).feedimagebucket ||
  '';

const joinUrl = (base: string, path: string) => {
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
};

export function buildFeedImageUrl(fileName?: string | null) {
  if (!fileName) return '';
  if (!FEED_IMAGE_BUCKET) return fileName; // base 없으면 디버깅용으로 파일명 그대로
  return joinUrl(FEED_IMAGE_BUCKET, fileName);
}

export async function fetchHomeImageThumbnails(size = 4) {
  const res = await api.get<ApiResponse<HomeImageThumbnailResponse>>(
    '/api/home/image-thumbnails',
    { params: { size } },
  );

  return res.data?.data?.items ?? [];
}
