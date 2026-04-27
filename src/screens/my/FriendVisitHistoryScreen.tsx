import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  fetchFriendVisitFeed,
  type FriendVisitItem,
  updateFriendVisit,
  deleteFriendVisit,
} from '../../api/friendVisitApi';
import { createFriendVisits } from '../../api/friendVisitsApi';
import Config from 'react-native-config';
import { stripHtml } from '../videoFeeds/utils/suggestionUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'FriendVisitHistory'>;

const PAGE_SIZE = 10;

const FriendVisitHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const friendUsername = route.params?.friendUsername;
  const friendNickname = route.params?.friendNickname ?? friendUsername;

  const [visits, setVisits] = useState<FriendVisitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<FriendVisitItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [visitDateInput, setVisitDateInput] = useState(() => formatDateInput(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateView, setDateView] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [memoInput, setMemoInput] = useState('');
  const [locationKeyword, setLocationKeyword] = useState('');
  const [locationLocked, setLocationLocked] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<{ storeName: string; address?: string | null } | null>(null);
  const modalAnim = useMemo(() => new Animated.Value(0), []);

  const canRequest = !!user?.username && !!friendUsername;

  const loadVisits = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (!canRequest) return;
      if (!reset && (loadingMore || !nextCursor)) return;

      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchFriendVisitFeed({
          username: user!.username,
          friendName: friendUsername,
          cursor: reset ? undefined : nextCursor ?? undefined,
          limit: PAGE_SIZE,
        });
        const rawItems = res.items ?? [];
        const filteredItems = friendUsername
          ? rawItems.filter((item) => item.friendName === friendUsername)
          : rawItems;
        setVisits((prev) => (reset ? filteredItems : [...prev, ...filteredItems]));
        setNextCursor(res.nextCursor ?? null);
      } catch {
        setError('친구 방문 기록을 불러오지 못했어요.');
        if (reset) {
          setVisits([]);
        }
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [canRequest, friendUsername, loadingMore, nextCursor, user],
  );

  useEffect(() => {
    if (!canRequest) return;
    loadVisits({ reset: true });
  }, [canRequest, loadVisits]);

  useEffect(() => {
    if (!editorOpen) return;
    modalAnim.setValue(0);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editorOpen, modalAnim]);

  const handleRefresh = useCallback(async () => {
    if (!canRequest) return;
    setRefreshing(true);
    await loadVisits({ reset: true });
    setRefreshing(false);
  }, [canRequest, loadVisits]);

  const handleOpenEditor = useCallback((visit?: FriendVisitItem) => {
    if (visit) {
      setEditingVisit(visit);
      setLocationKeyword('');
      setLocationLocked(true);
      setLocationActive(false);
      setLocationSuggestions([]);
      setSelectedStore({ storeName: visit.storeName, address: visit.address });
      setMemoInput(visit.memo ?? '');
      const visitDate = visit.visitDate ? new Date(visit.visitDate) : new Date();
      setVisitDateInput(formatDateInput(visitDate));
      setSelectedDate(visitDate);
      setDateView({ year: visitDate.getFullYear(), month: visitDate.getMonth() });
    } else {
      setEditingVisit(null);
      setLocationKeyword('');
      setLocationLocked(false);
      setLocationActive(false);
      setLocationSuggestions([]);
      setSelectedStore(null);
      setMemoInput('');
      const now = new Date();
      setVisitDateInput(formatDateInput(now));
      setSelectedDate(now);
      setDateView({ year: now.getFullYear(), month: now.getMonth() });
    }
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    const keyword = locationKeyword.trim();
    if (!keyword || locationLocked || !locationActive) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }
    if (!Config.NAVER_CLIENT_ID || !Config.NAVER_CLIENT_SECRET) {
      return;
    }
    const naverHeaders: Record<string, string> = {
      'X-Naver-Client-Id': Config.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': Config.NAVER_CLIENT_SECRET,
    };
    let cancelled = false;
    setLocationLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(keyword)}&display=8`,
          {
            headers: naverHeaders,
          },
        );
        if (!response.ok) {
          throw new Error(`Naver search failed: ${response.status}`);
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setLocationSuggestions(items);
        }
      } catch {
        if (!cancelled) {
          setLocationSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [locationActive, locationKeyword, locationLocked]);

  const handleCreateVisit = useCallback(async () => {
    if (!friendUsername) return;
    if (!selectedStore) {
      Alert.alert('확인', '가게 검색 결과를 선택해주세요.');
      return;
    }
    if (!isValidDateInput(visitDateInput)) {
      Alert.alert('확인', '방문 날짜를 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      if (editingVisit) {
        await updateFriendVisit(editingVisit.id, {
          visitDate: visitDateInput.trim(),
          memo: memoInput.trim() || undefined,
          storeName: selectedStore.storeName,
          address: selectedStore.address ?? undefined,
        });
      } else {
        await createFriendVisits({
          visitDate: visitDateInput.trim(),
          friends: [friendUsername],
          memo: memoInput.trim() || undefined,
          storeName: selectedStore.storeName,
          address: selectedStore.address ?? undefined,
        });
      }
      setEditorOpen(false);
      setEditingVisit(null);
      await loadVisits({ reset: true });
    } catch {
      Alert.alert('실패', '방문 기록을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }, [
    friendUsername,
    loadVisits,
    memoInput,
    selectedStore,
    visitDateInput,
    editingVisit,
  ]);

  const handleDeleteVisit = useCallback(
    (visit: FriendVisitItem) => {
      Alert.alert('삭제', '방문 기록을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFriendVisit(visit.id);
              setVisits((prev) => prev.filter((item) => item.id !== visit.id));
            } catch {
              Alert.alert('실패', '방문 기록을 삭제하지 못했어요.');
            }
          },
        },
      ]);
    },
    [],
  );

  const formattedTitle = useMemo(() => {
    if (!friendNickname) {
      return '친구 방문 기록';
    }
    return `${friendNickname} 님과의 방문`;
  }, [friendNickname]);

  const renderItem = ({ item }: { item: FriendVisitItem }) => {
    const visitDate = item.visitDate ? formatDate(item.visitDate) : '방문일 미상';
    const canEditItem = Boolean(user?.username && item.username === user.username);
    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineIndicator}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.storeName}>{item.storeName}</Text>
            <View style={styles.cardHeaderRight}>
              <Text style={styles.visitDate}>{visitDate}</Text>
              {canEditItem ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleOpenEditor(item)}
                    style={styles.cardActionBtn}
                  >
                    <Text style={styles.cardActionText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteVisit(item)}
                    style={styles.cardActionBtn}
                  >
                    <Text style={[styles.cardActionText, styles.cardActionDanger]}>삭제</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
          {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
          {item.memo ? (
            <Text style={styles.memo} numberOfLines={3}>
              {item.memo}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const listEmpty = !loading && !error ? (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>아직 함께 남긴 방문 기록이 없어요.</Text>
    </View>
  ) : null;

  const footer = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator />
        </View>
      );
    }
    if (nextCursor) {
      return (
        <TouchableOpacity style={styles.moreBtn} onPress={() => loadVisits({ reset: false })}>
          <Text style={styles.moreBtnText}>더 보기</Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.footerSpacer} />;
  };

  return (
    <AppLayout
      title={formattedTitle}
      showBack
      onPressBack={() => navigation.goBack()}
      showNotification={false}
    >
      <View style={styles.container}>
        {!canRequest ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerText}>로그인 후 이용할 수 있는 기능입니다.</Text>
          </View>
        ) : loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.centerText}>방문 기록을 불러오는 중…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={[styles.centerText, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadVisits({ reset: true })}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenEditor()}>
                <Text style={styles.addBtnText}>방문 기록 추가</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={visits}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              ListEmptyComponent={listEmpty}
              ListFooterComponent={footer}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          </>
        )}
      </View>

      <Modal visible={editorOpen} transparent animationType="none" onRequestClose={() => setEditorOpen(false)}>
        <Animated.View style={[styles.modalBackdrop, { opacity: modalAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: modalAnim,
                  transform: [
                    {
                      translateY: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.modalTitle}>
                {editingVisit ? '방문 기록 수정' : '방문 기록 추가'}
              </Text>

              <Text style={styles.fieldLabel}>가게/주소 검색</Text>
              <TextInput
                value={
                  locationLocked && selectedStore
                    ? `${selectedStore.storeName}${selectedStore.address ? ` · ${selectedStore.address}` : ''}`
                    : locationKeyword
                }
                onChangeText={(text) => {
                  if (locationLocked) return;
                  setLocationKeyword(text);
                }}
                onFocus={() => {
                  if (locationLocked) {
                    setLocationLocked(false);
                    setSelectedStore(null);
                    setLocationKeyword('');
                  }
                  setLocationActive(true);
                }}
                onBlur={() => {
                  setTimeout(() => setLocationActive(false), 100);
                }}
                placeholder="가게 이름이나 주소를 입력하세요"
                editable={!locationLocked}
                style={styles.input}
              />

              {locationActive && !locationLocked && (locationLoading || locationSuggestions.length > 0) ? (
                <View style={styles.suggestList}>
                  {locationLoading ? (
                    <Text style={styles.suggestHint}>검색 중…</Text>
                  ) : (
                    locationSuggestions.slice(0, 6).map((item, index) => {
                      const name = stripHtml(String(item.title ?? ''));
                      const address = item.roadAddress || item.address || '';
                      return (
                        <TouchableOpacity
                          key={`${item.mapx ?? 'x'}_${item.mapy ?? 'y'}_${index}`}
                          style={styles.suggestItem}
                          onPress={() => {
                            setSelectedStore({ storeName: name, address });
                            setLocationLocked(true);
                            setLocationKeyword('');
                            setLocationSuggestions([]);
                            setLocationActive(false);
                          }}
                        >
                          <Text style={styles.suggestTitle} numberOfLines={1}>
                            {name || '이름 없음'}
                          </Text>
                          {address ? (
                            <Text style={styles.suggestAddress} numberOfLines={1}>
                              {address}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>방문 날짜</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setLocationActive(false);
                  setLocationSuggestions([]);
                  setDatePickerOpen(true);
                }}
              >
                <Text style={styles.dateButtonText}>{visitDateInput}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>메모 (선택)</Text>
              <TextInput
                value={memoInput}
                onChangeText={setMemoInput}
                placeholder="친구와의 방문 메모를 남겨보세요"
                style={[styles.input, styles.textarea]}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setEditorOpen(false)}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={handleCreateVisit}
                  disabled={saving}
                >
                  <Text style={styles.modalConfirmText}>
                    {saving ? '저장 중…' : editingVisit ? '수정' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>

              {datePickerOpen ? (
                <View style={styles.dateOverlay}>
                  <TouchableOpacity
                    style={styles.dateOverlayDismiss}
                    onPress={() => setDatePickerOpen(false)}
                  />
                  <View style={styles.dateModalCard}>
                    <View style={styles.dateHeader}>
                      <TouchableOpacity
                        style={styles.navBtn}
                        onPress={() => {
                          const prev = new Date(dateView.year, dateView.month - 1, 1);
                          setDateView({ year: prev.getFullYear(), month: prev.getMonth() });
                        }}
                      >
                        <Text style={styles.navBtnText}>이전</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateHeaderText}>
                        {dateView.year}.{String(dateView.month + 1).padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.navBtn}
                        onPress={() => {
                          const next = new Date(dateView.year, dateView.month + 1, 1);
                          setDateView({ year: next.getFullYear(), month: next.getMonth() });
                        }}
                      >
                        <Text style={styles.navBtnText}>다음</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.weekRow}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <Text key={day} style={styles.weekText}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.calendarGrid}>
                      {buildCalendarCells(dateView.year, dateView.month).map((cell, idx) => {
                        if (!cell) {
                          return <View key={`empty-${idx}`} style={styles.dayCell} />;
                        }
                        const isSelected = isSameDate(cell, selectedDate);
                        return (
                          <TouchableOpacity
                            key={cell.toISOString()}
                            style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                            onPress={() => setSelectedDate(cell)}
                          >
                            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                              {cell.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalCancel]}
                        onPress={() => setDatePickerOpen(false)}
                      >
                        <Text style={styles.modalCancelText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalConfirm]}
                        onPress={() => {
                          setVisitDateInput(formatDateInput(selectedDate));
                          setDatePickerOpen(false);
                        }}
                      >
                        <Text style={styles.modalConfirmText}>선택</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : null}
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </AppLayout>
  );
};

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const [y, m, d] = value.split('-').map(Number);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() + 1 === m &&
    parsed.getDate() === d
  );
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.split('T')[0] ?? value;
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
};

const buildCalendarCells = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  const remaining = 7 - (cells.length % 7 || 7);
  for (let i = 0; i < remaining; i += 1) {
    cells.push(null);
  }
  return cells;
};

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default FriendVisitHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  actionRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111b2e',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerText: {
    marginTop: 12,
    color: '#6f7782',
    textAlign: 'center',
  },
  errorText: {
    color: '#e14d4d',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111b2e',
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4f6cff',
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(79,108,255,0.2)',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e9f2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  visitDate: {
    fontSize: 12,
    color: '#6b7385',
  },
  cardActionBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f3f4f8',
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  cardActionDanger: {
    color: '#e14d4d',
  },
  address: {
    marginTop: 6,
    fontSize: 12,
    color: '#5b6172',
  },
  memo: {
    marginTop: 10,
    fontSize: 13,
    color: '#2c3142',
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerSpacer: {
    height: 24,
  },
  moreBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7dcf0',
  },
  moreBtnText: {
    fontWeight: '700',
    color: '#4f6cff',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#9399ab',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,20,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
  },
  dateModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#56607a',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e3e7f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#111',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#e3e7f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  suggestList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e7f1',
    overflow: 'hidden',
    backgroundColor: '#fff',
    maxHeight: 220,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#edf0f6',
  },
  suggestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b1f2b',
  },
  suggestAddress: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7385',
  },
  suggestHint: {
    padding: 10,
    fontSize: 12,
    color: '#6b7385',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginLeft: 8,
  },
  modalCancel: {
    backgroundColor: '#f3f4f8',
  },
  modalConfirm: {
    backgroundColor: '#111b2e',
  },
  modalCancelText: {
    color: '#5f6678',
    fontWeight: '700',
    fontSize: 12,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  dateOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    zIndex: 20,
  },
  dateOverlayDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,20,0.45)',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f8',
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    color: '#7b8293',
    fontWeight: '600',
  },
  calendarGrid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dayCellSelected: {
    backgroundColor: '#111b2e',
    borderRadius: 18,
  },
  dayText: {
    fontSize: 13,
    color: '#1f2937',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
