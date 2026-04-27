// src/api/friendsApi.ts
import api from './axiosInstance';

export type FriendProfile = {
  id: number;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  activeRegion?: string | null;
  mutualCount?: number;
  since?: string;
  status?: string;
  initiatorUsername?: string | null;
  message?: string | null;
  acceptedAt?: string | null;
};

export type FriendRequest = {
  id: number;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  message?: string | null;
  requestedAt: string;
  status?: string;
  initiatorUsername?: string | null;
};

type FriendApiItem = {
  id: number;
  username: string;
  friendName: string;
  friendNickname?: string | null;
  status: string;
  friendProfileImageUrl?: string | null;
  friendActiveRegion?: string | null;
  initiatorUsername?: string | null;
  message?: string | null;
  mutualCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  items?: T;
};

const extractList = <T>(payload?: ApiResponse<T[]> | T[]): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const mapFriendProfile = (item: FriendApiItem): FriendProfile => {
  const username = item.friendName || item.username;
  const nickname = item.friendNickname || item.friendName || item.username;
  return {
    id: item.id,
    username,
    nickname,
    avatarUrl: item.friendProfileImageUrl,
    activeRegion: item.friendActiveRegion,
    mutualCount: item.mutualCount ?? undefined,
    since: item.acceptedAt ?? item.createdAt,
    status: item.status,
    initiatorUsername: item.initiatorUsername,
    message: item.message ?? null,
    acceptedAt: item.acceptedAt ?? null,
  };
};

const mapFriendRequest = (item: FriendApiItem): FriendRequest => {
  const username = item.friendName || item.username;
  const nickname = item.friendNickname || item.friendName || item.username;
  return {
    id: item.id,
    username,
    nickname,
    avatarUrl: item.friendProfileImageUrl,
    requestedAt: item.createdAt ?? item.updatedAt ?? new Date().toISOString(),
    message: item.message ?? null,
    status: item.status,
    initiatorUsername: item.initiatorUsername,
  };
};

const resolveStatus = (value?: string | null) => {
  const code = (value ?? '').toLowerCase();
  if (code === 'accepted' || code === 'cd_002') return 'accepted';
  if (code === 'pending' || code === 'cd_001') return 'pending';
  if (code === 'rejected' || code === 'cd_003') return 'rejected';
  return code;
};

const matchesStatus = (value: string | undefined | null, expected: string) =>
  resolveStatus(value) === expected.toLowerCase();

const fetchFriendEntries = async (username: string): Promise<FriendApiItem[]> => {
  const response = await api.get<ApiResponse<FriendApiItem[]>>('/api/friends', {
    params: { username },
  });
  return extractList<FriendApiItem>(response.data);
};

export const fetchFriends = async (username: string): Promise<FriendProfile[]> => {
  const list = await fetchFriendEntries(username);
  return list
    .filter((item) => matchesStatus(item.status, 'accepted'))
    .map(mapFriendProfile);
};

export const fetchFriendRequests = async (
  username: string,
): Promise<FriendRequest[]> => {
  const list = await fetchFriendEntries(username);
  return list
    .filter((item) => matchesStatus(item.status, 'pending'))
    .map(mapFriendRequest);
};

export const fetchFriendLists = async (
  username: string,
): Promise<{ friends: FriendProfile[]; requests: FriendRequest[] }> => {
  const list = await fetchFriendEntries(username);
  const friends = list
    .filter((item) => matchesStatus(item.status, 'accepted'))
    .map(mapFriendProfile);
  const requests = list
    .filter((item) => matchesStatus(item.status, 'pending'))
    .map(mapFriendRequest);
  return { friends, requests };
};

export const searchFriends = async (
  keyword: string,
  limit = 10,
): Promise<FriendProfile[]> => {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }
  const response = await api.get<ApiResponse<FriendApiItem[]>>('/api/friends/search', {
    params: { keyword: trimmed, limit },
  });
  const list = extractList<FriendApiItem>(response.data);
  return list.map(mapFriendProfile);
};

type FriendRequestPayload = {
  username: string;
  friendName: string;
  status?: string;
  initiatorUsername?: string;
  message?: string | null;
};

export const sendFriendRequest = async (
  payload: FriendRequestPayload,
): Promise<{ id: number }> => {
  const body = {
    username: payload.username,
    friendName: payload.friendName,
    status: payload.status ?? 'cd_001',
    initiatorUsername: payload.initiatorUsername ?? payload.username,
    message: payload.message ?? null,
  };
  const response = await api.post<{ id: number }>('/api/friends', body);
  return response.data;
};

export const removeFriend = async (
  id: number,
): Promise<{ ok: boolean }> => {
  const response = await api.delete<{ ok?: boolean }>(`/api/friends/${id}`);
  return { ok: response.data?.ok ?? true };
};

export const acceptFriendRequest = async (
  id: number,
): Promise<{ status: string }> => {
  const response = await api.patch<{ status: string }>(`/api/friends/${id}/status`, {
    status: 'cd_002',
  });
  return response.data;
};

export const declineFriendRequest = async (
  id: number,
): Promise<{ status: string }> => {
  const response = await api.patch<{ status: string }>(`/api/friends/${id}/status`, {
    status: 'cd_003',
  });
  return response.data;
};
