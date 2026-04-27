import { NativeModules, Platform } from 'react-native';
import { createLogger } from '../utils/logger';

type NativeCoordinate = {
  latitude: number;
  longitude: number;
};

type PlateLocationModuleType = {
  getCurrentPosition: () => Promise<NativeCoordinate | null>;
};

const nativePlateLocation = NativeModules.PlateLocation as PlateLocationModuleType | undefined;
const logger = createLogger('[plateLocation]');

export const getAndroidCurrentPosition = async (): Promise<NativeCoordinate | null> => {
  if (Platform.OS !== 'android' || !nativePlateLocation?.getCurrentPosition) {
    logger.warn('native module unavailable', {
      platform: Platform.OS,
      hasModule: !!nativePlateLocation?.getCurrentPosition,
      moduleKeys: Object.keys(NativeModules ?? {}).filter((key) => key.toLowerCase().includes('plate')),
    });
    return null;
  }

  try {
    const position = await nativePlateLocation.getCurrentPosition();
    logger.debug('native module result', { position });
    return position;
  } catch {
    logger.warn('native module getCurrentPosition failed');
    return null;
  }
};
