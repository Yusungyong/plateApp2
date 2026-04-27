import api from './axiosInstance';

export type ReportPayload = {
  targetType: 'video' | 'image' | 'comment' | 'user';
  targetId: number;
  targetUsername?: string;
  reason: string;
  description?: string;
};

export const reportContent = async (payload: ReportPayload) => {
  const res = await api.post('/api/reports', payload);
  return res.data;
};
