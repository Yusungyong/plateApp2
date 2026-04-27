// src/api/menuApi.ts
import api from './axiosInstance';

export type MenuItemResponse = {
  itemId: string;
  storeId: number;
  itemName: string;
  price: string | number;
  description?: string | null;
  menuImage?: string | null;
  menuTitle?: string | null;
  placeId: string;
  storeName: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

type FetchMenuParams = {
  placeId?: string | null;
  storeName?: string | null;
};

export const fetchStoreMenus = async ({
  placeId,
  storeName,
}: FetchMenuParams): Promise<MenuItemResponse[]> => {
  if (!placeId && !storeName) {
    return [];
  }

  const response = await api.get<MenuItemResponse[]>('/api/menu', {
    params: {
      placeId,
      storeName,
    },
  });
  return response.data ?? [];
};
