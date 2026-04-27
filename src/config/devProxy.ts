import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Config from 'react-native-config';

const DEFAULT_ANDROID_EMULATOR_PROXY_BASE_URL = 'http://10.0.2.2:8099';

const getConfiguredProxyBaseUrl = () => {
  const value = ((Config as any).ANDROID_EMULATOR_PROXY_URL ||
    DEFAULT_ANDROID_EMULATOR_PROXY_BASE_URL) as string;
  return value.trim().replace(/\/+$/, '');
};

const shouldUseAndroidEmulatorProxy =
  __DEV__ && Platform.OS === 'android' && DeviceInfo.isEmulatorSync();

export const DEV_PROXY_BASE_URL = shouldUseAndroidEmulatorProxy
  ? getConfiguredProxyBaseUrl()
  : '';

export const getApiBaseUrl = (defaultBaseUrl: string) =>
  DEV_PROXY_BASE_URL ? `${DEV_PROXY_BASE_URL}/api-proxy` : defaultBaseUrl;

export const proxifyRemoteUrl = (value?: string | null) => {
  if (!value) {
    return value;
  }
  if (!DEV_PROXY_BASE_URL || !/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${DEV_PROXY_BASE_URL}/asset-proxy?url=${encodeURIComponent(value)}`;
};
