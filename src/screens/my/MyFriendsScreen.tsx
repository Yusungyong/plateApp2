import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendLists,
  removeFriend,
  searchFriends,
  sendFriendRequest,
  type FriendProfile,
  type FriendRequest,
} from '../../api/friendsApi';
import {
  fetchFriendRecentStores,
  fetchFriendVisitFeed,
  fetchUpcomingFriendVisits,
  type FriendRecentStore,
  type FriendUpcomingVisit,
  type FriendVisitItem,
} from '../../api/friendVisitApi';
import { fetchVideoFeed } from '../../api/videoFeedApi';
import { useTheme } from '../../styles/theme';
import { buildProfileUri } from '../../utils/profileImage';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate, formatMonthDay } from '../../utils/dateTime';
import ProfileSectionCard from './components/ProfileSectionCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FriendStyles = ReturnType<typeof createStyles>;
type FriendTab = 'discover' | 'requests' | 'friends' | 'activity';

const FriendAvatar: React.FC<{
  uri?: string | null;
  username?: string | null;
  styles: FriendStyles;
}> = ({ uri, username, styles }) => {
  const profileUri = buildProfileUri(username ?? undefined, uri ?? null);
  return <Image source={{ uri: profileUri }} style={styles.avatar} />;
};

const MyFriendsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FriendTab>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [visitFeed, setVisitFeed] = useState<FriendVisitItem[]>([]);
  const [visitLoading, setVisitLoading] = useState(false);
  const [recentStores, setRecentStores] = useState<FriendRecentStore[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [upcomingVisits, setUpcomingVisits] = useState<FriendUpcomingVisit[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [openingStoreId, setOpeningStoreId] = useState<number | null>(null);

  const username = user?.username;

  const loadData = useCallback(async () => {
    if (!username) {
      setFriends([]);
      setRequests([]);
      setSentRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { friends: friendList, requests: requestList } = await fetchFriendLists(username);
      const incoming = requestList.filter(
        (req) => (req.initiatorUsername ?? '').toLowerCase() !== username.toLowerCase(),
      );
      const outgoing = requestList.filter(
        (req) => (req.initiatorUsername ?? '').toLowerCase() === username.toLowerCase(),
      );
      setFriends(friendList);
      setRequests(incoming);
      setSentRequests(outgoing);
    } catch {
      setFriends([]);
      setRequests([]);
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadVisitFeed = useCallback(async () => {
    if (!username) {
      setVisitFeed([]);
      setVisitLoading(false);
      return;
    }
    try {
      setVisitLoading(true);
      const res = await fetchFriendVisitFeed({
        username,
        limit: 5,
      });
      setVisitFeed(res.items ?? []);
    } catch {
      setVisitFeed([]);
    } finally {
      setVisitLoading(false);
    }
  }, [username]);

  const loadRecentStores = useCallback(async () => {
    if (!username) {
      setRecentStores([]);
      setRecentLoading(false);
      return;
    }
    try {
      setRecentLoading(true);
      const res = await fetchFriendRecentStores({
        username,
        limit: 5,
      });
      setRecentStores(res ?? []);
    } catch {
      setRecentStores([]);
    } finally {
      setRecentLoading(false);
    }
  }, [username]);

  const loadUpcomingVisits = useCallback(async () => {
    if (!username) {
      setUpcomingVisits([]);
      setUpcomingLoading(false);
      return;
    }
    try {
      setUpcomingLoading(true);
      const today = new Date();
      const from = today.toISOString();
      const to = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 14).toISOString();
      const res = await fetchUpcomingFriendVisits({
        username,
        from,
        to,
        limit: 5,
      });
      setUpcomingVisits(res ?? []);
    } catch {
      setUpcomingVisits([]);
    } finally {
      setUpcomingLoading(false);
    }
  }, [username]);

  const loadActivityBundle = useCallback(async () => {
    await Promise.all([loadVisitFeed(), loadRecentStores(), loadUpcomingVisits()]);
  }, [loadRecentStores, loadUpcomingVisits, loadVisitFeed]);

  useEffect(() => {
    if (activeTab !== 'activity' || activityLoaded || !username) {
      return;
    }
    setActivityLoaded(true);
    void loadActivityBundle();
  }, [activeTab, activityLoaded, loadActivityBundle, username]);

  useEffect(() => {
    const keyword = searchTerm.trim();
    if (keyword.length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchFriends(keyword);
        if (!cancelled) {
          setSearchResults(res);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const handleRemoveFriend = useCallback(async (friend: FriendProfile) => {
    try {
      await removeFriend(friend.id);
      setFriends((prev) => prev.filter((item) => item.id !== friend.id));
      setActionMessage(`${friend.nickname || friend.username} 님을 친구에서 삭제했어요.`);
    } catch {
      setActionMessage('친구를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, []);

  const handleAcceptRequest = useCallback(async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request.id);
      setRequests((prev) => prev.filter((item) => item.id !== request.id));
      setFriends((prev) => [
        {
          id: request.id,
          username: request.username,
          nickname: request.nickname,
          avatarUrl: request.avatarUrl,
          since: request.requestedAt,
        },
        ...prev,
      ]);
      setActionMessage(`${request.nickname} 님과 친구가 되었어요.`);
    } catch {
      setActionMessage('요청을 수락하지 못했어요.');
    }
  }, []);

  const handleDeclineRequest = useCallback(async (request: FriendRequest) => {
    try {
      await declineFriendRequest(request.id);
      setRequests((prev) => prev.filter((item) => item.id !== request.id));
      setActionMessage(`${request.nickname} 님의 신청을 거절했어요.`);
    } catch {
      setActionMessage('요청을 거절하지 못했어요.');
    }
  }, []);

  const handleCancelSentRequest = useCallback(async (request: FriendRequest) => {
    try {
      await removeFriend(request.id);
      setSentRequests((prev) => prev.filter((item) => item.id !== request.id));
      setActionMessage('보낸 친구 요청을 취소했어요.');
    } catch {
      setActionMessage('보낸 요청을 취소하지 못했어요.');
    }
  }, []);

  const handleSendRequest = useCallback(
    async (friend: FriendProfile) => {
      if (!username) {
        setActionMessage('로그인 후 친구 신청을 보낼 수 있어요.');
        return;
      }
      try {
        await sendFriendRequest({
          username,
          friendName: friend.username,
          message: null,
        });
        await loadData();
        setActionMessage(`${friend.nickname || friend.username} 님에게 친구 신청을 보냈어요.`);
      } catch {
        setActionMessage('친구 신청에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    },
    [loadData, username],
  );

  const handleOpenHistory = useCallback(
    (friend: FriendProfile) => {
      navigation.navigate('FriendVisitHistory', {
        friendUsername: friend.username,
        friendNickname: friend.nickname,
      });
    },
    [navigation],
  );

  const handleOpenStoreVideos = useCallback(
    async (store: FriendRecentStore) => {
      if (!username) {
        return;
      }
      if (!store.placeId) {
        Alert.alert('이동할 수 없어요', '해당 가게의 placeId 정보가 없어 영상을 열 수 없어요.');
        return;
      }
      if (openingStoreId) {
        return;
      }
      setOpeningStoreId(store.storeId);
      try {
        const preview = await fetchVideoFeed({
          username,
          storeId: store.storeId,
          placeId: store.placeId,
        });
        if (!preview || preview.length === 0) {
          Alert.alert('콘텐츠를 찾지 못했어요', '해당 가게의 영상이 아직 등록되지 않았어요.');
          return;
        }
        navigation.navigate('VideoFeedScreen', {
          storeId: store.storeId,
          placeId: store.placeId,
          username,
        });
      } catch {
        Alert.alert('열 수 없어요', '서버에서 영상을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setOpeningStoreId(null);
      }
    },
    [navigation, openingStoreId, username],
  );

  const summaryItems = useMemo(
    () => [
      { key: 'friends', label: '친구', value: String(friends.length) },
      { key: 'requests', label: '받은 요청', value: String(requests.length) },
      { key: 'sent', label: '보낸 요청', value: String(sentRequests.length) },
      {
        key: 'visits',
        label: '다가올 약속',
        value: activityLoaded ? String(upcomingVisits.length) : '-',
      },
    ],
    [activityLoaded, friends.length, requests.length, sentRequests.length, upcomingVisits.length],
  );

  const tabs = useMemo(
    () => [
      { key: 'discover' as const, label: '탐색' },
      { key: 'requests' as const, label: '요청' },
      { key: 'friends' as const, label: '친구' },
      { key: 'activity' as const, label: '활동' },
    ],
    [],
  );

  const renderDiscoverTab = () => (
    <>
      <ProfileSectionCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>친구 찾기</Text>
        <Text style={styles.sectionDescription}>
          닉네임, 사용자명, 활동 지역으로 친구를 검색하고 바로 요청을 보낼 수 있습니다.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="닉네임, 사용자명, 활동지역으로 검색"
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.brandPrimary}
              style={styles.searchLoader}
            />
          ) : null}
        </View>

        {searchTerm.trim().length === 0 ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>검색 팁</Text>
            <Text style={styles.tipText}>
              정확한 사용자명을 모르더라도 지역명으로 검색해 후보를 빠르게 좁힐 수 있습니다.
            </Text>
          </View>
        ) : searchResults.length > 0 ? (
          <View style={styles.resultsWrap}>
            {searchResults.map((result) => (
              <View key={`${result.username}-${result.id}`} style={styles.friendRow}>
                <FriendAvatar uri={result.avatarUrl} username={result.username} styles={styles} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{result.nickname}</Text>
                  <Text style={styles.friendMeta}>
                    @{result.username} · {result.activeRegion ?? '지역 정보 없음'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleSendRequest(result)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>친구 신청</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : !searchLoading ? (
          <Text style={styles.emptyHint}>'{searchTerm}'에 대한 결과가 없어요.</Text>
        ) : null}
      </ProfileSectionCard>
    </>
  );

  const renderRequestsTab = () => (
    <>
      <ProfileSectionCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>받은 친구 요청</Text>
          <Text style={styles.sectionBadge}>{requests.length}</Text>
        </View>
        {requests.length === 0 ? (
          <Text style={styles.emptyHint}>새로운 친구 요청이 없어요.</Text>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <FriendAvatar uri={request.avatarUrl} username={request.username} styles={styles} />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{request.nickname}</Text>
                <Text style={styles.friendMeta}>@{request.username}</Text>
                <Text style={styles.timelineText}>
                  요청 {formatDate(request.requestedAt) || '확인 중'}
                </Text>
                {request.message ? (
                  <Text style={styles.requestMessage} numberOfLines={2}>
                    "{request.message}"
                  </Text>
                ) : null}
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptRequest(request)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptBtnText}>수락</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleDeclineRequest(request)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.rejectBtnText}>거절</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ProfileSectionCard>

      <ProfileSectionCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>보낸 친구 요청</Text>
          <Text style={styles.sectionBadge}>{sentRequests.length}</Text>
        </View>
        {sentRequests.length === 0 ? (
          <Text style={styles.emptyHint}>보낸 친구 요청이 없어요.</Text>
        ) : (
          sentRequests.map((request) => (
            <View key={request.id} style={styles.sentRow}>
              <View style={styles.sentInfo}>
                <FriendAvatar uri={request.avatarUrl} username={request.username} styles={styles} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{request.nickname}</Text>
                  <Text style={styles.friendMeta}>@{request.username}</Text>
                  <Text style={styles.timelineText}>
                    보낸 날짜 {formatDate(request.requestedAt) || '확인 중'}
                  </Text>
                  {request.message ? (
                    <Text style={styles.requestMessage} numberOfLines={2}>
                      "{request.message}"
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={styles.sentCancelBtn}
                onPress={() => handleCancelSentRequest(request)}
                activeOpacity={0.85}
              >
                <Text style={styles.sentCancelText}>신청 취소</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ProfileSectionCard>
    </>
  );

  const renderFriendsTab = () => (
    <ProfileSectionCard style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 친구 목록</Text>
        <Text style={styles.sectionBadge}>{friends.length}</Text>
      </View>
      {friends.length === 0 ? (
        <Text style={styles.emptyHint}>아직 등록된 친구가 없어요. 탐색 탭에서 첫 친구를 찾아보세요.</Text>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.friendRow}>
            <FriendAvatar uri={friend.avatarUrl} username={friend.username} styles={styles} />
            <TouchableOpacity
              style={styles.friendInfoPress}
              activeOpacity={0.85}
              onPress={() => handleOpenHistory(friend)}
            >
              <Text style={styles.friendName}>{friend.nickname}</Text>
              <Text style={styles.friendMeta}>
                @{friend.username} · {friend.activeRegion ?? '활동지역 미등록'}
              </Text>
              <Text style={styles.timelineText}>
                친구가 된 날 {formatDate(friend.since) || '확인 중'} · 공통 관심 {friend.mutualCount ?? 0}개
              </Text>
              <Text style={styles.historyHint}>타임라인 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveFriend(friend)}
              activeOpacity={0.85}
            >
              <Text style={styles.removeBtnText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ProfileSectionCard>
  );

  const renderActivityTab = () => (
    <>
      <ProfileSectionCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>다가올 약속</Text>
          <TouchableOpacity style={styles.sectionHintBtn} onPress={loadUpcomingVisits}>
            <Text style={styles.sectionHintBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
        {upcomingLoading ? (
          <Text style={styles.emptyHint}>친구 약속을 불러오는 중…</Text>
        ) : upcomingVisits.length === 0 ? (
          <Text style={styles.emptyHint}>2주 이내 예정된 일정이 없어요.</Text>
        ) : (
          upcomingVisits.map((visit) => (
            <View key={visit.id} style={styles.upcomingRow}>
              <View style={styles.upcomingInfo}>
                <Text style={styles.friendName}>{visit.friendNickname || visit.friendName}</Text>
                <Text style={styles.friendMeta} numberOfLines={1}>
                  {visit.storeName} · {visit.address ?? '주소 없음'}
                </Text>
                {visit.memo ? (
                  <Text style={styles.activityMemo} numberOfLines={1}>
                    "{visit.memo}"
                  </Text>
                ) : null}
              </View>
              <View style={styles.upcomingDate}>
                <Text style={styles.upcomingDateText}>{formatMonthDay(visit.visitDate)}</Text>
              </View>
            </View>
          ))
        )}
      </ProfileSectionCard>

      <ProfileSectionCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>친구 추천 가게</Text>
          <TouchableOpacity style={styles.sectionHintBtn} onPress={loadRecentStores}>
            <Text style={styles.sectionHintBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
        {recentLoading ? (
          <Text style={styles.emptyHint}>친구들이 좋아하는 가게를 불러오는 중…</Text>
        ) : recentStores.length === 0 ? (
          <Text style={styles.emptyHint}>아직 추천할 가게가 없어요.</Text>
        ) : (
          recentStores.map((store, index) => (
            <View key={`${store.storeId}-${index}`} style={styles.storeCard}>
              <View style={styles.storeInfo}>
                <Text style={styles.friendName}>{store.storeName}</Text>
                <Text style={styles.friendMeta} numberOfLines={1}>
                  {store.address ?? '주소 정보 없음'}
                </Text>
                <Text style={styles.activityMemo}>
                  친구 {store.visitCount}명 방문 · 최근 {store.friends?.[0]?.friendName ?? '친구'} 다녀감
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.visitButton,
                  openingStoreId === store.storeId && styles.visitButtonDisabled,
                ]}
                onPress={() => handleOpenStoreVideos(store)}
                disabled={openingStoreId === store.storeId}
                activeOpacity={0.85}
              >
                <Text style={styles.visitButtonText}>
                  {openingStoreId === store.storeId ? '확인 중…' : '보러가기'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ProfileSectionCard>

      <ProfileSectionCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>친구와의 최근 방문</Text>
          <TouchableOpacity style={styles.sectionHintBtn} onPress={loadVisitFeed}>
            <Text style={styles.sectionHintBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
        {visitLoading ? (
          <Text style={styles.emptyHint}>친구 활동을 불러오는 중…</Text>
        ) : visitFeed.length === 0 ? (
          <Text style={styles.emptyHint}>아직 친구와 함께한 방문 메모가 없어요.</Text>
        ) : (
          visitFeed.map((visit) => (
            <View key={visit.id} style={styles.visitRow}>
              <View style={styles.visitInfo}>
                <Text style={styles.friendName}>{visit.friendNickname || visit.friendName}</Text>
                <Text style={styles.friendMeta}>
                  {visit.storeName} · {visit.visitDate ?? '방문일 미상'}
                </Text>
                {visit.memo ? (
                  <Text style={styles.activityMemo} numberOfLines={2}>
                    {visit.memo}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ProfileSectionCard>
    </>
  );

  return (
    <AppLayout
      title="친구"
      showBack
      onPressBack={() => navigation.goBack()}
      showNotification={false}
      footer={null}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 32, 52) }}
      >
        {!username ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerText}>로그인 후 친구 기능을 사용할 수 있습니다.</Text>
          </View>
        ) : loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.centerText}>친구 정보를 불러오는 중…</Text>
          </View>
        ) : (
          <>
            {actionMessage ? (
              <View style={styles.snackbar}>
                <Text style={styles.snackbarText}>{actionMessage}</Text>
                <TouchableOpacity onPress={() => setActionMessage(null)}>
                  <Text style={styles.snackbarAction}>닫기</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <ProfileSectionCard style={styles.heroCard}>
              <Text style={styles.heroTitle}>친구와 연결된 활동을 한눈에 정리하세요.</Text>
              <Text style={styles.heroSubtitle}>
                검색, 요청 관리, 친구 목록, 방문 활동을 탭별로 나눠 더 자연스럽게 볼 수 있게
                바꿨습니다.
              </Text>

              <View style={styles.metricGrid}>
                {summaryItems.map((item) => (
                  <View key={item.key} style={styles.metricTile}>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                    <Text style={styles.metricValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </ProfileSectionCard>

            <View style={styles.tabRow}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeTab === 'discover' ? renderDiscoverTab() : null}
            {activeTab === 'requests' ? renderRequestsTab() : null}
            {activeTab === 'friends' ? renderFriendsTab() : null}
            {activeTab === 'activity' ? renderActivityTab() : null}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
};

export default MyFriendsScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: colors.backgroundSoft,
    },
    centerBox: {
      marginTop: 120,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    centerText: {
      marginTop: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    heroCard: {
      padding: 18,
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    heroSubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    metricTile: {
      width: '48.3%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
      backgroundColor: colors.backgroundSoft,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    metricValue: {
      marginTop: 6,
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    tabRow: {
      flexDirection: 'row',
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: colors.background,
      padding: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.backgroundSoft,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
    },
    sectionCard: {
      padding: 18,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionDescription: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    sectionHintBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
    },
    sectionHintBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPrimary,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.backgroundSoft,
      minHeight: 48,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
    },
    searchLoader: {
      marginLeft: 10,
    },
    tipBox: {
      marginTop: 14,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.backgroundSoft,
    },
    tipTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    tipText: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    resultsWrap: {
      marginTop: 14,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      marginBottom: 10,
    },
    friendInfo: {
      flex: 1,
      marginHorizontal: 12,
    },
    friendInfoPress: {
      flex: 1,
      marginHorizontal: 12,
    },
    historyHint: {
      marginTop: 6,
      fontSize: 12,
      color: colors.brandPrimary,
      fontWeight: '700',
    },
    friendName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    friendMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 3,
    },
    timelineText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 5,
      lineHeight: 18,
    },
    requestMessage: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 18,
      backgroundColor: colors.backgroundSoft,
    },
    addBtn: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.brandPrimary,
    },
    addBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
      paddingTop: 12,
      marginTop: 12,
    },
    requestActions: {
      marginLeft: 10,
    },
    acceptBtn: {
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
    },
    acceptBtnText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '700',
    },
    rejectBtn: {
      backgroundColor: colors.backgroundSoft,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    rejectBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    sentRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
      paddingTop: 12,
      marginTop: 12,
    },
    sentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sentCancelBtn: {
      alignSelf: 'flex-end',
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.backgroundSoft,
    },
    sentCancelText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    removeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.backgroundSoft,
    },
    removeBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#c43737',
    },
    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
    },
    upcomingInfo: {
      flex: 1,
      paddingRight: 10,
    },
    upcomingDate: {
      minWidth: 64,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
    },
    upcomingDateText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    activityMemo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 5,
      lineHeight: 18,
    },
    storeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
    },
    storeInfo: {
      flex: 1,
      paddingRight: 12,
    },
    visitButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.textPrimary,
    },
    visitButtonDisabled: {
      opacity: 0.65,
    },
    visitButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.background,
    },
    visitRow: {
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
    },
    visitInfo: {
      flex: 1,
    },
    emptyHint: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    snackbar: {
      marginBottom: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.textPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    snackbarText: {
      flex: 1,
      marginRight: 12,
      fontSize: 12,
      color: colors.background,
    },
    snackbarAction: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
  });
