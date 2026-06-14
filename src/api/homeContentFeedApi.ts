import api from './axiosInstance';
import { getGuestParams } from './guestParams';
import { buildFeedImageUrl } from './homeImageApi';
import { formatTimeAgo } from '../utils/dateTime';
import { buildHomeVideoThumbUrl } from '../screens/home/utils/videoUtils';
import type {
  HomeContentFeedImageAsset,
  HomeContentFeedImageItem,
  HomeContentFeedItem,
  HomeContentFeedVideoItem,
} from '../screens/home/mockContentFeedData';

type HomeLocation = { latitude: number; longitude: number };

export type HomeContentFeedResponse = {
  items: HomeContentFeedItem[];
  nextCursor?: string | null;
  trackingToken?: string | null;
  generatedAt?: string | null;
};

type FetchHomeContentFeedParams = {
  limit?: number;
  cursor?: string | null;
  surface?: string;
  location?: HomeLocation | null;
};

type HomeContentFeedApiPayload = {
  items?: any[];
  nextCursor?: string | null;
  trackingToken?: string | null;
  generatedAt?: string | null;
};

const extractPayload = <T>(payload: any): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const getAuthor = (raw: any) => {
  const author = raw?.author ?? raw?.creator ?? {};
  return {
    username:
      author?.username ??
      author?.userName ??
      raw?.username ??
      raw?.userName ??
      'plate_user',
    nickName:
      author?.nickName ??
      author?.nick_name ??
      author?.nickname ??
      raw?.nickName ??
      raw?.nickname ??
      null,
    profileImageUrl:
      author?.profileImageUrl ??
      author?.profile_image_url ??
      raw?.profileImageUrl ??
      raw?.profile_image_url ??
      null,
  };
};

const getStats = (raw: any) => {
  const stats = raw?.stats ?? {};
  return {
    likeCount: Number(stats?.likeCount ?? raw?.likeCount ?? 0),
    commentCount: Number(stats?.commentCount ?? raw?.commentCount ?? 0),
    viewCount: Number(stats?.viewCount ?? raw?.viewCount ?? 0),
    likedByMe: Boolean(
      stats?.likedByMe ??
        stats?.liked_by_me ??
        raw?.likedByMe ??
        raw?.liked_by_me ??
        raw?.liked ??
        false,
    ),
  };
};

const normalizeDurationLabel = (durationSec?: number | null) => {
  if (!durationSec || durationSec <= 0) return '0:15';
  const total = Math.max(0, Math.round(durationSec));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const normalizeVideoItem = (raw: any): HomeContentFeedVideoItem | null => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? null;
  const thumbnailSource =
    raw?.thumbnailUrl ??
    raw?.thumbnail_url ??
    raw?.thumbnail ??
    raw?.posterUrl ??
    raw?.poster_url ??
    null;
  const posterUrl = buildHomeVideoThumbUrl(thumbnailSource, createdAt);
  const storeId = Number(raw?.storeId ?? raw?.store_id ?? 0);
  const placeId = raw?.placeId ?? raw?.place_id ?? null;

  if (!posterUrl || !storeId || !placeId) {
    return null;
  }

  return {
    feedKey:
      raw?.feedKey ??
      raw?.feed_key ??
      `video:${raw?.videoFeedId ?? raw?.video_feed_id ?? storeId}`,
    contentType: 'VIDEO',
    isMock: false,
    videoFeedId: Number(raw?.videoFeedId ?? raw?.video_feed_id ?? 0) || undefined,
    storeId,
    placeId,
    fileName: raw?.videoUrl ?? raw?.video_url ?? raw?.fileName ?? raw?.file_name ?? null,
    thumbnail:
      raw?.thumbnailUrl ?? raw?.thumbnail_url ?? raw?.thumbnail ?? null,
    title:
      raw?.title?.trim?.() ||
      raw?.content?.trim?.() ||
      raw?.storeName?.trim?.() ||
      '지금 보고 싶은 영상',
    storeName: raw?.storeName ?? raw?.store_name ?? '이름 없는 가게',
    address: raw?.address ?? raw?.location ?? '위치 정보 없음',
    createdAt,
    createdLabel: formatTimeAgo(createdAt),
    durationLabel: normalizeDurationLabel(
      Number(raw?.durationSec ?? raw?.duration_sec ?? raw?.videoDuration ?? 0),
    ),
    posterUrl,
    aspectRatio: Number(raw?.aspectRatio ?? raw?.aspect_ratio ?? 0.8) || 0.8,
    author: getAuthor(raw),
    stats: getStats(raw),
  };
};

