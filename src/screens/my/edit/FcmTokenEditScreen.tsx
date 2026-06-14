import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/AuthProvider';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import {
  collectFcmDebugState,
  loadStoredFcmDebugState,
  refreshFcmRegistration,
  type FcmDebugState,
} from '../../../notifications/fcm';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString('ko-KR');
};

const boolLabel = (value: boolean) => (value ? '예' : '아니오');

const FcmTokenEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<FcmDebugState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const username = user?.username ?? null;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const next = await collectFcmDebugState({ username });
      setSnapshot(next);
    } catch {
      const stored = await loadStoredFcmDebugState();
      setSnapshot(stored);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      loadSnapshot().catch(() => undefined);
    }, [loadSnapshot]),
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const next = await collectFcmDebugState({ username });
      setSnapshot(next);
    } catch {
      Alert.alert('푸시 진단', '현재 상태를 다시 읽지 못했어요.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, username]);

  const handleRegisterAndSync = useCallback(
    async (requestPermissionIfNeeded: boolean) => {
      if (!username) {
        Alert.alert('푸시 진단', '로그인 후 다시 시도해 주세요.');
        return;
      }

      if (refreshing) return;
      setRefreshing(true);
      try {
        await refreshFcmRegistration({
          username,
          requestPermissionIfNeeded,
          syncWithServer: true,
        });
        const next =
          (await loadStoredFcmDebugState()) ??
          (await collectFcmDebugState({ username }));
        setSnapshot(next);
      } catch {
        Alert.alert('푸시 진단', '토큰 재등록 또는 서버 동기화에 실패했어요.');
      } finally {
        setRefreshing(false);
      }
    },
    [refreshing, username],
  );

  const statusRows = useMemo(
    () => [
      { label: '사용자', value: snapshot?.username ?? username ?? '-' },
      { label: '권한 상태', value: snapshot?.permissionStatus ?? '-' },
      { label: '권한 허용', value: boolLabel(snapshot?.permissionGranted ?? false) },
      {
        label: '원격 메시지 등록',
        value: boolLabel(snapshot?.isRegisteredForRemoteMessages ?? false),
      },
      { label: '마지막 동기화', value: snapshot?.lastSyncStatus ?? '-' },
      { label: '동기화 시각', value: formatDateTime(snapshot?.lastSyncAt) },
      { label: '스냅샷 시각', value: formatDateTime(snapshot?.updatedAt) },
    ],
    [snapshot, username],
  );

  const tokenSections = useMemo(
    () => [
      {
        key: 'fcm-token',
        title: '현재 FCM 토큰',
        value: snapshot?.fcmToken ?? '-',
      },
      {
        key: 'cached-token',
        title: '로컬 캐시 토큰',
        value: snapshot?.cachedToken ?? '-',
      },
      {
        key: 'server-token',
        title: '마지막 서버 동기화 토큰',
        value: snapshot?.serverSyncedToken ?? '-',
      },
      {
        key: 'apns-token',
        title: 'APNs 토큰',
        value: snapshot?.apnsToken ?? '-',
      },
    ],
    [snapshot],
  );

  return (
    <AppLayout
      title="푸시 진단"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>FCM 클라이언트 진단</Text>
          <Text style={styles.heroDescription}>
            권한, APNs 토큰, FCM 토큰, 마지막 서버 동기화 상태를 한 번에 확인합니다.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <Text style={styles.buttonSecondaryText}>상태 새로고침</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => {
                handleRegisterAndSync(false).catch(() => undefined);
              }}
              disabled={refreshing}
            >
              <Text style={styles.buttonPrimaryText}>재등록 및 동기화</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              handleRegisterAndSync(true).catch(() => undefined);
            }}
            disabled={refreshing}
          >
            <Text style={styles.permissionButtonText}>권한 다시 요청</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#8b6b4f" />
              <Text style={styles.loadingText}>현재 푸시 상태를 읽는 중…</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>상태 요약</Text>
          {statusRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.statusRow, index < statusRows.length - 1 && styles.statusDivider]}
            >
              <Text style={styles.statusLabel}>{row.label}</Text>
              <Text style={styles.statusValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>토큰 정보</Text>
          {tokenSections.map((section) => (
            <View key={section.key} style={styles.tokenBlock}>
              <Text style={styles.tokenTitle}>{section.title}</Text>
              <Text selectable style={styles.tokenValue}>
                {section.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>마지막 오류</Text>
          <Text style={styles.errorValue}>{snapshot?.lastSyncError ?? '없음'}</Text>
        </View>
      </ScrollView>
    </AppLayout>
  );
};

export default FcmTokenEditScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#fff9f2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e3d3c1',
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2e241c',
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#6e5a49',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#8b6b4f',
    marginLeft: 10,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7c3ae',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonSecondaryText: {
    color: '#5d4635',
    fontSize: 14,
    fontWeight: '800',
  },
  permissionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#efe3d6',
  },
  permissionButtonText: {
    color: '#6a513d',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6e5a49',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e0d8',
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2f261e',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  statusDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee6de',
  },
  statusLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6d5c4d',
  },
  statusValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#2f261e',
  },
  tokenBlock: {
    marginBottom: 14,
  },
  tokenTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7b6756',
    marginBottom: 6,
  },
  tokenValue: {
    fontSize: 12,
    lineHeight: 18,
    color: '#2f261e',
    backgroundColor: '#f7f4ef',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorValue: {
    fontSize: 13,
    lineHeight: 20,
    color: '#a63f32',
  },
});
