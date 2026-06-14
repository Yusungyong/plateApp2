// src/notifications/fcm.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getInitialNotification,
  getAPNSToken,
  getMessaging,
  getToken,
  hasPermission,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

import { getDeviceInfo } from '../auth/deviceInfo';
import { registerMyPushToken } from '../api/userApi';
import { emitNotificationEvent } from './notificationEvents';

const FCM_TOKEN_STORAGE_KEY = 'fcm:lastToken';
const FCM_DEBUG_STORAGE_KEY = 'fcm:debugState';
const syncedTokenKey = (username: string) => `fcm:lastSynced:${username}`;
const syncedAtKey = (username: string) => `fcm:lastSyncedAt:${username}`;
const PUSH_TOKEN_HOME_SYNC_INTERVAL_MS = 72 * 60 * 60 * 1000;
type AuthorizationStatusValue =
  (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus];

const getCachedToken = async () => AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
const setCachedToken = async (token: string) =>
  AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

const getLastSyncedToken = async (username: string) =>
  AsyncStorage.getItem(syncedTokenKey(username));
const setLastSyncedToken = async (username: string, token: string) =>
  AsyncStorage.setItem(syncedTokenKey(username), token);
const getLastSyncedAt = async (username: string) =>
  AsyncStorage.getItem(syncedAtKey(username));
const setLastSyncedAt = async (username: string, value: string) =>
  AsyncStorage.setItem(syncedAtKey(username), value);

export type FcmSyncStatus = 'idle' | 'success' | 'skipped' | 'failed';

export type FcmDebugState = {
  updatedAt: string;
  username: string | null;
  permissionStatus: 'AUTHORIZED' | 'PROVISIONAL' | 'DENIED' | 'NOT_DETERMINED' | 'EPHEMERAL';
  permissionGranted: boolean;
  isRegisteredForRemoteMessages: boolean;
  apnsToken: string | null;
  fcmToken: string | null;
  cachedToken: string | null;
  serverSyncedToken: string | null;
  lastSyncStatus: FcmSyncStatus;
  lastSyncAt: string | null;
  lastSyncError: string | null;
};

const ANDROID_NOTIFICATION_PERMISSION_RATIONALE = {
  title: '알림 권한이 필요해요',
  message:
    '새 댓글, 좋아요, 친구 요청 같은 중요한 소식을 제때 알려드리기 위해 알림 권한을 허용해주세요.',
  buttonPositive: '허용하기',
  buttonNegative: '나중에',
};

const permissionLabelFromStatus = (
  status: AuthorizationStatusValue,
): FcmDebugState['permissionStatus'] => {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
      return 'AUTHORIZED';
    case AuthorizationStatus.PROVISIONAL:
      return 'PROVISIONAL';
    case AuthorizationStatus.EPHEMERAL:
      return 'EPHEMERAL';
    case AuthorizationStatus.DENIED:
      return 'DENIED';
    case AuthorizationStatus.NOT_DETERMINED:
    default:
      return 'NOT_DETERMINED';
  }
};

const isPermissionGranted = (status: AuthorizationStatusValue) =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL ||
  status === AuthorizationStatus.EPHEMERAL;

const getNotificationPermissionStatus = async (requestIfNeeded: boolean) => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = requestIfNeeded
        ? await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            ANDROID_NOTIFICATION_PERMISSION_RATIONALE,
          )
        : (await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          ))
          ? PermissionsAndroid.RESULTS.GRANTED
          : PermissionsAndroid.RESULTS.DENIED;
      return granted === PermissionsAndroid.RESULTS.GRANTED
        ? AuthorizationStatus.AUTHORIZED
        : AuthorizationStatus.DENIED;
    }
    return AuthorizationStatus.AUTHORIZED;
  }

  const messaging = getMessaging(getApp());
  return requestIfNeeded
    ? requestPermission(messaging)
    : hasPermission(messaging);
};

