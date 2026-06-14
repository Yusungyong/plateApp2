export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const STANDARD_IMAGE_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MOBILE_IMAGE_UPLOAD_EXTENSIONS = [
  ...STANDARD_IMAGE_UPLOAD_EXTENSIONS,
  'heic',
  'heif',
] as const;
export const SEASONAL_IMAGE_UPLOAD_EXTENSIONS = [
  ...STANDARD_IMAGE_UPLOAD_EXTENSIONS,
  'gif',
] as const;

type ImageUploadExtension = string;

type ImageUploadCandidate = {
  fileName?: string | null;
  name?: string | null;
  type?: string | null;
  mimeType?: string | null;
  uri?: string | null;
  fileSize?: number | null;
};

type ValidateImageUploadOptions = {
  label?: string;
  allowedExtensions?: readonly ImageUploadExtension[];
};

const normalizeExtension = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '');

const extensionFromMimeType = (value?: string | null) => {
  const mime = String(value ?? '').trim().toLowerCase();
  if (!mime.startsWith('image/')) {
    return '';
  }
  const subtype = mime.slice('image/'.length);
  if (subtype === 'pjpeg') return 'jpeg';
  if (subtype === 'x-png') return 'png';
  return subtype;
};

const extensionFromPath = (value?: string | null) => {
  const clean = String(value ?? '').split(/[?#]/)[0] ?? '';
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  return normalizeExtension(match?.[1]);
};

export const getImageUploadExtension = (candidate: ImageUploadCandidate) =>
  extensionFromMimeType(candidate.type ?? candidate.mimeType) ||
  extensionFromPath(candidate.fileName ?? candidate.name) ||
  extensionFromPath(candidate.uri);

const formatMegabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export const getImageUploadValidationError = (
  candidate: ImageUploadCandidate,
  options?: ValidateImageUploadOptions,
) => {
  const label = options?.label ?? '이미지';
  const allowedExtensions = options?.allowedExtensions ?? MOBILE_IMAGE_UPLOAD_EXTENSIONS;
  const fileSize = Number(candidate.fileSize ?? 0);

  if (Number.isFinite(fileSize) && fileSize > MAX_IMAGE_UPLOAD_BYTES) {
    return `${label}는 10MB 이하만 업로드할 수 있어요. 선택한 파일은 ${formatMegabytes(fileSize)}입니다.`;
  }

  const extension = getImageUploadExtension(candidate);
  if (extension && !allowedExtensions.includes(extension)) {
    return `${label}는 ${allowedExtensions.join(', ')} 형식만 업로드할 수 있어요.`;
  }

  return null;
};
