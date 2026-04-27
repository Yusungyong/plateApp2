// src/screens/home/utils/mapUtils.ts
import type { Region, LatLng } from 'react-native-maps';
import type { HomeLocationStatus } from '../types';

export const DEFAULT_REGION: Region = {
  latitude: 37.5714,
  longitude: 126.9769,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export const calculateVisibleBounds = (region: Region) => {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  return {
    northEast: {
      latitude: region.latitude + halfLat,
      longitude: region.longitude + halfLng,
    },
    southWest: {
      latitude: region.latitude - halfLat,
      longitude: region.longitude - halfLng,
    },
  };
};

export const lastKnownUserLocationRef: { current: LatLng | null } = {
  current: null,
};

export const lastKnownMapRegionRef: { current: Region | null } = {
  current: null,
};

export const lastKnownLocationStatusRef: { current: HomeLocationStatus } = {
  current: 'idle',
};
