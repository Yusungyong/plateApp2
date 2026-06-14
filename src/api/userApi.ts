// src/api/userApi.ts
import api from './axiosInstance';

export type UserDetailResponse = {
  userId: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  activeRegion: string | null;
  profileImageUrl: string | null;
  nickName: string | null;
  code: string | null;
  fcmToken?: string | null;
  isPrivate?: boolean;
};

export type ProfileStats = {
  videoCount?: number;
  imageCount?: number;
  likeCount?: number;
  recentActivityAt?: string | null;
};

export type ActivitySummaryResponse = {
  username: string;
  stats: ProfileStats;
};

const activitySummaryCache = new Map<
  string,
  { at: number; data: ActivitySummaryResponse }
>();
const activitySummaryInFlight = new Map<string, Promise<ActivitySummaryResponse>>();
const ACTIVITY_CACHE_TTL_MS = 5000;

const getCachedActivitySummary = (key: string) => {
  const cached = activitySummaryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.at > ACTIVITY_CACHE_TTL_MS) {
    activitySummaryCache.delete(key);
    return null;
  }
  return cached.data;
};

export type ProfileFriends = {
  count?: number;
};

export type ProfileAccount = {
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  createdAt?: string | null;
};

export type ProfileSocial = {
  provider?: string | null;
  providerUserId?: string | null;
  displayName?: string | null;
};

export type ProfileLogin = {
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginStatus?: string | null;
  lastFailReason?: string | null;
};

export type ProfilePreferences = {
  notifications?: boolean | null;
  filters?: {
    filterType?: string | null;
    imageYn?: boolean | null;
    timeFilter?: string | null;
    regionFilter?: string | null;
    postSorted?: string | null;
  } | null;
};

export type ProfileSafety = {
  blockedCount?: number;
  reportCount?: number;
};

export type PublicProfileResponse = {
  username: string;
  nickName: string | null;
  profileImageUrl: string | null;
  activeRegion: string | null;
  stats?: ProfileStats;
  friends?: ProfileFriends;
  account?: ProfileAccount;
  social?: ProfileSocial;
  login?: ProfileLogin;
  preferences?: ProfilePreferences;
  safety?: ProfileSafety;
};

export type MyProfileSummaryResponse = PublicProfileResponse;

export type MyUserUpdatePayload = {
  email?: string;
  phone?: string;
  nickName?: string;
  activeRegion?: string;
  isPrivate?: boolean;
  fcmToken?: string;
};

export type PushTokenRegisterPayload = {
  deviceId: string;
  fcmToken: string;
  platform: 'android' | 'ios';
};

