// src/screens/shared/commentUtils.ts
import { formatTimeAgo } from '../../utils/dateTime';
export const seedAvatar = (seed: string) =>
  `https://api.dicebear.com/8.x/identicon/png?seed=${encodeURIComponent(seed)}&size=64`;

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
