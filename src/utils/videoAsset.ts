import { IMAGE_BUCKET, VIDEO_BUCKET } from '../config/buckets';
import { proxifyRemoteUrl } from '../config/devProxy';

const DEFAULT_S3_REGION = 'ap-northeast-2';
const VIDEO_LIKE_EXTENSIONS = new Set(['mov', 'mp4', 'm4v', 'avi', 'mkv', 'webm']);
const VIDEO_THUMBNAIL_PREFIX = 'foodimages/';

const getFileExtension = (value?: string | null) => {
  if (!value) return '';
  const normalized = value.split(/[?#]/)[0] ?? '';
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return normalized.slice(dotIndex + 1).toLowerCase();
};

const joinUrl = (base: string, path: string) => {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

const isHttpUrl = (value?: string | null) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const stripVideoThumbnailPrefix = (value: string) => {
  if (value.startsWith(`/${VIDEO_THUMBNAIL_PREFIX}`)) {
    return value.slice(VIDEO_THUMBNAIL_PREFIX.length + 1);
  }
  if (value.startsWith(VIDEO_THUMBNAIL_PREFIX)) {
    return value.slice(VIDEO_THUMBNAIL_PREFIX.length);
  }
  return value;
};

const normalizeVideoFileName = (value: string) =>
  value.replace(/\.{2,}(?=(mov|mp4|m4v|avi|mkv|webm)(?:[?#]|$))/gi, '.');

export const resolveVideoRemoteUrl = (
  fileName?: string | null,
  _createdAt?: string | null,
) => {
  if (!fileName) return undefined;
  const normalizedFile = normalizeVideoFileName(fileName.replace(/\/+$/, ''));

  if (isHttpUrl(normalizedFile)) {
    if (VIDEO_BUCKET && !normalizedFile.startsWith(VIDEO_BUCKET)) {
      try {
        const parsed = new URL(normalizedFile) as any;
        const bucketUrl = new URL(VIDEO_BUCKET) as any;
        const bucketPath = bucketUrl.pathname.replace(/\/+$/, '');
        let filePath = parsed.pathname.replace(/\/+$/, '');
        if (bucketPath && bucketPath !== '/' && !filePath.startsWith(`${bucketPath}/`)) {
          filePath = `${bucketPath}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
        }
        return `${bucketUrl.protocol}//${bucketUrl.host}${filePath}`;
      } catch {
        return normalizedFile;
      }
    }

    try {
      const parsed = new URL(normalizedFile) as any;
      if (parsed.hostname.endsWith('s3.amazonaws.com')) {
        const parts = parsed.hostname.split('.');
        const bucket = parts[0];
        parsed.hostname = `${bucket}.s3.${DEFAULT_S3_REGION}.amazonaws.com`;
        return parsed.toString();
      }
    } catch {
      return normalizedFile;
    }

    return normalizedFile;
  }

  if (!VIDEO_BUCKET) {
    return normalizedFile;
  }

  return joinUrl(VIDEO_BUCKET, normalizedFile);
};

export const buildVideoAssetUrl = (
  fileName?: string | null,
  createdAt?: string | null,
) => {
  const remoteUrl = resolveVideoRemoteUrl(fileName, createdAt);
  if (!remoteUrl) return undefined;
  return proxifyRemoteUrl(remoteUrl) ?? remoteUrl;
};

export const isRenderableVideoThumbnailPath = (fileName?: string | null) => {
  if (!fileName) return false;
  const extension = getFileExtension(fileName);
  if (!extension) return true;
  return !VIDEO_LIKE_EXTENSIONS.has(extension);
};

export const resolveVideoThumbnailRemoteUrl = (
  fileName?: string | null,
  _createdAt?: string | null,
) => {
  if (!fileName) return undefined;
  if (!isRenderableVideoThumbnailPath(fileName)) {
    return undefined;
  }
  const normalizedFile = stripVideoThumbnailPrefix(fileName.replace(/\/+$/, ''));
  if (isHttpUrl(normalizedFile)) {
    if (IMAGE_BUCKET && !normalizedFile.startsWith(IMAGE_BUCKET)) {
      try {
        const parsed = new URL(normalizedFile) as any;
        const bucketUrl = new URL(IMAGE_BUCKET) as any;
        const bucketPath = bucketUrl.pathname.replace(/\/+$/, '');
        const filePath = parsed.pathname.replace(/\/+$/, '');
        const normalizedPath =
          bucketPath && bucketPath !== '/' && filePath.startsWith(`${bucketPath}/`)
            ? filePath
            : `${bucketPath}${filePath.startsWith('/') ? '' : '/'}${filePath}`;

        return `${bucketUrl.protocol}//${bucketUrl.host}${normalizedPath}${parsed.search}`;
      } catch {
        return normalizedFile;
      }
    }
    return normalizedFile;
  }
  if (!IMAGE_BUCKET) {
    return normalizedFile;
  }
  return joinUrl(IMAGE_BUCKET, normalizedFile);
};

export const buildVideoThumbnailUrl = (
  fileName?: string | null,
  createdAt?: string | null,
) => {
  const remoteUrl = resolveVideoThumbnailRemoteUrl(fileName, createdAt);
  if (!remoteUrl) return undefined;
  return proxifyRemoteUrl(remoteUrl) ?? remoteUrl;
};