const buildDebugState = async (params: {
  username?: string | null;
  permissionStatus: AuthorizationStatusValue;
  fcmToken?: string | null;
  lastSyncStatus?: FcmSyncStatus;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
}) => {
  const messaging = getMessaging(getApp());
  const { username, permissionStatus, fcmToken, lastSyncStatus, lastSyncAt, lastSyncError } = params;
  const cachedToken = await getCachedToken();
  const serverSyncedToken = username ? await getLastSyncedToken(username) : null;
  const apnsToken =
    Platform.OS === 'ios'
      ? await getAPNSToken(messaging).catch(() => null)
      : null;

  return {
    updatedAt: new Date().toISOString(),
    username: username ?? null,
    permissionStatus: permissionLabelFromStatus(permissionStatus),
    permissionGranted: isPermissionGranted(permissionStatus),
    isRegisteredForRemoteMessages: isDeviceRegisteredForRemoteMessages(messaging),
    apnsToken,
    fcmToken: fcmToken ?? cachedToken ?? null,
    cachedToken,
    serverSyncedToken,
    lastSyncStatus: lastSyncStatus ?? 'idle',
    lastSyncAt: lastSyncAt ?? null,
    lastSyncError: lastSyncError ?? null,
  } satisfies FcmDebugState;
};

const persistDebugState = async (state: FcmDebugState) => {
  await AsyncStorage.setItem(FCM_DEBUG_STORAGE_KEY, JSON.stringify(state));
  return state;
};

const captureDebugState = async (params: {
  username?: string | null;
  permissionStatus: AuthorizationStatusValue;
  fcmToken?: string | null;
  lastSyncStatus?: FcmSyncStatus;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
}) => {
  const state = await buildDebugState(params);
  return persistDebugState(state);
};

const getReadableErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '알 수 없는 오류';
};

export const loadStoredFcmDebugState = async (): Promise<FcmDebugState | null> => {
  const raw = await AsyncStorage.getItem(FCM_DEBUG_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FcmDebugState;
  } catch {
    return null;
  }
};

export const collectFcmDebugState = async (params: {
  username?: string | null;
} = {}) => {
  const permissionStatus = await getNotificationPermissionStatus(false);
  return captureDebugState({
    username: params.username,
    permissionStatus,
  });
};

export const syncFcmTokenWithServer = async (
  username: string,
  token?: string,
  permissionStatus?: AuthorizationStatusValue,
  options: {
    force?: boolean;
    reason?: 'manual' | 'home-entry' | 'token-refresh';
  } = {},
) => {
  if (!username) return;
  const nextToken = token ?? (await getCachedToken());
  const nextPermissionStatus =
    permissionStatus ?? (await getNotificationPermissionStatus(false));
  const syncStartedAt = new Date().toISOString();
  const { force = false } = options;

  if (!nextToken) {
    await captureDebugState({
      username,
      permissionStatus: nextPermissionStatus,
      lastSyncStatus: 'skipped',
      lastSyncAt: syncStartedAt,
      lastSyncError: 'FCM 토큰이 아직 없습니다.',
    });
    return;
  }

  const device = await getDeviceInfo();
  if (!device.deviceId) {
    await captureDebugState({
      username,
      permissionStatus: nextPermissionStatus,
      fcmToken: nextToken,
      lastSyncStatus: 'failed',
      lastSyncAt: syncStartedAt,
      lastSyncError: 'deviceId를 확인하지 못했습니다.',
    });
    return;
  }

  const lastSynced = await getLastSyncedToken(username);
  const lastSyncedAtRaw = await getLastSyncedAt(username);
  const lastSyncedAt = lastSyncedAtRaw ? Number(lastSyncedAtRaw) : 0;
  const isExpired =
    !lastSyncedAt || Date.now() - lastSyncedAt >= PUSH_TOKEN_HOME_SYNC_INTERVAL_MS;
  const tokenChanged = lastSynced !== nextToken;

  if (!force && !tokenChanged && !isExpired) {
    await captureDebugState({
      username,
      permissionStatus: nextPermissionStatus,
      fcmToken: nextToken,
      lastSyncStatus: 'skipped',
      lastSyncAt: syncStartedAt,
      lastSyncError: null,
    });
    return;
  }

  try {
    await registerMyPushToken({
      deviceId: device.deviceId,
      fcmToken: nextToken,
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    });
    await setLastSyncedToken(username, nextToken);
    await setLastSyncedAt(username, String(Date.now()));
    await captureDebugState({
      username,
      permissionStatus: nextPermissionStatus,
      fcmToken: nextToken,
      lastSyncStatus: 'success',
      lastSyncAt: syncStartedAt,
      lastSyncError: null,
    });
  } catch (error) {
    await captureDebugState({
      username,
      permissionStatus: nextPermissionStatus,
      fcmToken: nextToken,
      lastSyncStatus: 'failed',
      lastSyncAt: syncStartedAt,
      lastSyncError: getReadableErrorMessage(error),
    });
    throw error;
  }
};

