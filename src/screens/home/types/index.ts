// src/screens/home/types/index.ts

import type { NearbyStoreMarker } from '../../../api/mapStoreApi';
import type { Region, LatLng } from 'react-native-maps';

export interface HomeImageThumbnailGridProps {
  items: HomeImageThumbnail[];
  loading: boolean;
  errorMsg: string | null;
  onReload: () => void;
  onPressItem?: (item: HomeImageThumbnail) => void;
  showHeader?: boolean;
}

export interface HomeImageThumbnail {
  feedNo: number;
  thumbFileName: string;
  storeName?: string | null;
  placeId?: string | null;
  imageCount?: number | null;
  address?: string | null;
  createdAt?: string | null;
}

export type HomeSortType = 'RECENT' | 'NEARBY';
export type HomeLocationStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'unavailable';

export interface HomeMapPreviewProps {
  onPressMarker?: (marker: NearbyStoreMarker) => void;
  onVisibleRegionChange?: (payload: VisibleRegionPayload) => void;
  onPressMap?: () => void;
  interactive?: boolean;
  isActive?: boolean;
  style?: any;
  onRequestCenterUser?: (fn?: () => void) => void;
  onLocationStatusChange?: (status: HomeLocationStatus) => void;
  onUserLocationResolved?: (coord: LatLng) => void;
}

export interface VisibleRegionPayload {
  center: Region;
  bounds: {
    northEast: LatLng;
    southWest: LatLng;
  };
}

export type MarkerGroup =
  | { type: 'single'; marker: NearbyStoreMarker }
  | {
      type: 'cluster';
      marker: NearbyStoreMarker;
      items: NearbyStoreMarker[];
      totalFeedCount: number;
    };

export interface FriendRecentStore {
  storeId: number;
  placeId?: string;
  storeName: string;
  address?: string;
  visitCount: number;
}

export interface HomeVideoThumbnail {
  storeId: number;
  placeId?: string;
  storeName?: string;
  address?: string;
  thumbnail?: string;
}

export interface LoadingState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}
