// src/api/commentsApi.ts
import api from './axiosInstance';

// ========================================
// Types
// ========================================
export type Comment = {
  commentId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  useYn: string;
  deletedAt?: string | null;
  replyCount: number;
  isOwner: boolean;
};

export type Reply = {
  replyId: number;
  commentId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  useYn: string;
  deletedAt?: string | null;
  isOwner: boolean;
};

export type CreateCommentPayload = {
  content: string;
};

export type CreateReplyPayload = {
  content: string;
};

export type UpdateCommentPayload = {
  content: string;
};

export type UpdateReplyPayload = {
  content: string;
};

type PaginationParams = {
  limit?: number;
  offset?: number;
};

// ========================================
// Video Feed (Store) Comments - fp_440 테이블
// ========================================
export const fetchVideoFeedComments = async (
  storeId: number,
  params: PaginationParams = {},
): Promise<Comment[]> => {
  const response = await api.get<Comment[]>(`/api/stores/${storeId}/comments`, { params });
  return extractData(response.data);
};

export const createVideoFeedComment = async (
  storeId: number,
  payload: CreateCommentPayload,
): Promise<Comment> => {
  const response = await api.post<Comment>(`/api/stores/${storeId}/comments`, payload);
  return extractSingleItem(response.data);
};

export const updateVideoFeedComment = async (
  storeId: number,
  commentId: number,
  payload: UpdateCommentPayload,
): Promise<Comment> => {
  const response = await api.put<Comment>(`/api/stores/${storeId}/comments/${commentId}`, payload);
  return extractSingleItem(response.data);
};

export const deleteVideoFeedComment = async (storeId: number, commentId: number): Promise<void> => {
  await api.delete(`/api/stores/${storeId}/comments/${commentId}`);
};

// ========================================
// Video Feed (Store) Comment Replies - fp_450 테이블
// ========================================
export const fetchVideoFeedReplies = async (
  storeId: number,
  commentId: number,
  params: PaginationParams = {},
): Promise<Reply[]> => {
  const response = await api.get<Reply[]>(`/api/stores/${storeId}/comments/${commentId}/replies`, { params });
  return extractData(response.data);
};

export const createVideoFeedReply = async (
  storeId: number,
  commentId: number,
  payload: CreateReplyPayload,
): Promise<Reply> => {
  const response = await api.post<Reply>(`/api/stores/${storeId}/comments/${commentId}/replies`, payload);
  return extractSingleItem(response.data);
};

export const updateVideoFeedReply = async (
  storeId: number,
  commentId: number,
  replyId: number,
  payload: UpdateReplyPayload,
): Promise<Reply> => {
  const response = await api.put<Reply>(
    `/api/stores/${storeId}/comments/${commentId}/replies/${replyId}`,
    payload,
  );
  return extractSingleItem(response.data);
};

export const deleteVideoFeedReply = async (
  storeId: number,
  commentId: number,
  replyId: number,
): Promise<void> => {
  await api.delete(`/api/stores/${storeId}/comments/${commentId}/replies/${replyId}`);
};

// ========================================
// Image Feed Comments - fp_460 테이블
// ========================================
export const fetchImageFeedComments = async (
  feedId: number,
  params: PaginationParams = {},
): Promise<Comment[]> => {
  const response = await api.get<Comment[]>(`/api/image-feeds/${feedId}/comments`, { params });
  return extractData(response.data);
};

export const createImageFeedComment = async (
  feedId: number,
  payload: CreateCommentPayload,
): Promise<Comment> => {
  const response = await api.post<Comment>(`/api/image-feeds/${feedId}/comments`, payload);
  return extractSingleItem(response.data);
};

export const updateImageFeedComment = async (
  feedId: number,
  commentId: number,
  payload: UpdateCommentPayload,
): Promise<Comment> => {
  const response = await api.put<Comment>(`/api/image-feeds/${feedId}/comments/${commentId}`, payload);
  return extractSingleItem(response.data);
};

export const deleteImageFeedComment = async (feedId: number, commentId: number): Promise<void> => {
  await api.delete(`/api/image-feeds/${feedId}/comments/${commentId}`);
};

// ========================================
// Image Feed Comment Replies - fp_470 테이블
// ========================================
export const fetchImageFeedReplies = async (
  feedId: number,
  commentId: number,
  params: PaginationParams = {},
): Promise<Reply[]> => {
  const response = await api.get<Reply[]>(`/api/image-feeds/${feedId}/comments/${commentId}/replies`, { params });
  return extractData(response.data);
};

export const createImageFeedReply = async (
  feedId: number,
  commentId: number,
  payload: CreateReplyPayload,
): Promise<Reply> => {
  const response = await api.post<Reply>(`/api/image-feeds/${feedId}/comments/${commentId}/replies`, payload);
  return extractSingleItem(response.data);
};

export const updateImageFeedReply = async (
  feedId: number,
  commentId: number,
  replyId: number,
  payload: UpdateReplyPayload,
): Promise<Reply> => {
  const response = await api.put<Reply>(
    `/api/image-feeds/${feedId}/comments/${commentId}/replies/${replyId}`,
    payload,
  );
  return extractSingleItem(response.data);
};

export const deleteImageFeedReply = async (
  feedId: number,
  commentId: number,
  replyId: number,
): Promise<void> => {
  await api.delete(`/api/image-feeds/${feedId}/comments/${commentId}/replies/${replyId}`);
};

// ========================================
// Helper
// ========================================
const extractSingleItem = <T>(payload: any): T => {
  // 서버 응답이 { success: true, data: {...} } 형태일 수 있음
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data as T;
  }
  return payload as T;
};

const extractData = <T>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
};
