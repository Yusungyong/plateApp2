import { NativeModules, Platform } from 'react-native';

type NativeCoordinate = {
  latitude: number;
  longitude: number;
};

type PlateLocationModuleType = {
  getCurrentPosition: () => Promise<NativeCoordinate | null>;
};

const nativePlateLocation = NativeModules.PlateLocation as PlateLocationModuleType | undefined;

export const getAndroidCurrentPosition = async (): Promise<NativeCoordinate | null> => {
  if (Platform.OS !== 'android' || !nativePlateLocation?.getCurrentPosition) {
    return null;
  }

  try {
    return await nativePlateLocation.getCurrentPosition();
  } catch {
    return null;
  }
};
