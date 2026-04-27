// src/screens/home/hooks/useMarkerGroups.ts
import { useMemo } from 'react';
import type { NearbyStoreMarker } from '../../../api/mapStoreApi';
import type { MarkerGroup } from '../types';

const CLUSTER_RADIUS_METERS = 20;

const distanceMeters = (a: NearbyStoreMarker, b: NearbyStoreMarker) => {
  const earthRadius = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const calc =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return earthRadius * c;
};

export const useMarkerGroups = (storeMarkers: NearbyStoreMarker[]) =>
  useMemo<MarkerGroup[]>(() => {
    if (!storeMarkers.length) return [];

    const groups: MarkerGroup[] = [];
    const visited = new Set<number>();

    storeMarkers.forEach((marker, index) => {
      if (visited.has(index)) {
        return;
      }
      const cluster: NearbyStoreMarker[] = [marker];
      visited.add(index);
      for (let j = index + 1; j < storeMarkers.length; j += 1) {
        if (visited.has(j)) continue;
        const candidate = storeMarkers[j];
        if (distanceMeters(marker, candidate) <= CLUSTER_RADIUS_METERS) {
          cluster.push(candidate);
          visited.add(j);
        }
      }
      if (cluster.length === 1) {
        groups.push({ type: 'single', marker });
      } else {
        const totalFeedCount = cluster.reduce(
          (sum, current) => sum + (current.feedCount ?? 0),
          0,
        );
        groups.push({
          type: 'cluster',
          marker,
          items: cluster,
          totalFeedCount,
        });
      }
    });

    return groups;
  }, [storeMarkers]);
