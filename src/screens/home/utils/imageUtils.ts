// src/screens/home/utils/imageUtils.ts
import { IMAGE_BUCKET, IMAGE_BUCKET_THUMBNAIL } from '../../../config/buckets';
import { proxifyRemoteUrl } from '../../../config/devProxy';

const THUMBNAIL_BUCKET = IMAGE_BUCKET_THUMBNAIL;
const CDN_IMAGE_ROOT = IMAGE_BUCKET;
const S3_IMAGE_PATH_PREFIX = '/foodimages/';
const NON_IMAGE_EXTENSIONS = new Set(['mov', 'mp4', 'm4v', 'avi', 'mkv', 'webm']);

const joinUrl = (base: string, path: string) => {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
};

const isHttpUrl = (value?: string | null) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const getFileExtension = (value?: string | null) => {
  if (!value) return '';
  const normalized = value.split(/[?#]/)[0] ?? '';
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return normalized.slice(dotIndex + 1).toLowerCase();
};

export const isRenderableImageAssetPath = (fileName?: string | null) => {
  if (!fileName) return false;
  const extension = getFileExtension(fileName);
  if (!extension) return true;
  return !NON_IMAGE_EXTENSIONS.has(extension);
};

const rewriteToCdnImageUrl = (value: string) => {
  if (!CDN_IMAGE_ROOT) {
    return proxifyRemoteUrl(value) ?? value;
  }

  try {
    const parsed = new URL(value) as any;
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const imagePathIndex = normalizedPath.indexOf(S3_IMAGE_PATH_PREFIX);
    if (imagePathIndex < 0) {
      return value;
    }
    const relativePath = normalizedPath.slice(
      imagePathIndex + S3_IMAGE_PATH_PREFIX.length,
    );
    if (!relativePath) {
      return value;
    }
    const cdnUrl = joinUrl(CDN_IMAGE_ROOT, relativePath);
    return proxifyRemoteUrl(cdnUrl) ?? cdnUrl;
  } catch {
    return proxifyRemoteUrl(value) ?? value;
  }
};

export const buildImageUrl = (fileName?: string | null): string | null => {
  if (!fileName) {
    return null;
  }

  if (!isRenderableImageAssetPath(fileName)) {
    return null;
  }

  if (isHttpUrl(fileName)) {
    return rewriteToCdnImageUrl(fileName);
  }

  if (!THUMBNAIL_BUCKET) {
    return proxifyRemoteUrl(fileName) ?? fileName;
  }

  const bucketUrl = joinUrl(THUMBNAIL_BUCKET, fileName);
  return proxifyRemoteUrl(bucketUrl) ?? bucketUrl;
};
