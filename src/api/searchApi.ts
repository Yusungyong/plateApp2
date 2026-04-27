import api from './axiosInstance';
import { getGuestParams } from './guestParams';

export type SearchItem =
  | {
      type: 'place';
      placeId: string;
      storeId?: number;
      storeName?: string | null;
      address?: string | null;
      lat?: number;
      lng?: number;
      distanceM?: number;
      feedCount?: number;
      contentType?: 'IMAGE' | 'VIDEO' | 'BOTH';
      imageFeedId?: number | null;
      thumbnail?: string | null;
    }
  | {
      type: 'video';
      storeId: number;
      placeId?: string | null;
      title?: string | null;
      storeName?: string | null;
      address?: string | null;
      thumbnail?: string | null;
      createdAt?: string | null;
    }
  | {
      type: 'image';
      feedId: number;
      placeId?: string | null;
      storeName?: string | null;
      address?: string | null;
      thumbnail?: string | null;
      createdAt?: string | null;
    };

export type SearchResponse = {
  page: number;
  size: number;
  total: number;
  items: SearchItem[];
};

const normalizeResponse = (data: any): SearchResponse => {
  const payload = data?.data ?? data ?? {};
  return {
    page: payload.page ?? 0,
    size: payload.size ?? payload.pageSize ?? payload.items?.length ?? 0,
    total: payload.total ?? payload.totalElements ?? payload.items?.length ?? 0,
    items: payload.items ?? [],
  };
};

export const fetchSearch = async (params: {
  q?: string;
  type?: 'all' | 'place' | 'video' | 'image';
  page?: number;
  size?: number;
  category?: string;
  tags?: string[];
  radius?: number;
  lat?: number;
  lng?: number;
  sort?: 'RECENT' | 'POPULAR' | 'DISTANCE';
}): Promise<SearchResponse> => {
  const { tags, ...rest } = params;
  const query = {
    ...rest,
    tags: tags && tags.length > 0 ? tags.join(',') : undefined,
  };
  const guestParams = await getGuestParams();
  const res = await api.get('/api/search', { params: { ...query, ...guestParams } });
  return normalizeResponse(res.data);
};

export type SearchSuggestion = {
  type: 'place' | 'tag';
  label: string;
  placeId?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  tag?: string;
};

export const fetchSearchSuggestions = async (params: {
  q: string;
  limit?: number;
  scope?: 'place' | 'tag' | 'all';
}): Promise<SearchSuggestion[]> => {
  const guestParams = await getGuestParams();
  const res = await api.get('/api/search/suggest', { params: { ...params, ...guestParams } });
  const payload = res.data?.data ?? res.data ?? {};
  return payload.items ?? [];
};
