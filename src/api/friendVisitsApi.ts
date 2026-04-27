import api from './axiosInstance';

export type FriendVisitPayload = {
  storeId?: number;
  visitDate: string;
  friends: string[];
  memo?: string;
  storeName?: string;
  address?: string;
};

export const createFriendVisits = async (
  payload: FriendVisitPayload,
): Promise<{ ok: boolean; count: number }> => {
  const response = await api.post<{ ok: boolean; count: number }>(
    '/api/friends/visits',
    payload,
  );
  return response.data;
};
