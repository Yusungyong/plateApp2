import api from './axiosInstance';

export type BlockedUser = {
  blockedUsername: string;
  blockedNickname?: string | null;
  blockedProfileImageUrl?: string | null;
  blockedAt?: string | null;
  blockedUserId?: number | null;
  blockedActiveRegion?: string | null;
};

export type BlockedUsersResponse = {
  items: BlockedUser[];
  total?: number;
  offset?: number;
  limit?: number;
};

export const fetchBlockedUsers = async (params?: { limit?: number; offset?: number }) => {
  const res = await api.get<BlockedUsersResponse>('/api/blocks', { params });
  return res.data;
};

export const unblockUser = async (blockedUsername: string) => {
  const res = await api.delete('/api/blocks/' + encodeURIComponent(blockedUsername));
  return res.data;
};
