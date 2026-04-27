import api from './axiosInstance';

export type PlacePayload = {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
};

export const createPlace = async (payload: PlacePayload): Promise<{ ok: boolean; placeId: string }> => {
  const response = await api.post<{ ok: boolean; placeId: string }>('/api/places', payload);
  return response.data;
};
