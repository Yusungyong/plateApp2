// src/screens/VideoFeed/components/VideoReelItem.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video, {
  BufferingStrategyType,
  OnLoadData,
  OnProgressData,
} from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { VideoFeedItem } from '../../../api/videoFeedApi';
import { useAuth } from '../../../auth/AuthProvider';
import { useVideoFeedLike } from '../../../hooks/useLike';
import VideoOverlayUI from './VideoOverlayUI';
import VideoCommentModal from './VideoCommentModal';
import VideoMenuModal from './VideoMenuModal';
import VideoLikesModal from './VideoLikesModal';
import { buildProfileUri } from '../../../utils/profileImage';
import { useProfileNavigation } from '../../../hooks/useProfileNavigation';
import { useRequireLogin } from '../../../hooks/useRequireLogin';
import { reportContent } from '../../../api/reportApi';
import { blockUser } from '../../../api/blockApi';
import { buildVideoAssetUrl, buildVideoThumbnailUrl } from '../../../utils/videoAsset';
import type { RootStackParamList } from '../../../navigation/MainNavigation';

const decodeIfNeeded = (value?: string | null) => {
  if (!value) return undefined;
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) {
        break;
      }
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

type Props = {
  item: VideoFeedItem;
  isActive: boolean;
  commentOpenSignal?: number;
  onConsumeCommentOpen?: (() => void) | null;

  paused: boolean;
  buffering: boolean;
  ready?: boolean;
  errorMsg: string | null;
  playTime?: number;
  preload?: boolean;
  videoUri?: string;
  posterUri?: string;
  onLoadStart?: () => void;
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onBuffer?: (meta: { isBuffering: boolean }) => void;
  onReadyForDisplay?: () => void;
  onError?: (err: any) => void;

  onTogglePause: () => void;
  onEdit?: (storeId: number) => void;
  onDelete?: (storeId: number) => void;
  canDelete?: boolean;
  thumbnailOpacity?: number;
  safeTopInset?: number;
  safeBottomInset?: number;
};

