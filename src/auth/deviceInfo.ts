// src/auth/deviceInfo.ts
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export type DeviceInfoPayload = {
  deviceId: string | null;
  deviceModel: string | null;
  os: string | null;
  osVersion: string | null;
  appVersion: string | null;
};

export async function getDeviceInfo(): Promise<DeviceInfoPayload> {
  try {
    const deviceId = await DeviceInfo.getUniqueId();      // 고유 디바이스 ID
    const deviceModel = await DeviceInfo.getModel();      // 기기 모델명
    const osVersion = await DeviceInfo.getSystemVersion(); // OS 버전
    const appVersion = await DeviceInfo.getVersion();     // 앱 버전
    const os = Platform.OS === 'ios' ? 'iOS' : 'Android';

    return {
      deviceId,
      deviceModel,
      os,
      osVersion,
      appVersion,
    };
  } catch (e) {
    // 실패해도 로그인 자체는 막지 않기 위해 null로 채움
    return {
      deviceId: null,
      deviceModel: null,
      os: Platform.OS,
      osVersion: null,
      appVersion: null,
    };
  }
}
