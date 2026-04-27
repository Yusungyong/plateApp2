// src/api/profileApi.ts
import api from './axiosInstance';

// ========================================
// Types
// ========================================
export type UserProfile = {
  userId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  activeRegion?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProfilePayload = {
  nickname?: string;
  bio?: string;
  activeRegion?: string;
  email?: string;
  phoneNumber?: string;
};

export type UploadProfileImageResponse = {
  profileImageUrl: string;
};

export type UpdatePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type DeleteReasonPayload = {
  reason?: string;
};

export type SocialDeletePayload =
  | ({
      provider: 'apple';
      identityToken: string;
      authorizationCode: string;
    } & DeleteReasonPayload)
  | ({
      provider: 'google';
      idToken: string;
    } & DeleteReasonPayload)
  | ({
      provider: 'kakao';
      accessToken: string;
    } & DeleteReasonPayload);

export type UserStats = {
  friendsCount: number;
  postsCount: number;
  likesCount: number;
  visitedStoresCount: number;
};

// ========================================
// Profile API
// ========================================
export const fetchMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/api/users/me');
  return response.data;
};

export const fetchUserProfile = async (username: string): Promise<UserProfile> => {
  const response = await api.get<UserProfile>(`/api/users/${username}`);
  return response.data;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const response = await api.put<UserProfile>('/api/users/me', payload);
  return response.data;
};

export const uploadProfileImage = async (imageUri: string): Promise<UploadProfileImageResponse> => {
  const formData = new FormData();

  const filename = imageUri.split('/').pop() || 'profile.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await api.post<UploadProfileImageResponse>('/api/users/me/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteProfileImage = async (): Promise<void> => {
  await api.delete('/api/users/me/profile-image');
};

export const updatePassword = async (payload: UpdatePasswordPayload): Promise<void> => {
  await api.put('/api/users/me/password', payload);
};

export const fetchUserStats = async (username?: string): Promise<UserStats> => {
  const endpoint = username ? `/api/users/${username}/stats` : '/api/users/me/stats';
  const response = await api.get<UserStats>(endpoint);
  return response.data;
};

export const deleteAccount = async (password: string, reason?: string): Promise<void> => {
  await api.delete('/api/users/me', { data: { password, reason } });
};

export const deleteSocialAccount = async (payload: SocialDeletePayload): Promise<void> => {
  await api.delete('/api/users/me/social', { data: payload });
};
