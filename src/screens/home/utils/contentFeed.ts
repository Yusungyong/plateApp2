import type { HomeImageThumbnail } from '../../../api/homeImageApi';
import type { HomeVideoThumbnail } from '../../../api/homeVideoApi';
import { buildFeedImageUrl } from '../../../api/homeImageApi';
import { formatTimeAgo, normalizeMs } from '../../../utils/dateTime';
import { buildHomeVideoThumbUrl } from './videoUtils';
import type {
  HomeContentFeedImageAsset,
  HomeContentFeedImageItem,
  HomeContentFeedItem,
  HomeContentFeedVideoItem,
} from '../mockContentFeedData';

type ImageMetaOverride = {
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  username?: string | null;
  nickName?: string | null;
  profileImageUrl?: string | null;
  content?: string | null;
  storeName?: string | null;
  location?: string | null;
  createdAt?: string | null;
};

const compareContentCreatedAt = (
  left: HomeContentFeedItem,
  right: HomeContentFeedItem,
) =>
  (normalizeMs(right.createdAt) ?? 0) - (normalizeMs(left.createdAt) ?? 0);

export const mapHomeVideoToContentFeedItem = (
  item: HomeVideoThumbnail,
): HomeContentFeedVideoItem | null => {
  const posterUrl = buildHomeVideoThumbUrl(
    item.thumbnail,
    item.createdAt ?? item.updatedAt,
  );
  if (!posterUrl || !item.storeId || !item.placeId) {
    return null;
  }

  const title = item.title?.trim() || item.storeName?.trim() || '지금 보고 싶은 영상';

  return {
    feedKey: `video:${item.storeId}`,
    contentType: 'VIDEO',
    isMock: false,
    storeId: item.storeId,
    placeId: item.placeId,
    fileName: item.fileName ?? null,
    thumbnail: item.thumbnail ?? null,
    title,
    storeName: item.storeName?.trim() || '이름 없는 가게',
    address: item.address?.trim() || '위치 정보 없음',
    createdLabel: formatTimeAgo(item.createdAt ?? item.updatedAt),
    createdAt: item.createdAt ?? item.updatedAt ?? null,
    durationLabel:
      typeof item.videoDuration === 'number' && item.videoDuration > 0
        ? `${Math.floor(item.videoDuration / 60)}:${String(
            Math.round(item.videoDuration % 60),
          ).padStart(2, '0')}`
        : '0:15',
    posterUrl,
    aspectRatio: 4 / 5,
    author: {
      username: item.username?.trim() || 'plate_user',
      nickName: item.nickName ?? null,
      profileImageUrl: item.profileImageUrl ?? null,
    },
    stats: {
      likeCount: Number(item.likeCount ?? 0),
      commentCount: Number(item.commentCount ?? 0),
      likedByMe: Boolean(item.likedByMe ?? false),
    },
  };
};

export const mapHomeImageToContentFeedItem = (
  item: HomeImageThumbnail,
  meta?: ImageMetaOverride | null,
): HomeContentFeedImageItem | null => {
  const thumbFile =
    meta?.thumbnailUrl ||
    (meta?.fileName ? buildFeedImageUrl(meta.fileName) : null) ||
    buildFeedImageUrl(item.thumbFileName);
  if (!thumbFile || !item.feedNo) {
    return null;
  }

  const primaryAsset: HomeContentFeedImageAsset = {
    id: `image:${item.feedNo}:0`,
    imageUrl: thumbFile,
    aspectRatio: 0.82,
  };

  const title =
    meta?.content?.trim() || item.storeName?.trim() || '지금 저장해둘 이미지 기록';
  const username = meta?.username?.trim() || `image_user_${item.feedNo}`;

  return {
    feedKey: `image:${item.feedNo}`,
    contentType: 'IMAGE',
    isMock: false,
    feedId: item.feedNo,
    title,
    storeName: meta?.storeName?.trim() || item.storeName?.trim() || '이름 없는 가게',
    address:
      meta?.location?.trim() || item.address?.trim() || '위치 정보 없음',
    createdLabel: formatTimeAgo(meta?.createdAt ?? item.createdAt),
    createdAt: meta?.createdAt ?? item.createdAt ?? null,
    author: {
      username,
      nickName: meta?.nickName ?? null,
      profileImageUrl: meta?.profileImageUrl ?? null,
    },
    stats: {
      likeCount: Number(meta?.likeCount ?? 0),
      commentCount: Number(meta?.commentCount ?? 0),
      likedByMe: Boolean(meta?.likedByMe ?? false),
    },
    imageCount: Math.max(1, Number(item.imageCount ?? 1)),
    images: [primaryAsset],
  };
};

export const mergeHomeContentFeedItems = (
  videos: HomeVideoThumbnail[],
  images: HomeImageThumbnail[],
  imageMetaByFeedId: Record<number, ImageMetaOverride | undefined>,
) => {
  const mappedVideos = videos
    .map(mapHomeVideoToContentFeedItem)
    .filter((item): item is HomeContentFeedVideoItem => Boolean(item));
  const mappedImages = images
    .map((item) => mapHomeImageToContentFeedItem(item, imageMetaByFeedId[item.feedNo]))
    .filter((item): item is HomeContentFeedImageItem => Boolean(item));

  const sortedVideos = [...mappedVideos].sort(compareContentCreatedAt);
  const sortedImages = [...mappedImages].sort(compareContentCreatedAt);
  const merged: HomeContentFeedItem[] = [];

  let videoIndex = 0;
  let imageIndex = 0;
  let lastType: HomeContentFeedItem['contentType'] | null = null;

  while (videoIndex < sortedVideos.length || imageIndex < sortedImages.length) {
    const nextVideo = sortedVideos[videoIndex] ?? null;
    const nextImage = sortedImages[imageIndex] ?? null;

    if (!nextVideo && nextImage) {
      merged.push(nextImage);
      imageIndex += 1;
      lastType = 'IMAGE';
      continue;
    }

    if (!nextImage && nextVideo) {
      merged.push(nextVideo);
      videoIndex += 1;
      lastType = 'VIDEO';
      continue;
    }

    if (!nextVideo || !nextImage) {
      break;
    }

    const preferredType =
      lastType === 'VIDEO'
        ? 'IMAGE'
        : lastType === 'IMAGE'
          ? 'VIDEO'
          : compareContentCreatedAt(nextVideo, nextImage) <= 0
            ? 'VIDEO'
            : 'IMAGE';

    if (preferredType === 'VIDEO') {
      merged.push(nextVideo);
      videoIndex += 1;
      lastType = 'VIDEO';
    } else {
      merged.push(nextImage);
      imageIndex += 1;
      lastType = 'IMAGE';
    }
  }

  return merged;
};
