import Config from 'react-native-config';
import type { LatLng } from 'react-native-maps';

export type RouteTravelMode = 'driving' | 'walking' | 'transit';

export type InAppDirectionsResult = {
  coordinates: LatLng[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  modeUsed: RouteTravelMode;
};

const resolveMapsApiKey = () =>
  Config.GOOGLE_MAPS_API_KEY || Config.GEOCODING_API_KEY || '';

const toRadians = (value: number) => (value * Math.PI) / 180;

const areCoordinatesEqual = (a: LatLng, b: LatLng) =>
  Math.abs(a.latitude - b.latitude) < 1e-6 &&
  Math.abs(a.longitude - b.longitude) < 1e-6;

const decodePolyline = (encoded: string): LatLng[] => {
  /* eslint-disable no-bitwise */
  const coordinates: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLng;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  /* eslint-enable no-bitwise */
  return coordinates;
};

const ensureRouteEndpoints = (
  coordinates: LatLng[],
  origin: LatLng,
  destination: LatLng,
): LatLng[] => {
  if (coordinates.length === 0) {
    return [origin, destination];
  }
  const next = [...coordinates];
  if (!areCoordinatesEqual(next[0], origin)) {
    next.unshift(origin);
  }
  if (!areCoordinatesEqual(next[next.length - 1], destination)) {
    next.push(destination);
  }
  return next;
};

export const estimateFallbackDistanceMeters = (
  origin: LatLng,
  destination: LatLng,
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const calc =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return Math.round(earthRadius * c);
};

export const fetchInAppDirections = async ({
  origin,
  destination,
  mode = 'driving',
}: {
  origin: LatLng;
  destination: LatLng;
  mode?: RouteTravelMode;
}): Promise<InAppDirectionsResult | null> => {
  const apiKey = resolveMapsApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is missing');
  }

  const requestedModes: RouteTravelMode[] = [mode];
  const attemptedModes = new Set<RouteTravelMode>(requestedModes);

  const runRequest = async (travelMode: RouteTravelMode) => {
    const query = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: travelMode,
      language: 'ko',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${query.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Directions failed: ${response.status}`);
    }

    const payload = await response.json();
    return payload;
  };

  while (requestedModes.length > 0) {
    const currentMode = requestedModes.shift()!;
    const payload = await runRequest(currentMode);

    if (payload?.status === 'ZERO_RESULTS') {
      const availableModes = Array.isArray(payload?.available_travel_modes)
        ? payload.available_travel_modes
            .map((value: unknown) =>
              typeof value === 'string' ? value.toLowerCase() : '',
            )
            .filter(
              (value: string): value is RouteTravelMode =>
                value === 'walking' || value === 'driving' || value === 'transit',
            )
        : [];

      for (const fallbackMode of availableModes) {
        if (!attemptedModes.has(fallbackMode)) {
          attemptedModes.add(fallbackMode);
          requestedModes.push(fallbackMode);
        }
      }
      continue;
    }

    if (payload?.status !== 'OK') {
      throw new Error(
        payload?.error_message || payload?.status || 'Directions request failed',
      );
    }

    const route = Array.isArray(payload?.routes) ? payload.routes[0] : null;
    if (!route) {
      return null;
    }

    const overviewPolyline = route?.overview_polyline?.points;
    const rawCoordinates =
      typeof overviewPolyline === 'string' && overviewPolyline
        ? decodePolyline(overviewPolyline)
        : [];
    const coordinates = ensureRouteEndpoints(
      rawCoordinates,
      origin,
      destination,
    );

    type DirectionLeg = {
      distance?: { value?: number | string | null } | null;
      duration?: { value?: number | string | null } | null;
    };

    const legs: DirectionLeg[] = Array.isArray(route?.legs) ? route.legs : [];
    const distanceMeters = legs.reduce<number>((sum, leg) => {
      const value = Number(leg?.distance?.value);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    const durationSeconds = legs.reduce<number>((sum, leg) => {
      const value = Number(leg?.duration?.value);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return {
      coordinates,
      distanceMeters:
        distanceMeters > 0
          ? distanceMeters
          : estimateFallbackDistanceMeters(origin, destination),
      durationSeconds: durationSeconds > 0 ? durationSeconds : null,
      modeUsed: currentMode,
    };
  }

  return null;
};