const unwrapApi = <T,>(payload: any): T => {
  if (!payload) return payload as T;
  if (typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const fetchUserDetail = async (username: string): Promise<UserDetailResponse> => {
  const { data } = await api.get<UserDetailResponse>(`/api/users/${encodeURIComponent(username)}`);
  return unwrapApi<UserDetailResponse>(data);
};

export const fetchPublicProfile = async (
  username: string,
): Promise<PublicProfileResponse> => {
  const { data } = await api.get<PublicProfileResponse>(
    `/api/users/${encodeURIComponent(username)}/profile-detail`,
  );
  return unwrapApi<PublicProfileResponse>(data);
};

export const fetchMyProfileSummary = async (): Promise<MyProfileSummaryResponse> => {
  const { data } = await api.get<MyProfileSummaryResponse>('/api/my/profile-detail');
  return unwrapApi<MyProfileSummaryResponse>(data);
};

export const fetchPublicActivitySummary = async (
  username: string,
): Promise<ActivitySummaryResponse> => {
  const key = `public:${username}`;
  const cached = getCachedActivitySummary(key);
  if (cached) {
    return cached;
  }
  const inFlight = activitySummaryInFlight.get(key);
  if (inFlight) {
    return inFlight;
  }
  const request = api
    .get<ActivitySummaryResponse>(`/api/users/${encodeURIComponent(username)}/activity-summary`)
    .then(({ data }) => {
      const payload = unwrapApi<ActivitySummaryResponse>(data);
      activitySummaryCache.set(key, { at: Date.now(), data: payload });
      return payload;
    })
    .finally(() => {
      activitySummaryInFlight.delete(key);
    });
  activitySummaryInFlight.set(key, request);
  return request;
};

export const fetchMyActivitySummary = async (): Promise<ActivitySummaryResponse> => {
  const key = 'my';
  const cached = getCachedActivitySummary(key);
  if (cached) {
    return cached;
  }
  const inFlight = activitySummaryInFlight.get(key);
  if (inFlight) {
    return inFlight;
  }
  const request = api
    .get<ActivitySummaryResponse>('/api/my/activity-summary')
    .then(({ data }) => {
      const payload = unwrapApi<ActivitySummaryResponse>(data);
      activitySummaryCache.set(key, { at: Date.now(), data: payload });
      return payload;
    })
    .finally(() => {
      activitySummaryInFlight.delete(key);
    });
  activitySummaryInFlight.set(key, request);
  return request;
};

const buildMyUserUpdatePayload = (payload: MyUserUpdatePayload) => {
  const body: Record<string, unknown> = {};

  if (payload.email !== undefined) {
    body.email = payload.email;
  }
  if (payload.phone !== undefined) {
    body.phoneNumber = payload.phone;
  }
  if (payload.nickName !== undefined) {
    body.nickname = payload.nickName;
  }
  if (payload.activeRegion !== undefined) {
    body.activeRegion = payload.activeRegion;
  }
  if (payload.isPrivate !== undefined) {
    body.isPrivate = payload.isPrivate;
  }
  if (payload.fcmToken !== undefined) {
    body.fcmToken = payload.fcmToken;
  }

  return body;
};

export const updateMyUserProfile = async (
  payload: MyUserUpdatePayload,
): Promise<UserDetailResponse> => {
  const { data } = await api.put<UserDetailResponse>(
    '/api/users/me',
    buildMyUserUpdatePayload(payload),
  );
  return unwrapApi<UserDetailResponse>(data);
};

export const registerMyPushToken = async (
  payload: PushTokenRegisterPayload,
): Promise<void> => {
  await api.post('/api/users/me/push-token', payload);
};

export const updateProfileBasic = async (
  payload: { nickName?: string; activeRegion?: string },
) => {
  await updateMyUserProfile(payload);
};

const buildUserPath = (username: string, path: string) =>
  `/api/users/detail/${encodeURIComponent(username)}/${path}`;

export const updateUserEmail = async (username: string, email: string) => {
  await api.patch(buildUserPath(username, 'email'), { email });
};

export const updateUserPhone = async (username: string, phone: string) => {
  await api.patch(buildUserPath(username, 'phone'), { phone });
};

export const updateUserRole = async (username: string, role: string) => {
  await api.patch(buildUserPath(username, 'role'), { role });
};

export const updateUserActiveRegion = async (username: string, activeRegion: string) => {
  await api.patch(buildUserPath(username, 'active-region'), { activeRegion });
};

export const updateUserProfileImage = async (
  username: string,
  file: { uri: string; name: string; type: string },
) => {
  const formData = new FormData();
  formData.append('file', file as any);
  await api.patch(buildUserPath(username, 'profile-image'), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateUserNickname = async (username: string, nickName: string) => {
  await api.patch(buildUserPath(username, 'nickname'), { nickName });
};

export const updateUserCode = async (username: string, code: string) => {
  await api.patch(buildUserPath(username, 'code'), { code });
};

export const updateUserFcmToken = async (username: string, fcmToken: string) => {
  await api.patch(buildUserPath(username, 'fcm-token'), { fcmToken });
};

export const updateUserPrivacy = async (username: string, isPrivate: boolean) => {
  await api.patch(buildUserPath(username, 'privacy'), { isPrivate });
};
