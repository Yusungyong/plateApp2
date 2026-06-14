import Config from 'react-native-config';

const PROFILE_BASE_URL = Config.PROFILE_BUCKET ?? '';
const profileImageVersionByUsername = new Map<string, string>();

const normalizeProfilePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (!PROFILE_BASE_URL) return trimmed;

  const base = PROFILE_BASE_URL.endsWith('/') ? PROFILE_BASE_URL : `${PROFILE_BASE_URL}/`;
  if (trimmed.startsWith(base)) return trimmed;

  if (trimmed.startsWith('/profileImage/')) {
    return trimmed.replace(/^\/profileImage\//, '');
  }
  if (trimmed.startsWith('profileImage/')) {
    return trimmed.replace(/^profileImage\//, '');
  }
  return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
};

const joinUrl = (base?: string, path?: string | null) => {
  if (!base || !path) return undefined;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = normalizeProfilePath(path);
  if (!trimmedPath) return undefined;
  return `${trimmedBase}/${trimmedPath}`;
};

const isHttpUrl = (value?: string | null) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const isDataUrl = (value?: string | null) =>
  typeof value === 'string' && value.startsWith('data:');

const normalizeUsernameKey = (value?: string | null) => (value ?? '').toString().trim().toLowerCase();

const appendCacheBuster = (url: string, version?: string | null) => {
  if (!version) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(version)}`;
};

export const markProfileImageUpdated = (
  username?: string | null,
  version?: string | null,
) => {
  const key = normalizeUsernameKey(username);
  if (!key) {
    return;
  }
  profileImageVersionByUsername.set(key, version?.trim() || String(Date.now()));
};

export const clearProfileImageUpdateMark = (username?: string | null) => {
  const key = normalizeUsernameKey(username);
  if (!key) {
    return;
  }
  profileImageVersionByUsername.delete(key);
};

export const buildProfileUri = (
  username?: string | null,
  fileOrUrl?: string | null,
) => {
  const cacheVersion = profileImageVersionByUsername.get(normalizeUsernameKey(username));
  const value = (fileOrUrl ?? '').toString().trim();
  if (value) {
    if (isDataUrl(value)) {
      return value;
    }
    if (isHttpUrl(value)) {
      if (PROFILE_BASE_URL) {
        const base = PROFILE_BASE_URL.endsWith('/')
          ? PROFILE_BASE_URL
          : `${PROFILE_BASE_URL}/`;
        if (!value.startsWith(base)) {
          const idx = value.indexOf('/profileImage/');
          if (idx >= 0) {
            const sliced = value.slice(idx + '/profileImage/'.length);
            const joined = joinUrl(PROFILE_BASE_URL, sliced);
            if (joined) return appendCacheBuster(joined, cacheVersion);
          }
        }
      }
      return appendCacheBuster(value, cacheVersion);
    }
    const joined = joinUrl(PROFILE_BASE_URL, value);
    if (joined) return appendCacheBuster(joined, cacheVersion);
  }
  const seed = encodeURIComponent((username ?? 'plate_user').toString().trim());
  return `https://api.dicebear.com/8.x/identicon/png?seed=${seed}&size=64`;
};