const VideoReelItem: React.FC<Props> = ({
  item,
  isActive,
  commentOpenSignal = 0,
  onConsumeCommentOpen = null,
  paused,
  buffering,
  ready = false,
  errorMsg,
  playTime = 0,
  preload = false,
  videoUri,
  posterUri,
  onLoadStart,
  onLoad,
  onProgress,
  onBuffer,
  onReadyForDisplay,
  onError,
  onTogglePause,
  onEdit,
  onDelete,
  canDelete = false,
  thumbnailOpacity = 1,
  safeTopInset = 0,
  safeBottomInset = 0,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const anyItem = item as any;
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const { navigateToProfile } = useProfileNavigation();
  const me = (user?.username ?? '').toString().trim();

  const [commentVisible, setCommentVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [likesVisible, setLikesVisible] = useState(false);
  const lastCommentOpenSignalRef = useRef(0);
  const [reportStep, setReportStep] = useState<'menu' | 'reasons' | 'other'>('menu');
  const [reportText, setReportText] = useState('');

  useEffect(() => {
    if (!isActive || !commentOpenSignal) {
      return;
    }
    if (lastCommentOpenSignalRef.current === commentOpenSignal) {
      return;
    }
    lastCommentOpenSignalRef.current = commentOpenSignal;
    setCommentVisible(true);
    onConsumeCommentOpen?.();
  }, [commentOpenSignal, isActive, onConsumeCommentOpen]);

  useEffect(() => {
    if (isActive) {
      return;
    }
    setCommentVisible(false);
    setLikesVisible(false);
    setMenuVisible(false);
  }, [isActive]);

  // 좋아요 훅 사용 - storeId를 키로 사용하여 아이템별 상태 유지
  const initialIsLiked = useMemo(() => Boolean(anyItem.likedByMe), [anyItem.likedByMe]);
  const initialLikeCount = useMemo(() => Number(anyItem.likeCount ?? 0), [anyItem.likeCount]);

  const { isLiked, likeCount, toggleLike } = useVideoFeedLike(item.storeId, {
    initialIsLiked,
    initialLikeCount,
  });
  const [commentCount, setCommentCount] = useState<number | null>(
    item.commentCount != null ? Number(item.commentCount) : null,
  );

  useEffect(() => {
    setCommentCount(item.commentCount != null ? Number(item.commentCount) : null);
  }, [item.commentCount, item.storeId]);
  const hasResolvedLikeMeta = anyItem.likeCount != null || anyItem.likedByMe != null;

  const thumbnailUrl = useMemo(
    () => (item.thumbnail ? buildVideoThumbnailUrl(item.thumbnail, item.createdAt) : undefined),
    [item.thumbnail, item.createdAt],
  );
  const fallbackUrl = useMemo(
    () => buildVideoAssetUrl(item.fileName, item.createdAt),
    [item.fileName, item.createdAt],
  );
  const bgUri = posterUri ?? thumbnailUrl ?? fallbackUrl;
  const resolvedVideoUri = videoUri ?? buildVideoAssetUrl(item.fileName, item.createdAt);
  const isPreloadOnly = preload && !isActive;
  const shouldRenderVideo = Boolean(resolvedVideoUri) && (isActive || preload);
  const videoPaused = isPreloadOnly ? true : paused;
  const videoMuted = isPreloadOnly ? true : false;
  const videoVolume = isPreloadOnly ? 0.0 : 1.0;
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
    orientation?: 'landscape' | 'portrait';
  } | null>(null);
  const preferContain =
    naturalSize?.orientation === 'landscape' ||
    ((naturalSize?.width ?? 0) > 0 && (naturalSize?.height ?? 0) > 0
      ? (naturalSize?.width ?? 0) >= (naturalSize?.height ?? 0)
      : false);
  const resizeMode = preferContain ? 'contain' : 'cover';

  const bufferConfig = useMemo(
    () => ({
      minBufferMs: 1000,
      maxBufferMs: 10000,
      bufferForPlaybackMs: 250,
      bufferForPlaybackAfterRebufferMs: 500,
      cacheSizeMB: 64,
    }),
    [],
  );

  const handleLoad = useCallback(
    (data: OnLoadData) => {
      const width = Number(data.naturalSize?.width ?? 0);
      const height = Number(data.naturalSize?.height ?? 0);
      const orientation = data.naturalSize?.orientation as 'landscape' | 'portrait' | undefined;
      setNaturalSize({ width, height, orientation });
      onLoad?.(data);
    },
    [onLoad],
  );

  const normalizedStoreName = useMemo(
    () => decodeIfNeeded(item.storeName) ?? item.storeName ?? '',
    [item.storeName],
  );
  const normalizedTitle = useMemo(
    () => decodeIfNeeded(item.title) ?? item.title ?? '',
    [item.title],
  );
  const normalizedAddress = useMemo(
    () => decodeIfNeeded(item.address) ?? item.address ?? '',
    [item.address],
  );

  useEffect(() => {
    if (item.storeName) {
      }
  }, [item.storeName]);

  const locationLabel = normalizedAddress.trim() || normalizedStoreName || '위치 정보 없음';
  const storeLabel = normalizedStoreName.trim();
  const storyTitle = normalizedTitle.trim() || storeLabel || '영상 스토리';
  const hasLocationInfo = Boolean(item.placeId?.trim() || normalizedStoreName.trim() || normalizedAddress.trim());

  const username = useMemo(() => {
    const u = item.username?.toString().trim();
    return u && u.length > 0 ? u : '';
  }, [item.username]);
  const nickName = useMemo(() => {
    const nick = (item as any).nickName?.toString().trim();
    return nick && nick.length > 0 ? nick : '';
  }, [item]);
  const creatorName = useMemo(() => {
    if (nickName) {
      return nickName;
    }
    return username ? `@${username}` : '';
  }, [nickName, username]);
  const hasCreator = creatorName.length > 0;
  const profileUri = useMemo(
    () => buildProfileUri(username, item.profileImageUrl),
    [item.profileImageUrl, username],
  );


  const onPressLike = useCallback(async () => {
    if (!requireLogin({ message: '좋아요는 로그인 후 사용할 수 있어요.' })) return;
    await toggleLike();
  }, [requireLogin, toggleLike]);

  const [moreVisible, setMoreVisible] = useState(false);
  const moreAnim = useMemo(() => new Animated.Value(0), []);
  const isOwner = Boolean(me && username === me);

  const openMore = useCallback(() => {
    if (!canDelete && isOwner) return;
    setMoreVisible(true);
    setReportStep('menu');
    setReportText('');
    moreAnim.setValue(0);
    Animated.timing(moreAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [canDelete, isOwner, moreAnim]);

  const closeMore = useCallback(() => {
    Animated.timing(moreAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setMoreVisible(false));
  }, [moreAnim]);

  const handleEdit = useCallback(() => {
    closeMore();
    onEdit?.(item.storeId);
  }, [closeMore, item.storeId, onEdit]);

  const handleDeletePress = useCallback(() => {
    closeMore();
    Alert.alert(
      '영상을 삭제할까요?',
      '삭제된 영상은 영구 삭제되며 다시 복구할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete?.(item.storeId),
        },
      ],
    );
  }, [closeMore, item.storeId, onDelete]);

  const handleReport = useCallback(
    (reason: string, description?: string) => {
      closeMore();
      reportContent({
        targetType: 'video',
        targetId: item.storeId,
        targetUsername: item.username ?? '',
        reason,
        description,
      })
        .then(() => {
          Alert.alert('접수 완료', '신고가 접수되었습니다.');
        })
        .catch(() => {
          Alert.alert('실패', '신고에 실패했어요. 잠시 후 다시 시도해 주세요.');
        });
    },
    [closeMore, item.storeId, item.username],
  );

  const handleBlockPress = useCallback(() => {
    const blockedUsername = item.username;
    if (!blockedUsername) return;
    Alert.alert('사용자 차단', '이 사용자를 차단할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: () => {
          closeMore();
          blockUser({ blockedUsername })
            .then(() => {
              Alert.alert('차단 완료', '해당 사용자를 차단했어요.');
            })
            .catch(() => {
              Alert.alert('실패', '차단에 실패했어요. 잠시 후 다시 시도해 주세요.');
            });
        },
      },
    ]);
  }, [closeMore, item.username]);

  const handleOpenMap = useCallback(() => {
    const placeId = item.placeId?.trim() || undefined;
    const storeName = normalizedStoreName.trim() || undefined;
    const address = normalizedAddress.trim() || undefined;
    if (!placeId && !storeName && !address) {
      return;
    }
    navigation.navigate('FullScreenMap', {
      placeId,
      storeName,
      address,
    });
  }, [item.placeId, navigation, normalizedAddress, normalizedStoreName]);

  const topOverlay = safeTopInset + 12;
  const bottomInfoBottom = safeBottomInset + 18;
  const actionsBottom = bottomInfoBottom;
  const bottomInfoHorizontal = 16;
  const bottomInfoRight = 84;

  const thumbnailOpacityAnim = useRef(new Animated.Value(thumbnailOpacity)).current;

  useEffect(() => {
    const target = isActive ? thumbnailOpacity : 1;
    Animated.timing(thumbnailOpacityAnim, {
      toValue: target,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isActive, thumbnailOpacity, thumbnailOpacityAnim]);

  const showLoading =
    isActive &&
    !errorMsg &&
    !paused &&
    (buffering || !ready) &&
    playTime < 0.2 &&
    !bgUri;
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

  useEffect(() => {
    if (!showLoading) {
      setShowLoadingSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowLoadingSpinner(true), 450);
    return () => clearTimeout(timer);
  }, [showLoading]);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.touchLayer}>
          {shouldRenderVideo ? (
            <Video
              source={{ uri: resolvedVideoUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={resizeMode}
              pointerEvents="none"
              paused={videoPaused}
              repeat
              muted={videoMuted}
              volume={videoVolume}
              playInBackground={false}
              playWhenInactive={false}
              automaticallyWaitsToMinimizeStalling={false}
              preferredForwardBufferDuration={1}
              bufferingStrategy={BufferingStrategyType.DEPENDING_ON_MEMORY}
              ignoreSilentSwitch="obey"
              progressUpdateInterval={250}
              poster={bgUri}
              posterResizeMode={resizeMode}
              bufferConfig={bufferConfig}
              onLoadStart={!isPreloadOnly ? onLoadStart : undefined}
              onLoad={handleLoad}
              onProgress={!isPreloadOnly ? onProgress : undefined}
              onBuffer={!isPreloadOnly ? onBuffer : undefined}
              onReadyForDisplay={!isPreloadOnly ? onReadyForDisplay : undefined}
              onError={!isPreloadOnly ? onError : undefined}
            />
          ) : null}

          {bgUri ? (
            <Animated.Image
              source={{ uri: bgUri }}
              style={[styles.bg, { opacity: thumbnailOpacityAnim }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bg, styles.bgFallback]} pointerEvents="none" />
          )}

          <Pressable style={StyleSheet.absoluteFillObject} onPress={onTogglePause} />

          <VideoOverlayUI
            likeCount={hasResolvedLikeMeta ? likeCount : undefined}
            commentCount={commentCount ?? undefined}
            liked={isLiked}
            showMore={canDelete || !isOwner}
            onPressMore={openMore}
            onPressLike={onPressLike}
            onPressLikeCount={() => {
              if (!requireLogin({ message: '좋아요 목록은 로그인 후 볼 수 있어요.' })) {
                return;
              }
              setLikesVisible(true);
            }}
            onPressComment={() => {
              if (!requireLogin({ message: '댓글은 로그인 후 작성할 수 있어요.' })) return;
              setCommentVisible(true);
            }}
            onPressMenu={() => setMenuVisible(true)}
            bottomInset={actionsBottom}
          />
          <View
            pointerEvents="box-none"
            style={[
              styles.bottomInfo,
              {
                bottom: bottomInfoBottom,
                left: bottomInfoHorizontal,
                right: bottomInfoRight,
              },
            ]}
          >
            <View style={styles.storyCard}>
              {hasCreator ? (
                <TouchableOpacity
                  style={styles.creatorRow}
                  onPress={() => {
                    if (!username) {
                      return;
                    }
                    navigateToProfile(username);
                  }}
                  disabled={!username}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: profileUri }} style={styles.avatar} />
                  </View>
                  <View style={styles.creatorText}>
                    <Text style={styles.username} numberOfLines={1}>
                      {creatorName}
                    </Text>
                    <Text style={styles.creatorSubtext} numberOfLines={1}>
                      {storeLabel || '플레이트'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.creatorRow, styles.creatorCardPlaceholder]}>
                  <View style={styles.avatarWrap}>
                    <Image source={{ uri: profileUri }} style={styles.avatar} />
                  </View>
                  <View style={styles.creatorText}>
                    <Text style={styles.username} numberOfLines={1}>
                      게시자 정보 없음
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.storyTitle} numberOfLines={2}>
                {storyTitle}
              </Text>
            </View>
          </View>

          {showLoadingSpinner ? (
            <View style={styles.centerOverlay} pointerEvents="none">
              <ActivityIndicator size="large" />
            </View>
          ) : null}


          {isActive && paused && !buffering && !errorMsg ? (
            <View style={styles.centerOverlay} pointerEvents="none">
              <View style={styles.playCircle}>
                <Icon name="play" size={34} color="#fff" />
              </View>
            </View>
          ) : null}

          <View pointerEvents="box-none" style={[styles.topOverlay, { top: topOverlay }]}>
            <View style={styles.topMetaRail}>
              <TouchableOpacity
                style={styles.chip}
                activeOpacity={hasLocationInfo ? 0.82 : 1}
                disabled={!hasLocationInfo}
                onPress={handleOpenMap}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="location-outline" size={14} color="#fff" />
                <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                  {locationLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <VideoCommentModal
        visible={commentVisible}
        storeId={item.storeId}
        onCommentCountChange={(delta) => {
          setCommentCount((prev) => Math.max(0, (prev ?? 0) + delta));
        }}
        onClose={() => setCommentVisible(false)}
      />
      <VideoMenuModal
        visible={menuVisible}
        storeName={item.storeName}
        placeId={item.placeId}
        onClose={() => setMenuVisible(false)}
      />
      <VideoLikesModal
        visible={likesVisible}
        storeId={item.storeId}
        onClose={() => setLikesVisible(false)}
      />

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
            {isOwner ? (
              <>
                <TouchableOpacity style={styles.moreAction} onPress={handleEdit} activeOpacity={0.8}>
                  <Text style={styles.moreActionText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moreAction, styles.moreActionDanger]}
                  onPress={handleDeletePress}
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
                  onPress={handleBlockPress}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  touchLayer: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
  bgFallback: { backgroundColor: 'black' },

  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    zIndex: 30,
    elevation: 30,
  },
  topMetaRail: {
    flexDirection: 'row',
    maxWidth: '72%',
    zIndex: 31,
    elevation: 31,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(18,15,13,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    zIndex: 32,
    elevation: 32,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    maxWidth: 220,
  },

  bottomInfo: {
    position: 'absolute',
    alignItems: 'stretch',
  },

  storyCard: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  creatorCardPlaceholder: {
    opacity: 0.72,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatar: { width: 40, height: 40 },
  creatorText: { flex: 1, alignItems: 'flex-start' },
  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  creatorSubtext: {
    marginTop: 2,
    color: '#dccfbe',
    fontSize: 12,
    fontWeight: '600',
  },
  storyTitle: {
    marginTop: 14,
    color: '#fff',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
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

export default React.memo(VideoReelItem);
