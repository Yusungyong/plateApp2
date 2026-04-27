// src/api/notificationsApi.ts
import api from './axiosInstance';

// ========================================
// Types
// ========================================
export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  FOLLOW = 'FOLLOW',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
}

export type Notification = {
  notificationId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  targetId?: number | null;
  targetType?: string | null;
  isRead: boolean;
  createdAt: string;
  actorUserId?: number | null;
  actorUsername?: string | null;
  actorProfileImageUrl?: string | null;
};

type PaginationParams = {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

// ========================================
// Notification API
// ========================================
export const fetchNotifications = async (params: PaginationParams = {}): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/api/notifications', { params });
  return extractData(response.data);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/api/notifications/unread-count');
  return response.data.count;
};

export const markAsRead = async (notificationId: number): Promise<void> => {
  await api.put(`/api/notifications/${notificationId}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await api.put('/api/notifications/read-all');
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
  await api.delete(`/api/notifications/${notificationId}`);
};

export const deleteAllNotifications = async (): Promise<void> => {
  await api.delete('/api/notifications/all');
};

// ========================================
// Helper
// ========================================
const extractData = <T>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
};
