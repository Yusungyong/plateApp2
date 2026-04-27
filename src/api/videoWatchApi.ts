// src/api/videoWatchApi.ts
import api from './axiosInstance';

export type WatchStartPayload = {
  deviceInfo?: string | null;
  videoQuality?: string | null;
  sessionId?: string | null;
};

export type WatchStartResponse = {
  watchId: number;
  sessionId: string;
  storeId: number;
  startedAt?: string | null;
};

export type WatchProgressPayload = {
  sessionId: string;
  durationWatched: number;
  videoQuality?: string | null;
};

export type WatchProgressResponse = {
  watchId: number;
  durationWatched: number;
  completionRate?: number | null;
};

export type WatchCompletePayload = {
  sessionId: string;
  durationWatched: number;
  completionStatus?: boolean;
};

export type WatchCompleteResponse = {
  watchId: number;
  completed: boolean;
  durationWatched: number;
};

export type WatchInfoResponse = {
  hasWatched: boolean;
  lastWatchedAt?: string | null;
  durationWatched: number;
  videoDuration: number;
  completionRate: number;
  completed: boolean;
  canResume: boolean;
};

const unwrap = <T,>(resData: any): T => {
  if (resData?.data) return resData.data as T;
  return resData as T;
};

export async function startWatchSession(storeId: number, payload: WatchStartPayload) {
  const res = await api.post(`/api/videos/${storeId}/watch/start`, payload);
  return unwrap<WatchStartResponse>(res.data);
}

export async function updateWatchProgress(storeId: number, payload: WatchProgressPayload) {
  const res = await api.put(`/api/videos/${storeId}/watch/progress`, payload);
  return unwrap<WatchProgressResponse>(res.data);
}

export async function completeWatchSession(storeId: number, payload: WatchCompletePayload) {
  const res = await api.post(`/api/videos/${storeId}/watch/complete`, payload);
  return unwrap<WatchCompleteResponse>(res.data);
}

export async function fetchWatchInfo(storeId: number) {
  const res = await api.get(`/api/videos/${storeId}/watch-info`);
  return unwrap<WatchInfoResponse>(res.data);
}
