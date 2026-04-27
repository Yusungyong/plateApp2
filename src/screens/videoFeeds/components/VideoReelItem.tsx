// src/screens/VideoFeed/components/VideoReelItem.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
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
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
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
  const anyItem = item as any;
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const { navigateToProfile } = useProfileNavigation();
  const me = (user?.username ?? '').toString().trim();

  const [commentVisible, setCommentVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [likesVisible, setLikesVisible] = useState(false);
  const [reportStep, setReportStep] = useState<'menu' | 'reasons' | 'other'>('menu');
  const [reportText, setReportText] = useState('');

  // 좋아요 훅 사용 - storeId를 키로 사용하여 아이템별 상태 유지
  const initialIsLiked = useMemo(() => Boolean(anyItem.likedByMe), [anyItem.likedByMe]);
  const initialLikeCount = useMemo(() => Number(anyItem.likeCount ?? 0), [anyItem.likeCount]);

  const { isLiked, likeCount, toggleLike } = useVideoFeedLike(item.storeId, {
    initialIsLiked,
    initialLikeCount,
  });

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
      minBufferMs: 1500,
      maxBufferMs: 12000,
      bufferForPlaybackMs: 500,
      bufferForPlaybackAfterRebufferMs: 1000,
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

  const username = useMemo(() => {
    const u = item.username?.toString().trim();
    return u && u.length > 0 ? u : 'plate_user';
  }, [item.username]);

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
  const isOwner = Boolean(me && item.username === me);

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
    onDelete?.(item.storeId);
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

  const topOverlay = safeTopInset + 12;
  const actionsBottom = safeBottomInset + 90;
  const bottomInfoBottom = safeBottomInset + 20;
  const bottomInfoHorizontal = 14;

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
      <TouchableWithoutFeedback onPress={onTogglePause}>
        <View style={styles.container}>
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
              ignoreSilentSwitch="obey"
              progressUpdateInterval={1000}
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
            <View style={[styles.bg, { backgroundColor: 'black' }]} pointerEvents="none" />
          )}

          <VideoOverlayUI
            likeCount={likeCount}
            commentCount={item.commentCount ?? 0}
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

          <View pointerEvents="none" style={[styles.topOverlay, { top: topOverlay }]}>
            <View style={styles.chipStack}>
              <View style={styles.chip}>
                <Icon name="location-outline" size={14} color="#fff" />
                <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                  {locationLabel}
                </Text>
              </View>
              {storeLabel ? (
                <View style={[styles.chip, styles.chipSecondary]}>
                  <Icon name="restaurant-outline" size={14} color="#fff" />
                  <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                    {storeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View
            pointerEvents="box-none"
            style={[
              styles.bottomInfo,
              {
                bottom: bottomInfoBottom,
                left: bottomInfoHorizontal,
                right: bottomInfoHorizontal,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.creatorCard}
              onPress={() => navigateToProfile(username)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarWrap}>
                <Image source={{ uri: profileUri }} style={styles.avatar} />
              </View>
              <View style={styles.creatorText}>
                <Text style={styles.username} numberOfLines={1}>
                  @{username}
                </Text>
              </View>
            </TouchableOpacity>

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
        </View>
      </TouchableWithoutFeedback>

      <VideoCommentModal
        visible={commentVisible}
        storeId={item.storeId}
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
  bg: { ...StyleSheet.absoluteFillObject },

  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  chipStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  chipSecondary: {
    alignSelf: 'flex-end',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    maxWidth: 220,
  },

  bottomInfo: {
    position: 'absolute',
    alignItems: 'flex-end',
  },

  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