const normalizeImageAsset = (raw: any, fallbackId: string): HomeContentFeedImageAsset | null => {
  const imageUrl =
    buildFeedImageUrl(
      raw?.imageUrl ??
        raw?.image_url ??
        raw?.fileName ??
        raw?.file_name ??
        raw?.thumbnailUrl ??
        raw?.thumbnail_url ??
        null,
    ) || null;

  if (!imageUrl) {
    return null;
  }

  return {
    id: String(raw?.imageId ?? raw?.image_id ?? fallbackId),
    imageUrl,
    aspectRatio: Number(raw?.aspectRatio ?? raw?.aspect_ratio ?? 0.82) || 0.82,
  };
};

const normalizeImageItem = (raw: any): HomeContentFeedImageItem | null => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? null;
  const primaryRaw =
    raw?.primaryImage ??
    raw?.primary_image ??
    raw?.images?.[0] ??
    null;
  const primaryAsset = normalizeImageAsset(
    primaryRaw,
    `image:${raw?.imageFeedId ?? raw?.image_feed_id ?? raw?.feedId ?? raw?.feed_id ?? 0}:0`,
  );
  if (!primaryAsset) {
    return null;
  }

  const additionalImages = Array.isArray(raw?.images)
    ? raw.images
        .slice(1, 3)
        .map((item: any, index: number) =>
          normalizeImageAsset(
            item,
            `image:${raw?.imageFeedId ?? raw?.image_feed_id ?? raw?.feedId ?? raw?.feed_id ?? 0}:${index + 1}`,
          ),
        )
        .filter((item: HomeContentFeedImageAsset | null): item is HomeContentFeedImageAsset =>
          Boolean(item),
        )
    : [];
  const imageFeedId =
    Number(raw?.imageFeedId ?? raw?.image_feed_id ?? raw?.feedId ?? raw?.feed_id ?? 0) ||
    undefined;

  if (!imageFeedId) {
    return null;
  }

  return {
    feedKey: raw?.feedKey ?? raw?.feed_key ?? `image:${imageFeedId}`,
    contentType: 'IMAGE',
    isMock: false,
    imageFeedId,
    feedId: imageFeedId,
    title:
      raw?.title?.trim?.() ||
      raw?.content?.trim?.() ||
      raw?.storeName?.trim?.() ||
      '지금 저장해둘 이미지 기록',
    storeName: raw?.storeName ?? raw?.store_name ?? '이름 없는 가게',
    address: raw?.address ?? raw?.location ?? '위치 정보 없음',
    createdAt,
    createdLabel: formatTimeAgo(createdAt),
    imageCount: Number(raw?.imageCount ?? raw?.image_count ?? raw?.images?.length ?? 1) || 1,
    author: getAuthor(raw),
    stats: getStats(raw),
    images: [primaryAsset, ...additionalImages],
  };
};

const normalizeHomeContentFeedPayload = (
  payload: HomeContentFeedApiPayload,
): HomeContentFeedResponse => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalizedItems = items
    .map((raw) => {
      const type = String(raw?.contentType ?? raw?.content_type ?? '').toUpperCase();
      if (type === 'VIDEO') {
        return normalizeVideoItem(raw);
      }
      if (type === 'IMAGE') {
        return normalizeImageItem(raw);
      }
      return null;
    })
    .filter((item: HomeContentFeedItem | null): item is HomeContentFeedItem => Boolean(item));

  return {
    items: normalizedItems,
    nextCursor: payload?.nextCursor ?? null,
    trackingToken: payload?.trackingToken ?? null,
    generatedAt: payload?.generatedAt ?? null,
  } satisfies HomeContentFeedResponse;
};

export async function fetchHomeContentFeed(params?: FetchHomeContentFeedParams) {
  const guestParams = await getGuestParams();
  const requestParams: Record<string, any> = {
    limit: params?.limit ?? 10,
    surface: params?.surface ?? 'home-content',
    ...guestParams,
  };

  if (params?.cursor) {
    requestParams.cursor = params.cursor;
  }
  if (params?.location) {
    requestParams.lat = params.location.latitude;
    requestParams.lng = params.location.longitude;
  }

  const response = await api.get('/api/home/content-feed', { params: requestParams });
  const payload = extractPayload<HomeContentFeedApiPayload>(response.data);

  return normalizeHomeContentFeedPayload(payload);
}

export async function fetchHomeContentSearch(
  query: string,
  params?: FetchHomeContentFeedParams,
) {
  const guestParams = await getGuestParams();
  const requestParams: Record<string, any> = {
    q: query,
    limit: params?.limit ?? 10,
    surface: params?.surface ?? 'home-content-search',
    ...guestParams,
  };

  if (params?.cursor) {
    requestParams.cursor = params.cursor;
  }
  if (params?.location) {
    requestParams.lat = params.location.latitude;
    requestParams.lng = params.location.longitude;
  }

  const response = await api.get('/api/home/search/content', { params: requestParams });
  const payload = extractPayload<HomeContentFeedApiPayload>(response.data);

  return normalizeHomeContentFeedPayload(payload);
}
