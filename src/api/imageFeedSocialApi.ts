import api from './axiosInstance';

export type ReplyDto = {
  replyId: number;
  commentId: number;
  username: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentDto = {
  commentId: number;
  feedId: number;
  username: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  replies: ReplyDto[];
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type ToggleLikeResponse = {
  liked: boolean;
  likeCount: number;
};

export type FeedCounts = {
  commentCount: number;
  likeCount: number;
};

// 댓글 목록
export async function fetchFeedComments(feedId: number, page = 0, size = 20) {
  const res = await api.get(`/image-feeds/${feedId}/comments`, { params: { page, size } });
  return (res.data?.data ?? res.data) as PageResponse<CommentDto>;
}

// 댓글 작성
export async function createFeedComment(feedId: number, content: string) {
  const res = await api.post(`/image-feeds/${feedId}/comments`, { content });
  return (res.data?.data ?? res.data) as CommentDto;
}

// 댓글 수정
export async function updateFeedComment(commentId: number, content: string) {
  const res = await api.put(`/image-feeds/comments/${commentId}`, { content });
  return (res.data?.data ?? res.data) as CommentDto;
}

// 댓글 삭제
export async function deleteFeedComment(commentId: number) {
  const res = await api.delete(`/image-feeds/comments/${commentId}`);
  return res.data?.data ?? res.data;
}

// 대댓글 작성
export async function createFeedReply(commentId: number, content: string) {
  const res = await api.post(`/image-feeds/comments/${commentId}/replies`, { content });
  return (res.data?.data ?? res.data) as ReplyDto;
}

// 대댓글 수정
export async function updateFeedReply(replyId: number, content: string) {
  const res = await api.put(`/image-feeds/replies/${replyId}`, { content });
  return (res.data?.data ?? res.data) as ReplyDto;
}

// 대댓글 삭제
export async function deleteFeedReply(replyId: number) {
  const res = await api.delete(`/image-feeds/replies/${replyId}`);
  return res.data?.data ?? res.data;
}

// 좋아요 토글(POST 하나로)
export async function toggleFeedLike(feedId: number) {
  const res = await api.post(`/image-feeds/${feedId}/likes/toggle`);
  return (res.data?.data ?? res.data) as ToggleLikeResponse;
}

// (옵션) 카운트만 조회
export async function fetchFeedCounts(feedId: number) {
  const res = await api.get(`/image-feeds/${feedId}/counts`);
  return (res.data?.data ?? res.data) as FeedCounts;
}
