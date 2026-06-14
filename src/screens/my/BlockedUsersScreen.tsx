import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useTheme } from '../../styles/theme';
import { buildProfileUri } from '../../utils/profileImage';
import { formatDateTime } from '../../utils/dateTime';
import { fetchBlockedUsers, unblockUser, type BlockedUser } from '../../api/blockedUsersApi';
import type { RootStackParamList } from '../../navigation/MainNavigation';

const BlockedUsersScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user?.username) {
      setItems([]);
      setLoading(false);
      setError('로그인이 필요한 페이지입니다.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fetchBlockedUsers({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
    } catch (e) {
      setItems([]);
      setError('차단 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchBlockedUsers({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError('차단 목록을 불러오지 못했어요.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = useCallback(
    (blockedUsername: string) => {
      Alert.alert('차단 해제', '이 사용자를 차단 해제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: () => {
            unblockUser(blockedUsername)
              .then(() => {
                setItems((prev) =>
                  prev.filter((item) => item.blockedUsername !== blockedUsername),
                );
                Alert.alert('해제 완료', '차단이 해제되었습니다.');
              })
              .catch((_e) => {
                Alert.alert('실패', '차단 해제에 실패했어요.');
              });
          },
        },
      ]);
    },
    [],
  );

  const emptyMessage = useMemo(() => {
    if (error) return error;
    return '차단한 사용자가 없습니다.';
  }, [error]);

  return (
    <AppLayout title="차단한 사용자" showBack onPressBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
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
              <TouchableOpacity style={styles.retryButton} onPress={loadBlockedUsers}>
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          items.map((item) => (
            <View key={item.blockedUsername} style={styles.row}>
              <Image
                source={{
                  uri: buildProfileUri(
                    item.blockedUsername,
                    item.blockedProfileImageUrl ?? null,
                  ),
                }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.nameText}>
                  {item.blockedNickname || item.blockedUsername}
                </Text>
                <Text style={styles.subText}>@{item.blockedUsername}</Text>
                {item.blockedActiveRegion ? (
                  <Text style={styles.subText} numberOfLines={1}>
                    {item.blockedActiveRegion}
                  </Text>
                ) : null}
                {item.blockedAt ? (
                  <Text style={styles.dateText}>
                    {formatDateTime(item.blockedAt)} 차단
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item.blockedUsername)}
              >
                <Text style={styles.unblockButtonText}>해제</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default BlockedUsersScreen;

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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
      marginBottom: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    info: {
      flex: 1,
      marginLeft: 12,
    },
    nameText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    subText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    dateText: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    unblockButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.backgroundSoft,
    },
    unblockButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
  });
