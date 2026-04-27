import api from './axiosInstance';

export type BlockPayload = {
  blockedUsername: string;
};

export const blockUser = async (payload: BlockPayload) => {
  const res = await api.post('/api/blocks', payload);
  return res.data;
};
