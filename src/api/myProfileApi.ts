// src/api/myProfileApi.ts
import api from './axiosInstance';

export type MyProfileRequest = {
  username: string;
  includeStats?: boolean;
};

export type MyProfileResponse = {
  userId: number;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  stats?: {
    likeCount: number;
    commentCount: number;
    videoPostCount: number;
    imagePostCount: number;
    totalPostCount: number;
  };
  settings?: {
    pushNotifications: boolean;
    marketingNotifications: boolean;
    language: string;
  };
};

export const fetchMyProfile = async (
  payload: MyProfileRequest,
): Promise<MyProfileResponse> => {
  const { data } = await api.post<MyProfileResponse>('/api/my/profile', payload);
  return data;
};
