// src/api/homeVideoApi.ts
import api from './axiosInstance';
import { getOrCreateGuestId } from '../auth/guestIdStorage';
import { getGuestParams } from './guestParams';

type HomeSortType = 'RECENT' | 'NEARBY';
type HomeLocation = { latitude: number; longitude: number };

export type HomeVideoThumbnail = {
  storeId: number;
  title: string | null;
  fileName: string;      // 비디오 파일 경로 또는 키
  thumbnail: string | null;
  videoDuration: number | null;
  muteYn: 'Y' | 'N' | null;
  videoSize: number | null;
  storeName: string | null;
  address: string | null;
  placeId: string | null;
  createdAt?: string | null;
  updatedAt: string;     // ISO 문자열
};

// Spring Data JPA Page 응답 형태
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

// 홈 썸네일 조회
// - user 가 있으면: username 기반(로그인 유저)
// - user 가 없으면: guestId 기반(게스트)
export async function fetchHomeVideoThumbnails(
  page = 0,
  size = 10,
  user?: { username?: string | null } | null,
  options?: { sortType?: HomeSortType; location?: HomeLocation | null; radius?: number },
): Promise<PageResponse<HomeVideoThumbnail>> {
  let params: Record<string, any> = { page, size };

  if (user && user.username) {
    // 로그인 사용자
    params.username = user.username;
    params.isGuest = false;
  } else {
    // 게스트 사용자
    const guestParams = await getGuestParams();
    params = { ...params, ...guestParams };
    if (!params.guestId) {
      params.guestId = await getOrCreateGuestId();
      params.isGuest = true;
    }
  }

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

  const res = await api.get<PageResponse<HomeVideoThumbnail>>(
    '/api/home/video-thumbnails',
    { params },
  );
  return res.data;
}

/**
 * 🔹 썸네일 시청 이력 생성
 * - user 가 있으면: username + isGuest=false
 * - user 가 없으면: guestId + isGuest=true
 */
export async function createHomeVideoWatchHistory(
  storeId: number,
  user?: { username?: string | null } | null,
) {
  let payload: Record<string, any> = { storeId };

  if (user && user.username) {
    payload.username = user.username;
    payload.isGuest = false;
  } else {
    const guestParams = await getGuestParams();
    payload = { ...payload, ...guestParams };
    if (!payload.guestId) {
      payload.guestId = await getOrCreateGuestId();
      payload.isGuest = true;
    }
  }

  await api.post('/api/home/video-watch-history', payload);
}
