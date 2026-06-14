import {
  fetchMyActivitySummary,
  fetchMyProfileSummary,
  fetchPublicActivitySummary,
  fetchPublicProfile,
  fetchUserDetail,
  type ActivitySummaryResponse,
  type PublicProfileResponse,
  type UserDetailResponse,
} from '../../../api/userApi';
import { fetchAcceptedFriendCount } from '../../../api/friendsApi';
import {
  fetchMyProfile as fetchMyDashboardProfile,
  type MyProfileResponse,
} from '../../../api/myProfileApi';

export type UnifiedProfileData = {
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  activeRegion: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  role: string | null;
  isPrivate: boolean;
  provider: string | null;
  providerLabel: string | null;
  friendsCount: number;
  settings: {
    pushNotifications: boolean | null;
    marketingNotifications: boolean | null;
    language: string | null;
  };
  stats: {
    videoCount: number;
    imageCount: number;
    likeCount: number;
    commentCount: number;
    totalPostCount: number;
    recentActivityAt: string | null;
  };
};

const asText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const asCount = (value?: number | null) => (typeof value === 'number' ? value : 0);

const pickFirstCount = (...values: Array<number | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

const formatProviderLabel = (provider?: string | null) => {
  const code = (provider ?? '').trim().toLowerCase();
  if (!code) return null;
  if (code === 'google') return 'Google';
  if (code === 'apple') return 'Apple';
  if (code === 'kakao') return 'Kakao';
  if (code === 'naver') return 'Naver';
  return provider ?? null;
};

const resolveFriendsCount = (
  detail: PublicProfileResponse,
  explicitFriendsCount?: number | null,
) => {
  const rawDetail = detail as PublicProfileResponse & {
    friendsCount?: number | null;
    friendCount?: number | null;
  };
  const rawFriends = detail.friends as
    | {
        count?: number | null;
        total?: number | null;
        totalCount?: number | null;
        friendCount?: number | null;
        friendsCount?: number | null;
        items?: unknown[] | null;
        friends?: unknown[] | null;
        list?: unknown[] | null;
      }
    | unknown[]
    | null
    | undefined;

  if (typeof explicitFriendsCount === 'number') {
    return explicitFriendsCount;
  }

  if (Array.isArray(rawFriends)) {
    return rawFriends.length;
  }

  return asCount(
    pickFirstCount(
      explicitFriendsCount,
      rawDetail.friendsCount,
      rawDetail.friendCount,
      rawFriends?.count,
      rawFriends?.total,
      rawFriends?.totalCount,
      rawFriends?.friendCount,
      rawFriends?.friendsCount,
      Array.isArray(rawFriends?.items) ? rawFriends.items.length : undefined,
      Array.isArray(rawFriends?.friends) ? rawFriends.friends.length : undefined,
      Array.isArray(rawFriends?.list) ? rawFriends.list.length : undefined,
    ),
  );
};

const buildUnifiedProfile = ({
  detail,
  activity,
  dashboard,
  userDetail,
  explicitFriendsCount,
}: {
  detail: PublicProfileResponse;
  activity: ActivitySummaryResponse;
  dashboard?: MyProfileResponse | null;
  userDetail?: UserDetailResponse | null;
  explicitFriendsCount?: number | null;
}): UnifiedProfileData => {
  const videoCount = activity.stats?.videoCount ?? dashboard?.stats?.videoPostCount ?? 0;
  const imageCount = activity.stats?.imageCount ?? dashboard?.stats?.imagePostCount ?? 0;
  const likeCount = activity.stats?.likeCount ?? dashboard?.stats?.likeCount ?? 0;
  const commentCount = dashboard?.stats?.commentCount ?? 0;
  const totalPostCount =
    dashboard?.stats?.totalPostCount ?? asCount(videoCount) + asCount(imageCount);
  const friendsCount = resolveFriendsCount(detail, explicitFriendsCount);

  return {
    username: detail.username,
    displayName:
      asText(detail.nickName) ??
      asText(dashboard?.displayName) ??
      detail.username,
    profileImageUrl: asText(detail.profileImageUrl) ?? asText(dashboard?.avatarUrl),
    activeRegion: asText(detail.activeRegion),
    email: asText(userDetail?.email) ?? asText(detail.account?.email) ?? asText(dashboard?.email),
    phone: asText(userDetail?.phone) ?? asText(detail.account?.phone),
    createdAt:
      asText(userDetail?.createdAt) ??
      asText(detail.account?.createdAt) ??
      asText(dashboard?.createdAt),
    role: asText(userDetail?.role) ?? asText(detail.account?.role),
    isPrivate: Boolean(
      userDetail?.isPrivate ?? (detail as { isPrivate?: boolean | null }).isPrivate,
    ),
    provider: asText(detail.social?.provider),
    providerLabel: formatProviderLabel(detail.social?.provider),
    friendsCount,
    settings: {
      pushNotifications:
        typeof dashboard?.settings?.pushNotifications === 'boolean'
          ? dashboard.settings.pushNotifications
          : null,
      marketingNotifications:
        typeof dashboard?.settings?.marketingNotifications === 'boolean'
          ? dashboard.settings.marketingNotifications
          : null,
      language: asText(dashboard?.settings?.language),
    },
    stats: {
      videoCount: asCount(videoCount),
      imageCount: asCount(imageCount),
      likeCount: asCount(likeCount),
      commentCount: asCount(commentCount),
      totalPostCount: asCount(totalPostCount),
      recentActivityAt: asText(activity.stats?.recentActivityAt),
    },
  };
};

export const fetchMyUnifiedProfile = async (
  username: string,
): Promise<UnifiedProfileData> => {
  const [dashboard, detail, activity, userDetail, acceptedFriendCount] = await Promise.all([
    fetchMyDashboardProfile({ username, includeStats: true }),
    fetchMyProfileSummary(),
    fetchMyActivitySummary(),
    fetchUserDetail(username).catch(() => null),
    fetchAcceptedFriendCount(username).catch(() => null),
  ]);

  return buildUnifiedProfile({
    detail,
    activity,
    dashboard,
    userDetail,
    explicitFriendsCount: acceptedFriendCount,
  });
};

export const fetchUnifiedProfileDetail = async ({
  username,
  isOwnProfile,
}: {
  username: string;
  isOwnProfile: boolean;
}): Promise<UnifiedProfileData> => {
  if (isOwnProfile) {
    return fetchMyUnifiedProfile(username);
  }

  const [detail, activity] = await Promise.all([
    fetchPublicProfile(username),
    fetchPublicActivitySummary(username),
  ]);

  return buildUnifiedProfile({ detail, activity });
};
