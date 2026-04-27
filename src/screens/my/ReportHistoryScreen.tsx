import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import { fetchReportHistory, type ReportHistoryItem } from '../../api/reportHistoryApi';
import { formatDateTime } from '../../utils/dateTime';
import { useTheme } from '../../styles/theme';
import type { RootStackParamList } from '../../navigation/MainNavigation';

const targetLabels: Record<string, string> = {
  video: '동영상',
  image: '이미지',
  comment: '댓글',
  user: '사용자',
};

const reasonLabels: Record<string, string> = {
  SPAM: '스팸/광고',
  INAPPROPRIATE: '부적절한 내용',
  COPYRIGHT: '저작권 침해',
  OTHER: '기타',
};

const ReportHistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user?.username) {
      setItems([]);
      setLoading(false);
      setError('로그인이 필요한 페이지입니다.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fetchReportHistory({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
    } catch (e) {
      setItems([]);
      setError('신고 내역을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchReportHistory({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError('신고 내역을 불러오지 못했어요.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  const emptyMessage = useMemo(() => {
    if (error) return error;
    return '신고 내역이 없습니다.';
  }, [error]);

  const openTarget = useCallback(
    (item: ReportHistoryItem) => {
      if (item.targetType === 'video') {
        if (!item.placeId) {
          Alert.alert('열 수 없어요', '영상 정보를 찾지 못했어요. (placeId 없음)');
          return;
        }
        navigation.navigate('VideoFeedScreen', {
          storeId: item.targetId,
          placeId: item.placeId,
          username: user?.username ?? '',
        });
        return;
      }
      if (item.targetType === 'image') {
        navigation.navigate('ImageFeedViewer', { feedId: item.targetId });
        return;
      }
      Alert.alert('지원하지 않아요', '영상/이미지 신고만 이동할 수 있어요.');
    },
    [navigation, user?.username],
  );

  return (
    <AppLayout title="신고 내역" showBack onPressBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 60) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.centerText}>불러오는 중…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerText}>{emptyMessage}</Text>
            {error ? (
              <TouchableOpacity style={styles.retryButton} onPress={loadReports}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          items.map((item) => {
            const reasonText = item.reason
              ? reasonLabels[item.reason] ?? item.reason
              : item.description || '-';
            const targetLabel = targetLabels[item.targetType] ?? item.targetType ?? '-';
            const targetSummary = item.description ? item.description : `${targetLabel} #${item.targetId}`;
            const isNavigable = item.targetType === 'video' || item.targetType === 'image';
            return (
              <TouchableOpacity
                key={`${item.reportId}`}
                style={[styles.card, isNavigable && styles.cardInteractive]}
                activeOpacity={isNavigable ? 0.85 : 1}
                disabled={!isNavigable}
                onPress={() => openTarget(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{reasonText}</Text>
                  <Text style={styles.cardMeta}>{formatDateTime(item.createdAt ?? null)}</Text>
                </View>
                <Text style={styles.cardSub}>대상: {targetSummary}</Text>
                {item.description ? (
                  <Text style={styles.cardSub}>
                    콘텐츠: {targetLabel} #{item.targetId}
                  </Text>
                ) : null}
                {item.targetUsername ? (
                  <Text style={styles.cardSub}>사용자: @{item.targetUsername}</Text>
                ) : null}
                {item.status ? (
                  <View style={styles.statusChip}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                ) : null}
                {isNavigable ? <Text style={styles.openHint}>보러가기 ›</Text> : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default ReportHistoryScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: colors.background,
    },
    centerBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    centerText: {
      marginTop: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.brandPrimary,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: '700',
    },
    card: {
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
      padding: 16,
      marginBottom: 12,
    },
    cardInteractive: {
      borderColor: colors.divider,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    cardMeta: {
      fontSize: 12,
      color: colors.textMuted,
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusChip: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    openHint: {
      marginTop: 10,
      fontSize: 12,
      color: colors.brandPrimary,
      fontWeight: '700',
    },
  });
