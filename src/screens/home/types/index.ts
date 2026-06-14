// src/screens/home/types/index.ts

import type { NearbyStoreMarker } from '../../../api/mapStoreApi';
import type { HomeImageThumbnail as ApiHomeImageThumbnail } from '../../../api/homeImageApi';
import type { Region, LatLng } from 'react-native-maps';

export interface HomeImageThumbnailGridProps {
  items: HomeImageThumbnail[];
  loading: boolean;
  errorMsg: string | null;
  onReload: () => void;
  onPressItem?: (item: HomeImageThumbnail) => void;
  showHeader?: boolean;
  hasLoadedOnce?: boolean;
  variant?: 'default' | 'editorial';
}

export type HomeImageThumbnail = ApiHomeImageThumbnail;

export type HomeSortType = 'RECENT' | 'NEARBY' | 'SEASONAL';
export type HomeLocationStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'unavailable';

export type SeasonalHeroStat = {
  label: string;
  value: string;
};

export type SeasonalMenuItem = {
  seasonalMenuId: number;
  menuType: 'OVERVIEW' | 'RECIPE' | 'MAP' | 'CUSTOM';
  title: string;
  description?: string | null;
  menuImageUrl?: string | null;
  iconName?: string | null;
  routeName: string;
  routeParams?: Record<string, any>;
};

export type SeasonalHeroItem = {
  seasonalFoodId: number;
  month: number;
  monthLabel: string;
  seasonalTerm?: string | null;
  name: string;
  category: string;
  headline: string;
  subcopy: string;
  cardImageUrl?: string | null;
  cardImageMobileUrl?: string | null;
  accentColor: string;
  accentSoftColor: string;
  orbStrongColor: string;
  orbSoftColor: string;
  stats: SeasonalHeroStat[];
};

export type SeasonalHomeData = {
  basisInfo: {
    basis: 'MONTH' | 'TERM';
    referenceDate?: string | null;
    month?: number | null;
    seasonalTerm?: string | null;
  };
  hero: SeasonalHeroItem | null;
  chips: Array<{
    seasonalFoodId: number;
    foodName: string;
    isActive: boolean;
  }>;
  foods: Array<{
    seasonalFoodId: number;
    seasonalTerm?: string | null;
    month: number;
    foodName: string;
    category: string;
    cardImageUrl?: string | null;
    cardImageMobileUrl?: string | null;
  }>;
};

export interface HomeMapPreviewProps {
  onPressMarker?: (marker: NearbyStoreMarker) => void;
  onNearbyStateChange?: (payload: HomeNearbyStatePayload) => void;
  onVisibleRegionChange?: (payload: VisibleRegionPayload) => void;
  onPressMap?: () => void;
  interactive?: boolean;
  isActive?: boolean;
  style?: any;
  selectedMarkerKey?: string | null;
  initialFocusCoordinate?: LatLng | null;
  suspendInitialUserCentering?: boolean;
  onRequestCenterUser?: (fn?: () => void) => void;
  onLocationStatusChange?: (status: HomeLocationStatus) => void;
  onUserLocationResolved?: (coord: LatLng) => void;
  routePolyline?: LatLng[] | null;
  routeOriginCoordinate?: LatLng | null;
  routeDestinationCoordinate?: LatLng | null;
}

export interface HomeNearbyStatePayload {
  markers: NearbyStoreMarker[];
  loading: boolean;
  error: string | null;
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
