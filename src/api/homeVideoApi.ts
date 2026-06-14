// src/api/homeVideoApi.ts
import api from './axiosInstance';
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
  commentCount?: number | null;
  likeCount?: number | null;
  likedByMe?: boolean | null;
  username?: string | null;
  nickName?: string | null;
  profileImageUrl?: string | null;
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

const normalizeHomeVideoThumbnail = (raw: any): HomeVideoThumbnail => ({
  storeId: Number(raw?.storeId ?? raw?.store_id ?? 0),
  title: raw?.title ?? null,
  fileName: String(raw?.fileName ?? raw?.file_name ?? ''),
  thumbnail: raw?.thumbnail ?? raw?.thumbnail_url ?? null,
  videoDuration: raw?.videoDuration ?? raw?.video_duration ?? null,
  muteYn: raw?.muteYn ?? raw?.mute_yn ?? null,
  videoSize: raw?.videoSize ?? raw?.video_size ?? null,
  storeName: raw?.storeName ?? raw?.store_name ?? null,
  address: raw?.address ?? null,
  placeId: raw?.placeId ?? raw?.place_id ?? null,
  commentCount:
    raw?.commentCount ??
    raw?.commentsCount ??
    raw?.comment_count ??
    raw?.comments_count ??
    null,
  likeCount:
    raw?.likeCount ??
    raw?.likesCount ??
    raw?.like_count ??
    raw?.likes_count ??
    null,
  likedByMe:
    raw?.likedByMe ??
    raw?.liked_by_me ??
    raw?.liked ??
    raw?.isLiked ??
    null,
  username:
    raw?.username ??
    raw?.userName ??
    raw?.authorUsername ??
    raw?.author_username ??
    raw?.createdBy ??
    raw?.created_by ??
    null,
  nickName:
    raw?.nickName ??
    raw?.nick_name ??
    raw?.nickname ??
    raw?.displayName ??
    raw?.authorNickname ??
    raw?.author_nickname ??
    raw?.createdByNickname ??
    raw?.created_by_nickname ??
    null,
  profileImageUrl:
    raw?.profileImageUrl ??
    raw?.profile_image_url ??
    raw?.profileImage ??
    raw?.profile_image ??
    raw?.authorProfileImageUrl ??
    raw?.author_profile_image_url ??
    null,
  createdAt: raw?.createdAt ?? raw?.created_at ?? null,
  updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ''),
});

// 홈 썸네일 조회
// - 로그인 사용자는 Authorization 헤더 기준으로 개인화된다.
// - 토큰이 없으면 guestId 기반(게스트)으로 조회한다.
export async function fetchHomeVideoThumbnails(
  page = 0,
  size = 10,
  _user?: { username?: string | null } | null,
  options?: { sortType?: HomeSortType; location?: HomeLocation | null; radius?: number },
): Promise<PageResponse<HomeVideoThumbnail>> {
  const guestParams = await getGuestParams();
  const params: Record<string, any> = { page, size, ...guestParams };

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
  const responsePage = res.data;
  return {
    ...responsePage,
    content: Array.isArray(responsePage?.content)
      ? responsePage.content.map(normalizeHomeVideoThumbnail)
      : [],
  };
}

/**
 * 🔹 썸네일 시청 이력 생성
 * - 로그인 사용자는 Authorization 헤더 기준으로 기록된다.
 */
export async function createHomeVideoWatchHistory(
  storeId: number,
  user?: { username?: string | null } | null,
) {
  if (!user?.username) {
    return;
  }

  const payload: Record<string, any> = {
    storeId,
    isGuest: false,
  };

  await api.post('/api/home/video-watch-history', payload);
}
