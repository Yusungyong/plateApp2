import api from './axiosInstance';
import { getGuestParams } from './guestParams';

export type NearbyStoreMarker = {
  storeId: number;
  placeId: string;
  storeName: string | null;
  address: string | null;
  thumbnail: string | null;
  lat: number;
  lng: number;
  distanceM: number;
  feedCount: number;
  contentType?: 'IMAGE' | 'VIDEO' | 'BOTH';
  imageFeedId?: number | null;
};

export type NearbyStoreMarkersResponse = {
  items: NearbyStoreMarker[];
};

export type StoreSuggestion = {
  placeId: string;
  storeName: string;
  address: string | null;
  lat: number;
  lng: number;
};

export type StoreSuggestResponse = StoreSuggestion[];

export async function fetchNearbyStoreMarkers(params: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  category?: string;
  tags?: string[];
}) {
  const { lat, lng, radius = 1500, limit = 60, category, tags } = params;
  const tagParam = tags && tags.length > 0 ? tags.join(',') : undefined;

  const guestParams = await getGuestParams();

  const response = await api.get<NearbyStoreMarkersResponse>(
    '/api/map/stores/nearby',
    {
      params: { lat, lng, radius, limit, category, tags: tagParam, ...guestParams },
    },
  );

  return response.data;
}

export async function fetchStoreSuggestions(params: {
  keyword: string;
  limit?: number;
}) {
  const { keyword, limit = 10 } = params;
  const guestParams = await getGuestParams();

  const response = await api.get<StoreSuggestResponse>(
    '/api/map/stores/suggest',
    {
      params: { keyword, limit, ...guestParams },
    },
  );
  return response.data ?? [];
}
