// src/screens/VideoFeed/components/VideoReelItem.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/Ionicons';
import { VideoFeedItem, likeStore, unlikeStore } from '../../../api/videoFeedApi';
import { useAuth } from '../../../auth/AuthProvider';
import VideoOverlayUI from './VideoOverlayUI';
import VideoCommentModal from './VideoCommentModal';

const FILE_BASE_URL = Config.VIDEO_BUCKET;
const PROFILE_BASE_URL = Config.PROFILE_BUCKET;

const joinUrl = (base?: string, path?: string | null) => {
  if (!base || !path) return undefined;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

const buildUrl = (fileName?: string | null) => joinUrl(FILE_BASE_URL, fileName);

const buildProfileUri = (v?: string | null) => {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  return joinUrl(PROFILE_BASE_URL, s);
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const normalizeList = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,#]/g).map(s => s.trim()).filter(Boolean);
  return [];
};

const compactTokens = (tokens: string[], max = 3) => {
  if (tokens.length <= max) return { tokens, rest: 0 };
  return { tokens: tokens.slice(0, max), rest: tokens.length - max };
};

type Props = {
  item: VideoFeedItem;
  isActive: boolean;

  paused: boolean;
  buffering: boolean;
  currentTime: number;
  loadedDuration: number;
  errorMsg: string | null;

  onTogglePause: () => void;
  thumbnailOpacity?: number;
};

const VideoReelItem: React.FC<Props> = ({
  item,
  isActive,
  paused,
  buffering,
  currentTime,
  loadedDuration,
  errorMsg,
  onTogglePause,
  thumbnailOpacity = 1,
}) => {
  const anyItem = item as any;
  const { user } = useAuth();
  const me = (user?.username ?? '').toString().trim();

  const [commentVisible, setCommentVisible] = useState(false);

  // ✅ 서버값 기반 좋아요 상태
  const [liked, setLiked] = useState<boolean>(Boolean(anyItem.likedByMe));
  const [likeCount, setLikeCount] = useState<number>(Number(anyItem.likeCount ?? 0));

  // item이 바뀌면 동기화(FlatList 재사용/로드모어 대비)
  useEffect(() => {
    setLiked(Boolean((item as any).likedByMe));
    setLikeCount(Number((item as any).likeCount ?? 0));
  }, [item.storeId, (item as any).likedByMe, (item as any).likeCount]);

  const thumbnailUrl = useMemo(
    () => (item.thumbnail ? buildUrl(item.thumbnail) : undefined),
    [item.thumbnail],
  );
  const fallbackUrl = useMemo(() => buildUrl(item.fileName), [item.fileName]);
  const bgUri = thumbnailUrl || fallbackUrl;

  const totalSeconds =
    (item.videoDuration ?? 0) > 0 ? (item.videoDuration as number) : loadedDuration || 0;

  const displayTitle =
    (item.title && item.title.trim().length > 0 ? item.title : item.storeName) ?? '제목 없음';

  const displayAddress = (item.address ?? '').trim();
  const ratio = totalSeconds > 0 ? Math.min(currentTime / totalSeconds, 1) : 0;

  const username = useMemo(() => {
    const u = item.username?.toString().trim();
    return u && u.length > 0 ? u : 'plate_user';
  }, [item.username]);

  const profileUri = useMemo(() => {
    const uri = buildProfileUri(item.profileImageUrl);
    if (uri) return uri;

    const seed = encodeURIComponent(username);
    return `https://api.dicebear.com/8.x/identicon/png?seed=${seed}&size=64`;
  }, [item.profileImageUrl, username]);

  const extraLine = useMemo(() => {
    const tagTokens = normalizeList(anyItem.tags ?? anyItem.tagList ?? anyItem.hashTags).map(t =>
      String(t).startsWith('#') ? String(t) : `#${t}`,
    );

    const friendTokens = normalizeList(
      anyItem.friendTags ??
        anyItem.friends ??
        anyItem.friendUsernames ??
        anyItem.taggedFriends,
    ).map(f => (String(f).startsWith('@') ? String(f) : `@${f}`));

    const merged = [...tagTokens, ...friendTokens];
    const { tokens, rest } = compactTokens(merged, 3);
    if (!tokens.length) return '';
    return rest > 0 ? `${tokens.join(' · ')}  +${rest}` : tokens.join(' · ');
  }, [anyItem]);

  const onPressLike = useCallback(async () => {
    if (!me) {
      Alert.alert('로그인 필요', '좋아요는 로그인 후 사용할 수 있어요.');
      return;
    }

    const prevLiked = liked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;

    // ✅ optimistic update
    setLiked(nextLiked);
    setLikeCount(c => {
      const next = c + (nextLiked ? 1 : -1);
      return next < 0 ? 0 : next;
    });

    try {
      if (nextLiked) {
        await likeStore(item.storeId, me);
      } else {
        await unlikeStore(item.storeId, me);
      }
    } catch (e) {
      // ❌ 실패 시 롤백
      setLiked(prevLiked);
      setLikeCount(prevCount);
      console.log('[Like] failed', e);
    }
  }, [me, liked, likeCount, item.storeId]);

  return (
    <>
      <TouchableWithoutFeedback onPress={onTogglePause}>
        <View style={styles.container}>
          <VideoOverlayUI
            likeCount={likeCount}
            commentCount={item.commentCount ?? 0}
            liked={liked}
            onPressLike={onPressLike}
            onPressComment={() => setCommentVisible(true)}
            onPressLocation={() => console.log('[Video] location', item.placeId)}
            onPressMenu={() => console.log('[Video] menu', item.storeId)}
          />

          {bgUri ? (
            <Image
              source={{ uri: bgUri }}
              style={[styles.bg, { opacity: thumbnailOpacity }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bg, { backgroundColor: 'black' }]} />
          )}

          <View pointerEvents="none" style={styles.bottomShade} />

          <View pointerEvents="none" style={styles.bottomInfo}>
            <View style={styles.userRow}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: profileUri }} style={styles.avatar} />
              </View>
              <Text style={styles.username} numberOfLines={1}>
                @{username}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.textBlock}>
                <Text style={styles.title} numberOfLines={1}>
                  {displayTitle}
                </Text>
                {displayAddress ? (
                  <Text style={styles.address} numberOfLines={1}>
                    {displayAddress}
                  </Text>
                ) : null}
                {extraLine ? (
                  <Text style={styles.extraLine} numberOfLines={1}>
                    {extraLine}
                  </Text>
                ) : null}
              </View>

              {isActive && totalSeconds > 0 ? (
                <Text style={styles.timeText}>
                  {formatDuration(currentTime)} / {formatDuration(totalSeconds)}
                </Text>
              ) : null}
            </View>

            {isActive && totalSeconds > 0 ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { flex: ratio }]} />
                <View style={{ flex: 1 - ratio }} />
              </View>
            ) : null}
          </View>

          {isActive && buffering && !errorMsg ? (
            <View style={styles.centerOverlay}>
              <ActivityIndicator size="large" />
            </View>
          ) : null}

          {isActive && paused && !buffering && !errorMsg ? (
            <View style={styles.centerOverlay}>
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
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },

  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.33)',
  },

  bottomInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 16,
  },

  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
  },
  avatar: { width: 40, height: 40 },
  username: { color: '#fff', fontSize: 18, fontWeight: '800' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  textBlock: { flex: 1, paddingRight: 10 },

  title: { color: 'white', fontSize: 16, fontWeight: '800' },
  address: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 4 },
  extraLine: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 4 },
  timeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  progressTrack: {
    marginTop: 10,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: { backgroundColor: 'white' },

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
});

export default React.memo(VideoReelItem);
