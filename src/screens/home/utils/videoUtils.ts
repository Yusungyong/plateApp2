import {
  buildVideoAssetUrl,
  buildVideoThumbnailUrl,
  isRenderableVideoThumbnailPath,
  resolveVideoThumbnailRemoteUrl,
} from '../../../utils/videoAsset';

export const buildHomeVideoAssetUrl = (
  fileName?: string | null,
  createdAt?: string | null,
) => buildVideoAssetUrl(fileName, createdAt);

export const buildHomeVideoThumbUrl = (
  fileName?: string | null,
  createdAt?: string | null,
) => buildVideoThumbnailUrl(fileName, createdAt);

export const resolveHomeVideoThumbRemoteUrl = (
  fileName?: string | null,
  createdAt?: string | null,
) => resolveVideoThumbnailRemoteUrl(fileName, createdAt);

export const isRenderableHomeVideoThumbPath = (fileName?: string | null) =>
  isRenderableVideoThumbnailPath(fileName);
