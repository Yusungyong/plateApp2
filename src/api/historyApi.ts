import api from './axiosInstance';

export type ProfileHistoryPayload = {
  changeType: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  memo?: string | null;
};

export const recordProfileHistory = async (
  username: string,
  payload: ProfileHistoryPayload,
) => {
  await api.post(`/api/users/${encodeURIComponent(username)}/profile-history`, payload);
};
