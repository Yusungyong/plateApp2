import api from './axiosInstance';

export type ReportHistoryItem = {
  reportId: number;
  targetType: 'video' | 'image' | 'comment' | 'user';
  targetId: number;
  targetUsername?: string | null;
  placeId?: string | null;
  storeName?: string | null;
  thumbnail?: string | null;
  reason?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
};

export type ReportHistoryResponse = {
  items: ReportHistoryItem[];
  total?: number;
  offset?: number;
  limit?: number;
};

export const fetchReportHistory = async (params?: { limit?: number; offset?: number }) => {
  const res = await api.get<ReportHistoryResponse>('/api/reports', { params });
  return res.data;
};
