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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/MainNavigation';

import { useImageFeedSwipeViewer } from './hooks/useImageFeedSwipeViewer';
import FeedPage from './components/FeedPage';
import ViewerOverlays from './components/ViewerOverlays';
import type { FeedMetaUI } from './components/ViewerOverlays';
import FeedCommentModal from './components/FeedCommentModal';

import { toggleFeedLike, fetchFeedCounts } from '../../api/imageFeedSocialApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = { key: string; name: string; params: RootStackParamList['ImageFeedViewer'] };

export default function ImageFeedViewerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { feedId } = route.params;

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
  } = useImageFeedSwipeViewer(feedId);

  const getVItemLayout = useCallback(
    (_: any, i: number) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * i, index: i }),
    [],
  );

  const vViewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60 }), []);
  const onVViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems?.length) return;
    const v = viewableItems[0];
    if (typeof v?.index === 'number') {
      onVerticalIndexChange(v.index);
    }
  }).current;

  const ALWAYS_VISIBLE = true;

  const renderVItem = useCallback(
    ({ item }: { item: number }) => (
      <FeedPage
        pageFeedId={item}
        isActive={item === activeFeedId}
        uiVisible={ALWAYS_VISIBLE}
        getPageData={getPageData}
        onTap={() => {}}
        onShowUi={() => {}}
        onActiveImageIndexChange={setActiveImageIndex}
        getSavedImageIndex={getSavedImageIndex}
        setSavedImageIndex={setSavedImageIndex}
      />
    ),
    [activeFeedId, getPageData, setActiveImageIndex, getSavedImageIndex, setSavedImageIndex],
  );

  // ✅ 댓글 모달
  const [commentOpen, setCommentOpen] = useState(false);

  // ✅ feedId별 meta 캐시(스와이프 시 튐 방지)
  const metaByFeedId = useRef<Map<number, FeedMetaUI>>(new Map());

  const [meta, setMeta] = useState<FeedMetaUI>({
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
  });

  // ✅ activeFeedId 바뀔 때: 서버 카운트로 초기화 + 캐시 반영
  useEffect(() => {
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
      const fromViewer = {
        likeCount: Number((activeData as any)?.likeCount ?? 0),
        commentCount: Number((activeData as any)?.commentCount ?? 0),
        isLiked: Boolean((activeData as any)?.isLiked ?? false), // 서버가 제공하면 자동 반영
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
  }, [activeFeedId, activeData]);

  const onToggleLike = useCallback(async () => {
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
        isLiked: res.liked,
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
  }, [activeFeedId, meta]);

  if (contextLoading) {
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

  if (err || !feedIds.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Text style={styles.err}>{err ?? '데이터가 없어요'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>뒤로</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalImages = activeData?.images?.length ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={feedIds}
        extraData={tick}
        keyExtractor={(id) => `feed-${id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        renderItem={renderVItem}
        getItemLayout={getVItemLayout}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
        nestedScrollEnabled
        viewabilityConfig={vViewabilityConfig}
        onViewableItemsChanged={onVViewableItemsChanged}
        initialScrollIndex={feedIndex}
      />

      <ViewerOverlays
        uiVisible={true}
        onBack={() => navigation.goBack()}
        activeData={activeData}
        activeImageIndex={activeImageIndex}
        totalImages={Math.max(totalImages, 1)}
        meta={meta}
        onToggleLike={onToggleLike}
        onPressComment={() => setCommentOpen(true)}
      />

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
});
