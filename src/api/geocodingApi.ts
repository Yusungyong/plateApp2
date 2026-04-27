import Config from 'react-native-config';

export type GeocodingResult = {
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
};

export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  const apiKey = Config.GEOCODING_API_KEY;
  if (!apiKey) {
    throw new Error('GEOCODING_API_KEY is missing');
  }
  const query = encodeURIComponent(address);
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&language=ko`,
  );
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }
  const first = data.results[0];
  const location = first?.geometry?.location;
  if (!location?.lat || !location?.lng || !first?.place_id) {
    return null;
  }
  return {
    lat: location.lat,
    lng: location.lng,
    placeId: first.place_id,
    formattedAddress: first.formatted_address ?? address,
  };
};
