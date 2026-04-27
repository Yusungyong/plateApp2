import api from './axiosInstance';

export type FriendVisitItem = {
  id: number;
  username?: string;
  friendName: string;
  friendNickname?: string | null;
  friendProfileImageUrl?: string | null;
  storeId: number;
  storeName: string;
  address?: string | null;
  memo?: string | null;
  visitDate?: string | null;
  thumbnail?: string | null;
  createdAt?: string;
};

export type FriendRecentStore = {
  storeId: number;
  storeName: string;
  placeId?: string | null;
  address?: string | null;
  visitCount: number;
  lastVisitedAt?: string;
  thumbnail?: string | null;
  friends: Array<{ friendName: string; visitDate?: string | null }>;
};

export type StoreFriendActivityItem = {
  id: number;
  friendName: string;
  friendNickname?: string | null;
  memo?: string | null;
  visitDate?: string | null;
};

export type FriendUpcomingVisit = {
  id: number;
  friendName: string;
  friendNickname?: string | null;
  storeId: number;
  storeName: string;
  address?: string | null;
  visitDate: string;
  memo?: string | null;
};

export const fetchFriendVisitFeed = async ({
  username,
  cursor,
  limit,
  friendName,
}: {
  username: string;
  cursor?: string;
  limit?: number;
  friendName?: string;
}): Promise<{ items: FriendVisitItem[]; nextCursor?: string | null }> => {
  const res = await api.get('/api/friends/' + encodeURIComponent(username) + '/visits', {
    params: { cursor, limit, friendName },
  });
  return {
    items: res.data?.items ?? [],
    nextCursor: res.data?.nextCursor ?? null,
  };
};

export type FriendVisitUpdatePayload = {
  visitDate?: string;
  memo?: string;
  storeName?: string;
  address?: string;
};

export const updateFriendVisit = async (visitId: number, payload: FriendVisitUpdatePayload) => {
  const res = await api.patch(`/api/friends/visits/${visitId}`, payload);
  return res.data;
};

export const deleteFriendVisit = async (visitId: number) => {
  const res = await api.delete(`/api/friends/visits/${visitId}`);
  return res.data;
};

export const fetchFriendRecentStores = async ({
  username,
  limit,
}: {
  username: string;
  limit?: number;
}): Promise<FriendRecentStore[]> => {
  const res = await api.get(
    '/api/friends/' + encodeURIComponent(username) + '/recent-stores',
    {
      params: { limit },
    },
  );
  return res.data?.items ?? [];
};

export const fetchStoreFriendActivity = async ({
  username,
  storeId,
  limit,
}: {
  username: string;
  storeId: number;
  limit?: number;
}): Promise<StoreFriendActivityItem[]> => {
  const res = await api.get(
    '/api/friends/' + encodeURIComponent(username) + '/stores/' + storeId + '/visits',
    {
      params: { limit },
      timeout: 8000,
    },
  );
  return res.data?.items ?? [];
};

export const fetchUpcomingFriendVisits = async ({
  username,
  from,
  to,
  limit,
}: {
  username: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<FriendUpcomingVisit[]> => {
  const res = await api.get(
    '/api/friends/' + encodeURIComponent(username) + '/upcoming-visits',
    {
      params: { from, to, limit },
    },
  );
  return res.data?.items ?? [];
};
