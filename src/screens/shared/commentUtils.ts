// src/screens/shared/commentUtils.ts
import { Dimensions, Platform } from 'react-native';
import { formatTimeAgo } from '../../utils/dateTime';
export const seedAvatar = (seed: string) =>
  `https://api.dicebear.com/8.x/identicon/png?seed=${encodeURIComponent(seed)}&size=64`;

const normalizeLabel = (value: unknown) => String(value ?? '').trim();

export const getPreferredUserDisplayName = (
  source: {
    nickName?: unknown;
    nick_name?: unknown;
    nickname?: unknown;
    displayName?: unknown;
    username?: unknown;
    userName?: unknown;
  } | null | undefined,
  fallback = 'plate_user',
) => {
  const nickname = normalizeLabel(
    source?.nickName ?? source?.nick_name ?? source?.nickname ?? source?.displayName,
  );
  if (nickname) {
    return nickname;
  }

  const username = normalizeLabel(source?.username ?? source?.userName);
  if (username) {
    return `@${username}`;
  }

  return fallback;
};

export const toMs = (v: any) => {
  if (!v) return Date.now();
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : Date.now();
};

export const timeAgo = (ms: number) => formatTimeAgo(ms);

export const isInt32 = (n: number) =>
  Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;

export const extractItemsFromPage = (resData: any): any[] => {
  if (!resData) return [];
  const payload = resData?.data ?? resData;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.comments)) return payload.comments;
  if (Array.isArray(payload.replies)) return payload.replies;
  return [];
};

export const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });

export const getKeyboardOverlapInset = (
  event: any,
  safeAreaBottom = 0,
) => {
  const rawHeight = Number(event?.endCoordinates?.height ?? 0);
  if (!Number.isFinite(rawHeight) || rawHeight <= 0) {
    return 0;
  }

  if (Platform.OS === 'ios') {
    return Math.max(0, rawHeight - safeAreaBottom);
  }

  const keyboardTopY = Number(event?.endCoordinates?.screenY);
  const windowHeight = Dimensions.get('window').height;
  if (Number.isFinite(keyboardTopY) && keyboardTopY > 0) {
    const overlap = windowHeight - keyboardTopY;
    if (overlap <= 0) {
      return 0;
    }
    return Math.min(rawHeight, overlap);
  }

  return rawHeight;
};
