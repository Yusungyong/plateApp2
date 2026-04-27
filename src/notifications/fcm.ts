// src/notifications/fcm.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

import { updateUserFcmToken } from '../api/userApi';
import { createLogger } from '../utils/logger';
import { emitNotificationEvent } from './notificationEvents';

const FCM_TOKEN_STORAGE_KEY = 'fcm:lastToken';
const syncedTokenKey = (username: string) => `fcm:lastSynced:${username}`;
const log = createLogger('[fcm]');

const getCachedToken = async () => AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
const setCachedToken = async (token: string) =>
  AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

const getLastSyncedToken = async (username: string) =>
  AsyncStorage.getItem(syncedTokenKey(username));
const setLastSyncedToken = async (username: string, token: string) =>
  AsyncStorage.setItem(syncedTokenKey(username), token);

const ANDROID_NOTIFICATION_PERMISSION_RATIONALE = {
  title: '알림 권한이 필요해요',
  message:
    '새 댓글, 좋아요, 친구 요청 같은 중요한 소식을 제때 알려드리기 위해 알림 권한을 허용해주세요.',
  buttonPositive: '허용하기',
  buttonNegative: '나중에',
};

const ensureNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ANDROID_NOTIFICATION_PERMISSION_RATIONALE,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  const messaging = getMessaging(getApp());
  const authStatus = await requestPermission(messaging);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
};

export const syncFcmTokenWithServer = async (username: string, token?: string) => {
  if (!username) return;
  const nextToken = token ?? (await getCachedToken());
  if (!nextToken) return;

  const lastSynced = await getLastSyncedToken(username);
  if (lastSynced === nextToken) return;

  await updateUserFcmToken(username, nextToken);
  await setLastSyncedToken(username, nextToken);
};

export const initFcmMessaging = (params: { username?: string | null } = {}) => {
  const { username } = params;
  const messaging = getMessaging(getApp());

  const start = async () => {
    try {
      const permitted = await ensureNotificationPermission();
      if (!permitted) return;

      await registerDeviceForRemoteMessages(messaging);
      const token = await getToken(messaging);
      if (token) {
        await setCachedToken(token);
        if (username) {
          await syncFcmTokenWithServer(username, token);
        }
      }
    } catch (e) {
      log.warn('init failed', e);
    }
  };

  void start();

  const unsubscribeOnMessage = onMessage(messaging, async () => {
    emitNotificationEvent({ type: 'message' });
  });

  const unsubscribeOnTokenRefresh = onTokenRefresh(messaging, async newToken => {
    try {
      await setCachedToken(newToken);
      if (username) {
        await syncFcmTokenWithServer(username, newToken);
      }
    } catch (e) {
      log.warn('token refresh failed', e);
    }
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnTokenRefresh();
  };
};
