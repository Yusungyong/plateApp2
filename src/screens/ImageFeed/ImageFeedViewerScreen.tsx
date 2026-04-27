import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FEED_IMAGE_BUCKET } from '../../config/buckets';

import type { RootStackParamList } from '../../navigation/MainNavigation';

import { useImageFeedSwipeViewer } from './hooks/useImageFeedSwipeViewer';
import { useImageFeedGroupViewer } from './hooks/useImageFeedGroupViewer';
import FeedPage from './components/FeedPage';
import GroupFeedPage from './components/GroupFeedPage';
import ViewerOverlays from './components/ViewerOverlays';
import type { FeedMetaUI } from './components/ViewerOverlays';
import FeedCommentModal from './components/FeedCommentModal';
import ImageLikesModal from './components/ImageLikesModal';

import { toggleFeedLike, fetchFeedCounts } from '../../api/imageFeedSocialApi';
import { deleteImageFeed } from '../../api/imageFeedApi';
import { useAuth } from '../../auth/AuthProvider';
import { reportContent } from '../../api/reportApi';
import { blockUser } from '../../api/blockApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = { key: string; name: string; params: RootStackParamList['ImageFeedViewer'] };

export default function ImageFeedViewerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    feedId,
    feedIds: contextFeedIds,
    groupId,
    groupIds: contextGroupIds,
    initialIndex,
  } = route.params;
  const { user } = useAuth();

  const isGroupMode = Boolean(groupId || (contextGroupIds && contextGroupIds.length));

  const feedViewer = useImageFeedSwipeViewer(feedId ?? 0, {
    feedIds: contextFeedIds,
    initialIndex,
    enabled: !isGroupMode,
  });

  const groupViewer = useImageFeedGroupViewer(groupId, {
    groupIds: contextGroupIds,
    initialIndex,
    enabled: isGroupMode,
  });

  const {
    feedIds,
    feedIndex,
    contextLoading,
    err,
    activeFeedId,
    activeData,
    activeImageIndex,
    setActiveImageIndex,
    tick,
    getPageData,
    getSavedImageIndex,
    setSavedImageIndex,
    onVerticalIndexChange,
    removeFeedId,
  } = feedViewer;

  const {
    groupIds,
    groupIndex,
    activeGroupId,
    activeGroupData,
    loadMoreImages,
  } = groupViewer;

  const viewerTick = isGroupMode ? groupViewer.tick : tick;

  const listIds = isGroupMode ? groupIds : feedIds;
  const listIndex = isGroupMode ? groupIndex : feedIndex;
  const listLoading = isGroupMode ? groupViewer.contextLoading : contextLoading;
  const listError = isGroupMode ? groupViewer.err : err;
  const handleVerticalIndexChange = isGroupMode
    ? groupViewer.onVerticalIndexChange
    : onVerticalIndexChange;

  const getVItemLayout = useCallback(
    (_: any, i: number) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * i, index: i }),
    [],
  );

  const vViewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60 }), []);
  const onVViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems?.length) return;
    const v = viewableItems[0];
    if (typeof v?.index === 'number') {
      handleVerticalIndexChange(v.index);
    }
  }).current;

  const ALWAYS_VISIBLE = true;

  const renderVItem = useCallback(
    ({ item }: { item: number | string }) => {
      if (isGroupMode) {
        return (
          <GroupFeedPage
            pageGroupId={String(item)}
            isActive={String(item) === activeGroupId}
            uiVisible={ALWAYS_VISIBLE}
            getPageData={groupViewer.getPageData}
            onActiveImageIndexChange={setActiveImageIndex}
            getSavedImageIndex={groupViewer.getSavedImageIndex}
            setSavedImageIndex={groupViewer.setSavedImageIndex}
            onLoadMore={loadMoreImages}
          />
        );
      }

      return (
        <FeedPage
          pageFeedId={Number(item)}
          isActive={Number(item) === activeFeedId}
          uiVisible={ALWAYS_VISIBLE}
          getPageData={getPageData}
          onTap={() => {}}
          onShowUi={() => {}}
          onActiveImageIndexChange={setActiveImageIndex}
          getSavedImageIndex={getSavedImageIndex}
          setSavedImageIndex={setSavedImageIndex}
        />
      );
    },
    [
      activeFeedId,
      activeGroupId,
      getPageData,
      groupViewer.getPageData,
      groupViewer.getSavedImageIndex,
      groupViewer.setSavedImageIndex,
      isGroupMode,
      loadMoreImages,
      setActiveImageIndex,
      getSavedImageIndex,
      setSavedImageIndex,
    ],
  );

  // ✅ 모달
  const [commentOpen, setCommentOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);
  const [reportStep, setReportStep] = useState<'menu' | 'reasons' | 'other'>('menu');
  const [reportText, setReportText] = useState('');
  const moreAnim = useMemo(() => new Animated.Value(0), []);

  // ✅ feedId별 meta 캐시(스와이프 시 튐 방지)
  const metaByFeedId = useRef<Map<number, FeedMetaUI>>(new Map());

  const [meta, setMeta] = useState<FeedMetaUI>({
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
  });

  // ✅ activeFeedId 바뀔 때: 서버 카운트로 초기화 + 캐시 반영
  useEffect(() => {
    if (isGroupMode) {
      setMeta({ likeCount: 0, commentCount: 0, isLiked: false });
      return;
    }
    let mounted = true;
    (async () => {
      const id = activeFeedId;
      if (!id) return;

      // 1) 캐시 있으면 즉시 적용
      const cached = metaByFeedId.current.get(id);
      if (cached) {
        setMeta(cached);
        return;
      }

      // 2) viewer 응답에 count가 있으면 그걸로 1차 세팅(서버 변경 반영 전)
      const fromViewer: FeedMetaUI = {
        likeCount: Number(activeData?.likeCount ?? 0),
        commentCount: Number(activeData?.commentCount ?? 0),
        isLiked: Boolean(
          (activeData as any)?.isLiked ??
            (activeData as any)?.liked ??
            activeData?.likedByMe ??
            false,
        ),
      };
      setMeta(fromViewer);
      metaByFeedId.current.set(id, fromViewer);

      // 3) (옵션) counts API가 있으면 한번 더 정확히 동기화
      try {
        const counts = await fetchFeedCounts(id);
        if (!mounted) return;

        setMeta((m) => {
          const next = { ...m, likeCount: counts.likeCount, commentCount: counts.commentCount };
          metaByFeedId.current.set(id, next);
          return next;
        });
      } catch {
        // counts 엔드포인트 없거나 실패해도 viewer 기반으로 유지
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeFeedId, activeData, isGroupMode]);

  const onToggleLike = useCallback(async () => {
    if (isGroupMode) return;
    const id = activeFeedId;
    if (!id) return;

    // ✅ 즉시 반응(낙관적 UI)
    const prev = metaByFeedId.current.get(id) ?? meta;
    const optimisticLiked = !prev.isLiked;
    const optimistic = {
      ...prev,
      isLiked: optimisticLiked,
      likeCount: Math.max(0, prev.likeCount + (optimisticLiked ? 1 : -1)),
    };
    metaByFeedId.current.set(id, optimistic);
    setMeta(optimistic);

    try {
      const res = await toggleFeedLike(id);

      const confirmed: FeedMetaUI = {
        ...optimistic,
        isLiked: Boolean(
          res.liked ??
            res.likedByMe ??
            (res as any)?.isLiked ??
            (res as any)?.likedByMe ??
            optimistic.isLiked,
        ),
        likeCount: res.likeCount,
      };
      metaByFeedId.current.set(id, confirmed);
      setMeta(confirmed);
    } catch (e: any) {
      // 실패 시 롤백
      metaByFeedId.current.set(id, prev);
      setMeta(prev);
      Alert.alert('좋아요 실패', e?.message ?? '잠시 후 다시 시도해줘');
    }
  }, [activeFeedId, isGroupMode, meta]);

  const totalImages = isGroupMode
    ? activeGroupData?.images?.length ?? 0
    : activeData?.images?.length ?? 0;
  const imageBucket = FEED_IMAGE_BUCKET || '';

  const groupOverlayData = useMemo(() => {
    if (!activeGroupData) return null;
    return {
      feedId: activeGroupData.group.latestFeedId ?? 0,
      username: '',
      nickName: null,
      profileImageUrl: null,
      feedTitle: null,
      content: '',
      storeName: activeGroupData.group.storeName ?? null,
      location: activeGroupData.group.address ?? null,
      placeId: activeGroupData.group.placeId ?? null,
      thumbnail: activeGroupData.group.thumbnail ?? null,
      commentCount: 0,
      likeCount: 0,
      likedByMe: false,
      createdAt: activeGroupData.group.latestCreatedAt ?? null,
      updatedAt: activeGroupData.group.latestCreatedAt ?? null,
      images: activeGroupData.images.map((img, idx) => ({
        orderNo: idx + 1,
        fileName: img.fileName,
      })),
    };
  }, [activeGroupData]);
  const joinUrl = (base?: string, path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (!base) return path;
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${b}/${p}`;
  };

  const canEdit =
    !isGroupMode &&
    Boolean(user?.username) &&
    Boolean(activeData?.username) &&
    user?.username === activeData?.username;

  const handleMenu = () => {
    if (isGroupMode) return;
    if (!activeFeedId) return;
    setReportStep('menu');
    setReportText('');
    setMoreVisible(true);
    moreAnim.setValue(0);
    Animated.timing(moreAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeMore = useCallback(() => {
    Animated.timing(moreAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setMoreVisible(false));
  }, [moreAnim]);

  const handleEdit = useCallback(() => {
    if (isGroupMode) return;
    if (!activeFeedId) return;
    closeMore();
    const images = Array.isArray(activeData?.images)
      ? activeData?.images.map((img) => joinUrl(imageBucket, img.fileName)).filter(Boolean)
      : [];
    navigation.navigate('ImageFeedEditor', {
      feedId: activeFeedId,
      initialContent: activeData?.content ?? '',
      initialAddress: activeData?.location ?? '',
      initialStoreName: activeData?.storeName ?? '',
      initialPlaceId: activeData?.placeId ?? '',
      initialImages: images,
    });
  }, [
    activeData?.content,
    activeData?.images,
    activeData?.location,
    activeData?.placeId,
    activeData?.storeName,
    activeFeedId,
    closeMore,
    imageBucket,
    isGroupMode,
    navigation,
  ]);

  const handleDelete = useCallback(async () => {
    if (isGroupMode) return;
    if (!activeFeedId) return;
    closeMore();
    try {
      await deleteImageFeed(activeFeedId);
      removeFeedId(activeFeedId);
      Alert.alert('삭제 완료', '이미지 피드를 삭제했어요.');
      if (feedIds.length <= 1) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('삭제 실패', '이미지 피드를 삭제하지 못했어요.');
    }
  }, [activeFeedId, closeMore, feedIds.length, isGroupMode, navigation, removeFeedId]);

  const handleReport = useCallback(
    (reason: string, description?: string) => {
      if (isGroupMode) return;
      if (!activeFeedId) return;
      closeMore();
      reportContent({
        targetType: 'image',
        targetId: activeFeedId,
        targetUsername: activeData?.username ?? '',
        reason,
        description,
      })
        .then(() => {
          Alert.alert('접수 완료', '신고가 접수되었습니다.');
        })
        .catch((error) => {
          Alert.alert('실패', '신고에 실패했어요. 잠시 후 다시 시도해 주세요.');
        });
    },
    [activeData?.username, activeFeedId, closeMore, isGroupMode],
  );

  const handleBlock = useCallback(() => {
    if (isGroupMode) return;
    if (!activeData?.username) return;
    Alert.alert('사용자 차단', '이 사용자를 차단할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: () => {
          closeMore();
          blockUser({ blockedUsername: activeData.username })
            .then(() => {
              Alert.alert('차단 완료', '해당 사용자를 차단했어요.');
            })
            .catch((error) => {
              Alert.alert('실패', '차단에 실패했어요. 잠시 후 다시 시도해 주세요.');
            });
        },
      },
    ]);
  }, [activeData?.username, closeMore]);

  if (listLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.dim}>불러오는 중…</Text>
        </View>
      </View>
    );
  }

  if (listError || !listIds.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Text style={styles.err}>{listError ?? '데이터가 없어요'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>뒤로</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={listIds}
        extraData={viewerTick}
        keyExtractor={(id) => `feed-${id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        renderItem={renderVItem}
        getItemLayout={getVItemLayout}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={true}
        nestedScrollEnabled
        viewabilityConfig={vViewabilityConfig}
        onViewableItemsChanged={onVViewableItemsChanged}
        initialScrollIndex={listIndex}
      />

      <ViewerOverlays
        uiVisible={true}
        onBack={() => navigation.goBack()}
        activeData={isGroupMode ? (groupOverlayData as any) : activeData}
        activeImageIndex={activeImageIndex}
        totalImages={Math.max(totalImages, 1)}
        meta={meta}
        onToggleLike={onToggleLike}
        onPressLikeCount={() => setLikesOpen(true)}
        onPressComment={() => setCommentOpen(true)}
        onPressMenu={!isGroupMode && activeFeedId ? handleMenu : undefined}
        showActions={!isGroupMode}
        showFooter={!isGroupMode}
      />

      {!isGroupMode && (
        <FeedCommentModal
          visible={commentOpen}
          onClose={() => setCommentOpen(false)}
          feedId={activeFeedId ?? null}
          onCommentCountChange={(delta) => {
            const id = activeFeedId;
            if (!id) return;
            setMeta((m) => {
              const next = { ...m, commentCount: Math.max(0, m.commentCount + delta) };
              metaByFeedId.current.set(id, next);
              return next;
            });
          }}
        />
      )}
      {!isGroupMode && (
        <ImageLikesModal
          visible={likesOpen}
          onClose={() => setLikesOpen(false)}
          feedId={activeFeedId}
        />
      )}

      <Modal visible={moreVisible} transparent animationType="none" onRequestClose={closeMore}>
        <View style={styles.moreModalWrap}>
          <Pressable style={styles.moreBackdrop} onPress={closeMore} />
          <KeyboardAvoidingView
            style={styles.moreKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={12}
          >
            <Animated.View
              style={[
                styles.moreSheet,
                {
                  opacity: moreAnim,
                  transform: [
                    {
                      translateY: moreAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {canEdit ? (
                <>
                  <TouchableOpacity style={styles.moreAction} onPress={handleEdit} activeOpacity={0.8}>
                    <Text style={styles.moreActionText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.moreAction, styles.moreActionDanger]}
                    onPress={handleDelete}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.moreActionText, styles.moreActionDangerText]}>삭제</Text>
                  </TouchableOpacity>
                </>
              ) : reportStep === 'menu' ? (
                <>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => setReportStep('reasons')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>신고하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.moreAction, styles.moreActionDanger]}
                    onPress={handleBlock}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.moreActionText, styles.moreActionDangerText]}>
                      사용자 차단
                    </Text>
                  </TouchableOpacity>
                </>
              ) : reportStep === 'reasons' ? (
                <>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => handleReport('SPAM')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>스팸/광고</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => handleReport('INAPPROPRIATE')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>부적절한 내용</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => handleReport('COPYRIGHT')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>저작권 침해</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => setReportStep('other')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>기타(직접 입력)</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.moreInputWrap}>
                    <TextInput
                      value={reportText}
                      onChangeText={setReportText}
                      placeholder="신고 사유를 입력해 주세요."
                      placeholderTextColor="#9aa0ab"
                      style={styles.moreInput}
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.moreAction}
                    onPress={() => {
                      const trimmed = reportText.trim();
                      if (!trimmed) {
                        Alert.alert('입력 필요', '신고 사유를 입력해 주세요.');
                        return;
                      }
                      handleReport(trimmed);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreActionText}>신고 제출</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.moreCancel} onPress={closeMore} activeOpacity={0.8}>
                <Text style={styles.moreCancelText}>취소</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dim: { color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  err: { color: '#ff6b6b' },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  backBtnText: { color: '#fff', fontWeight: '800' },
  moreBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  moreModalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  moreKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  moreSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  moreAction: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreActionText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  moreActionDanger: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e9ee',
  },
  moreActionDangerText: {
    color: '#ff6b6b',
  },
  moreCancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e9ee',
  },
  moreCancelText: {
    color: '#6f7782',
    fontSize: 15,
    fontWeight: '600',
  },
  moreInputWrap: {
    paddingVertical: 8,
  },
  moreInput: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e4ea',
    color: '#111',
    fontSize: 14,
    backgroundColor: '#f7f8fa',
    textAlignVertical: 'top',
  },
});