export const syncFcmTokenOnHomeEntry = async (params: {
  username?: string | null;
  force?: boolean;
}) => {
  const { username, force = false } = params;
  if (!username) {
    return null;
  }

  const token = await refreshFcmRegistration({
    username,
    requestPermissionIfNeeded: false,
    syncWithServer: false,
  });

  if (!token) {
    return null;
  }

  const permissionStatus = await getNotificationPermissionStatus(false);
  await syncFcmTokenWithServer(username, token, permissionStatus, {
    force,
    reason: 'home-entry',
  });
  return token;
};

export const refreshFcmRegistration = async (params: {
  username?: string | null;
  requestPermissionIfNeeded?: boolean;
  syncWithServer?: boolean;
} = {}) => {
  const {
    username,
    requestPermissionIfNeeded = true,
    syncWithServer = true,
  } = params;
  const messaging = getMessaging(getApp());
  const permissionStatus = await getNotificationPermissionStatus(requestPermissionIfNeeded);

  if (!isPermissionGranted(permissionStatus)) {
    await captureDebugState({
      username,
      permissionStatus,
      lastSyncStatus: 'skipped',
      lastSyncAt: new Date().toISOString(),
      lastSyncError: '알림 권한이 허용되지 않았습니다.',
    });
    return null;
  }

  try {
    if (!isDeviceRegisteredForRemoteMessages(messaging)) {
      await registerDeviceForRemoteMessages(messaging);
    }

    const token = await getToken(messaging);
    if (token) {
      await setCachedToken(token);
      if (username && syncWithServer) {
        await syncFcmTokenWithServer(username, token, permissionStatus, {
          force: true,
          reason: 'manual',
        });
      } else {
        await captureDebugState({
          username,
          permissionStatus,
          fcmToken: token,
          lastSyncStatus: 'idle',
          lastSyncError: null,
        });
      }
    }

    return token;
  } catch (error) {
    await captureDebugState({
      username,
      permissionStatus,
      lastSyncStatus: 'failed',
      lastSyncAt: new Date().toISOString(),
      lastSyncError: getReadableErrorMessage(error),
    });
    return null;
  }
};

export const initFcmMessaging = (params: { username?: string | null } = {}) => {
  const { username } = params;
  const messaging = getMessaging(getApp());

  refreshFcmRegistration({
    username,
    requestPermissionIfNeeded: true,
    syncWithServer: false,
  }).catch(() => undefined);

  const unsubscribeOnMessage = onMessage(messaging, async () => {
    await collectFcmDebugState({ username }).catch(() => undefined);
    emitNotificationEvent({ type: 'message' });
  });

  const handleNotificationInteraction = async () => {
    await collectFcmDebugState({ username }).catch(() => undefined);
    emitNotificationEvent({ type: 'message' });
  };

  const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(
    messaging,
    handleNotificationInteraction,
  );

  getInitialNotification(messaging)
    .then(message => {
      if (message) {
        handleNotificationInteraction().catch(() => undefined);
      }
    })
    .catch(() => undefined);

  const unsubscribeOnTokenRefresh = onTokenRefresh(messaging, async newToken => {
    try {
      await setCachedToken(newToken);
      const permissionStatus = await getNotificationPermissionStatus(false);
      if (username) {
        await syncFcmTokenWithServer(username, newToken, permissionStatus, {
          force: true,
          reason: 'token-refresh',
        });
      } else {
        await captureDebugState({
          username,
          permissionStatus,
          fcmToken: newToken,
          lastSyncStatus: 'idle',
          lastSyncError: null,
        });
      }
    } catch {}
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpenedApp();
    unsubscribeOnTokenRefresh();
  };
};
