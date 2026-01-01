// src/screens/videoFeeds/components/VideoCommentModal.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import api from '../../../api/axiosInstance';
import { useAuth } from '../../../auth/AuthProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  storeId: number;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CLOSE_THRESHOLD = 120;

const PROFILE_BASE_URL = Config.PROFILE_BUCKET;

const joinUrl = (base?: string, path?: string | null) => {
  if (!base || !path) return undefined;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

const seedAvatar = (seed: string) =>
  `https://api.dicebear.com/8.x/identicon/png?seed=${encodeURIComponent(seed)}&size=64`;

const toMs = (v: any) => {
  if (!v) return Date.now();
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : Date.now();
};

const timeAgo = (ms: number) => {
  const diff = Date.now() - ms;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간`;
  const day = Math.floor(hr / 24);
  return `${day}일`;
};

const isInt32 = (n: number) =>
  Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;

// ===== API shapes (B안 기준) =====
type ApiAuthor = {
  username: string;
  userId?: number;
  nickName?: string;
  profileImageUrl?: string;
  isPrivate?: boolean;
};

type ApiReply = {
  replyId?: number;
  commentId?: number;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: ApiAuthor;
};

type ApiComment = {
  commentId: number;
  storeId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: ApiAuthor;

  // ✅ B안: 댓글 조회에는 replies가 없고 replyCount만 내려오는 형태를 가정
  replyCount?: number;
};

// ===== UI models =====
type ReplyItem = {
  id: string;
  replyId: number;
  commentId: number;
  content: string;
  createdAtMs: number;
  authorUsername: string;
  authorNick?: string;
  authorProfileUri?: string;
};

type CommentItem = {
  id: string;
  commentId: number;
  storeId: number;
  content: string;
  createdAtMs: number;
  authorUsername: string;
  authorNick?: string;
  authorProfileUri?: string;

  replyCount: number;
  replies: ReplyItem[]; // ✅ B안: 펼치기 전엔 빈 배열
  repliesLoaded: boolean;
  repliesLoading: boolean;
};

const extractItemsFromPage = (resData: any): any[] => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.content)) return resData.content;
  if (Array.isArray(resData.items)) return resData.items;
  if (Array.isArray(resData.comments)) return resData.comments;
  if (Array.isArray(resData.replies)) return resData.replies;
  return [];
};

const buildProfileUri = (username: string, fileOrUrl?: string) => {
  const v = (fileOrUrl ?? '').toString().trim();
  if (!v) return seedAvatar(username);
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return joinUrl(PROFILE_BASE_URL, v) ?? seedAvatar(username);
};

const normalizeReply = (r: ApiReply): ReplyItem => {
  const username = (r?.author?.username ?? 'plate_user').toString();
  const nick = (r?.author?.nickName ?? '').toString().trim();
  const profile = buildProfileUri(username, r?.author?.profileImageUrl);
  const replyId = Number(r?.replyId ?? 0);

  return {
    id: String(replyId || Date.now()),
    replyId: replyId || 0,
    commentId: Number(r?.commentId ?? 0),
    content: (r?.content ?? '').toString(),
    createdAtMs: toMs(r?.createdAt),
    authorUsername: username,
    authorNick: nick || undefined,
    authorProfileUri: profile,
  };
};

const normalizeComment = (c: ApiComment): CommentItem => {
  const username = (c?.author?.username ?? 'plate_user').toString();
  const nick = (c?.author?.nickName ?? '').toString().trim();
  const profile = buildProfileUri(username, c?.author?.profileImageUrl);

  return {
    id: String(c.commentId),
    commentId: c.commentId,
    storeId: c.storeId,
    content: (c.content ?? '').toString(),
    createdAtMs: toMs(c.createdAt),
    authorUsername: username,
    authorNick: nick || undefined,
    authorProfileUri: profile,

    replyCount: Number((c as any)?.replyCount ?? 0),
    replies: [],
    repliesLoaded: false,
    repliesLoading: false,
  };
};

const VideoCommentModal: React.FC<Props> = ({ visible, onClose, storeId }) => {
  const { user } = useAuth();

  const myUsername = useMemo(() => {
    const u: any = user;
    const v =
      (u?.username ??
        u?.userName ??
        u?.name ??
        u?.id ??
        u?.member?.username ??
        '') as string;
    return String(v ?? '').trim();
  }, [user]);

  // ✅ Animated.Value는 ref로 "객체 그대로" 유지
  const translateYRef = useRef(new Animated.Value(SCREEN_HEIGHT));
  const sendScaleRef = useRef(new Animated.Value(1));
  const hlPulseRef = useRef(new Animated.Value(0));

  const inputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<CommentItem> | null>(null);

  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null);
  const [highlightReplyId, setHighlightReplyId] = useState<number | null>(null);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [comments, setComments] = useState<CommentItem[]>([]);

  const [replyTarget, setReplyTarget] = useState<{ commentId: number; username: string } | null>(
    null,
  );

  const [editTarget, setEditTarget] = useState<
    | { type: 'comment'; commentId: number; initialText: string }
    | { type: 'reply'; commentId: number; replyId: number; initialText: string }
    | null
  >(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const canSubmit = text.trim().length > 0;

  const scrollToTop = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated });
    });
  }, []);

  const closeWithAnimation = useCallback(() => {
    Animated.timing(translateYRef.current, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setText('');
      setReplyTarget(null);
      setEditTarget(null);
      setExpanded({});
      setErrorMsg(null);
      setSubmitting(false);
      setHighlightCommentId(null);
      setHighlightReplyId(null);
      setComments([]);
      setPage(0);
      setHasNext(true);
      onClose();
    });
  }, [onClose]);

  // ✅ panResponder null-safe
  const panResponderRef = useRef<any>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, g: any) => g.dy > 6,
      onPanResponderMove: (_: any, g: any) => {
        if (g.dy > 0) translateYRef.current.setValue(g.dy);
      },
      onPanResponderRelease: (_: any, g: any) => {
        if (g.dy > CLOSE_THRESHOLD) closeWithAnimation();
        else
          Animated.spring(translateYRef.current, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    });
  }

  const openAnim = useCallback(() => {
    translateYRef.current.setValue(SCREEN_HEIGHT);
    Animated.timing(translateYRef.current, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateSendPress = () => {
    sendScaleRef.current.stopAnimation();
    sendScaleRef.current.setValue(1);
    Animated.sequence([
      Animated.timing(sendScaleRef.current, {
        toValue: 0.92,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(sendScaleRef.current, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateSendSuccess = () => {
    sendScaleRef.current.stopAnimation();
    sendScaleRef.current.setValue(1);
    Animated.sequence([
      Animated.timing(sendScaleRef.current, {
        toValue: 1.08,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(sendScaleRef.current, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runHighlightPulse = () => {
    hlPulseRef.current.stopAnimation();
    hlPulseRef.current.setValue(0);
    Animated.sequence([
      Animated.timing(hlPulseRef.current, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(hlPulseRef.current, {
        toValue: 0,
        duration: 520,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setHighlightCommentId(null);
      setHighlightReplyId(null);
    });
  };

  const flashHighlightComment = (commentId: number) => {
    setHighlightReplyId(null);
    setHighlightCommentId(commentId);
    runHighlightPulse();
  };

  const flashHighlightReply = (replyId: number) => {
    setHighlightCommentId(null);
    setHighlightReplyId(replyId);
    runHighlightPulse();
  };

  // ✅ 댓글 목록 조회 (B안)
  const fetchComments = useCallback(
    async (nextPage = 0, append = false) => {
      if (!storeId && storeId !== 0) return;
      if (!append) setLoading(true);
      setErrorMsg(null);

      try {
        const res = await api.get(`/stores/${storeId}/comments`, {
          params: { page: nextPage, size: 20 },
        });

        const raw = extractItemsFromPage(res.data) as ApiComment[];
        const normalized = raw.map(normalizeComment);

        setComments(prev => (append ? [...prev, ...normalized] : normalized));
        setPage(nextPage);
        setHasNext(normalized.length >= 20);
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? '댓글을 불러오지 못했어요.';
        setErrorMsg(String(msg));
        if (!append) setComments([]);
      } finally {
        if (!append) setLoading(false);
      }
    },
    [storeId],
  );

  const refresh = async () => {
    setRefreshing(true);
    await fetchComments(0, false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loading || refreshing) return;
    if (!hasNext) return;
    await fetchComments(page + 1, true);
  };

  // ✅ B안: 답글은 별도 조회
  const fetchReplies = useCallback(async (commentId: number) => {
    setComments(prev =>
      prev.map(c =>
        c.commentId === commentId ? { ...c, repliesLoading: true } : c,
      ),
    );

    try {
      const res = await api.get(`/comments/${commentId}/replies`, {
        params: { page: 0, size: 50 },
      });

      const raw = extractItemsFromPage(res.data) as ApiReply[];
      const normalizedReplies = raw.map(normalizeReply);

      setComments(prev =>
        prev.map(c =>
          c.commentId === commentId
            ? {
                ...c,
                replies: normalizedReplies,
                repliesLoaded: true,
                repliesLoading: false,
                // ✅ 혹시 서버에서 replyCount가 갱신되어야 하는 상황이면 여기서 동기화
                replyCount: Math.max(c.replyCount, normalizedReplies.length),
              }
            : c,
        ),
      );
    } catch (e) {
      setComments(prev =>
        prev.map(c =>
          c.commentId === commentId
            ? { ...c, repliesLoaded: true, repliesLoading: false }
            : c,
        ),
      );
    }
  }, []);

  const toggleExpanded = async (commentId: number) => {
    const key = String(commentId);
    const willOpen = !Boolean(expanded[key]);

    setExpanded(prev => ({ ...prev, [key]: willOpen }));

    if (!willOpen) return;

    const target = comments.find(c => c.commentId === commentId);
    if (!target) return;

    // ✅ replyCount가 있는데 replies를 아직 안불렀으면 fetch
    if (target.replyCount > 0 && !target.repliesLoaded) {
      await fetchReplies(commentId);
    }
  };

  // ===== CRUD =====
  const updateComment = async (commentId: number, content: string) => {
    await api.put(`/comments/${commentId}`, { content });
  };
  const deleteComment = async (commentId: number) => {
    await api.delete(`/comments/${commentId}`);
  };
  const updateReply = async (replyId: number, content: string) => {
    await api.put(`/replies/${replyId}`, { content });
  };
  const deleteReply = async (replyId: number) => {
    await api.delete(`/replies/${replyId}`);
  };

  const startEditComment = (item: CommentItem) => {
    setEditTarget({ type: 'comment', commentId: item.commentId, initialText: item.content });
    setReplyTarget(null);
    setText(item.content);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const startEditReply = (parentCommentId: number, r: ReplyItem) => {
    setEditTarget({
      type: 'reply',
      commentId: parentCommentId,
      replyId: r.replyId,
      initialText: r.content,
    });
    setReplyTarget(null);
    setText(r.content);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const openCommentMenu = (item: CommentItem) => {
    Alert.alert('댓글', '원하는 작업을 선택하세요', [
      { text: '수정', onPress: () => startEditComment(item) },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          Alert.alert('삭제할까요?', '이 댓글을 삭제합니다.', [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteComment(item.commentId);
                  setComments(prev => prev.filter(c => c.commentId !== item.commentId));
                } catch (e: any) {
                  setErrorMsg(e?.response?.data?.message ?? e?.message ?? '삭제 실패');
                }
              },
            },
          ]);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const openReplyMenu = (parentCommentId: number, r: ReplyItem) => {
    Alert.alert('답글', '원하는 작업을 선택하세요', [
      {
        text: '수정',
        onPress: () => {
          if (!isInt32(r.replyId) || r.replyId <= 0) {
            Alert.alert('잠깐!', '서버 replyId가 아니라서 수정이 불가능해요. 새로고침 후 다시 시도해줘.');
            return;
          }
          startEditReply(parentCommentId, r);
        },
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          if (!isInt32(r.replyId) || r.replyId <= 0) {
            Alert.alert('잠깐!', '서버 replyId가 아니라서 삭제가 불가능해요. 새로고침 후 다시 시도해줘.');
            return;
          }
          Alert.alert('삭제할까요?', '이 답글을 삭제합니다.', [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteReply(r.replyId);
                  // ✅ 리스트에서 제거 + 카운트 감소
                  setComments(prev =>
                    prev.map(c =>
                      c.commentId !== parentCommentId
                        ? c
                        : {
                            ...c,
                            replyCount: Math.max(0, c.replyCount - 1),
                            replies: c.replies.filter(x => x.replyId !== r.replyId),
                          },
                    ),
                  );
                } catch (e: any) {
                  setErrorMsg(e?.response?.data?.message ?? e?.message ?? '삭제 실패');
                }
              },
            },
          ]);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  // ✅ submit: 댓글/답글/수정 통합
  const submit = async () => {
    if (!canSubmit || submitting) return { ok: false as const };

    const content = text.trim();
    setText('');
    setSubmitting(true);

    try {
      // --- 수정 모드 ---
      if (editTarget) {
        if (editTarget.type === 'comment') {
          await updateComment(editTarget.commentId, content);
          setComments(prev =>
            prev.map(c => (c.commentId === editTarget.commentId ? { ...c, content } : c)),
          );
          flashHighlightComment(editTarget.commentId);
          setEditTarget(null);
          return { ok: true as const };
        } else {
          if (!isInt32(editTarget.replyId) || editTarget.replyId <= 0) {
            Alert.alert('잠깐!', '서버 replyId가 아니라서 수정이 불가능해요. 새로고침 후 다시 시도해줘.');
            setEditTarget(null);
            return { ok: false as const };
          }
          await updateReply(editTarget.replyId, content);
          setComments(prev =>
            prev.map(c =>
              c.commentId !== editTarget.commentId
                ? c
                : {
                    ...c,
                    replies: c.replies.map(r =>
                      r.replyId === editTarget.replyId ? { ...r, content } : r,
                    ),
                  },
            ),
          );
          setExpanded(prev => ({ ...prev, [String(editTarget.commentId)]: true }));
          flashHighlightReply(editTarget.replyId);
          setEditTarget(null);
          return { ok: true as const };
        }
      }

      // --- 답글 모드 ---
      if (replyTarget) {
        const res = await api.post(`/comments/${replyTarget.commentId}/replies`, { content });
        const serverReplyId = Number(res?.data?.replyId);

        // ✅ B안에선 답글 등록 후 해당 댓글의 replies를 다시 불러오는게 정석
        setExpanded(prev => ({ ...prev, [String(replyTarget.commentId)]: true }));

        // replyCount 증가 (즉시 반영)
        setComments(prev =>
          prev.map(c =>
            c.commentId === replyTarget.commentId
              ? { ...c, replyCount: c.replyCount + 1 }
              : c,
          ),
        );

        await fetchReplies(replyTarget.commentId);
        setReplyTarget(null);

        if (Number.isFinite(serverReplyId) && isInt32(serverReplyId) && serverReplyId > 0) {
          flashHighlightReply(serverReplyId);
        }

        return { ok: true as const };
      }

      // --- 댓글 등록 ---
      const res = await api.post(`/stores/${storeId}/comments`, { content });
      const serverCommentId = Number(res?.data?.commentId);

      const me = myUsername || 'me';
      if (Number.isFinite(serverCommentId) && isInt32(serverCommentId) && serverCommentId > 0) {
        const optimistic: CommentItem = {
          id: String(serverCommentId),
          commentId: serverCommentId,
          storeId,
          content,
          createdAtMs: Date.now(),
          authorUsername: me,
          authorProfileUri: buildProfileUri(me, undefined),
          replyCount: 0,
          replies: [],
          repliesLoaded: true,
          repliesLoading: false,
        };
        setComments(prev => [optimistic, ...prev]);
        scrollToTop(true);
        flashHighlightComment(serverCommentId);
      } else {
        scrollToTop(true);
      }

      await fetchComments(0, false);
      return { ok: true as const };
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '요청에 실패했어요.';
      setErrorMsg(String(msg));
      setText(content);
      return { ok: false as const };
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTouchStart = () => {
    if (!canSubmit || submitting) return;
    animateSendPress();
    void (async () => {
      const result = await submit();
      if (result.ok) {
        animateSendSuccess();
        requestAnimationFrame(() => inputRef.current?.focus?.());
      }
    })();
  };

  useEffect(() => {
    if (!visible) return;
    openAnim();
    fetchComments(0, false);
    scrollToTop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, storeId]);

  // ===== highlight style =====
  const pulseBg = hlPulseRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,102,0.00)', 'rgba(255,215,102,0.24)'],
  });
  const pulseBorder = hlPulseRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,190,60,0.00)', 'rgba(255,190,60,0.45)'],
  });
  const pulseScale = hlPulseRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const renderReply = (parentCommentId: number, r: ReplyItem) => {
    const isMine = Boolean(myUsername) && r.authorUsername === myUsername;
    const isHL = highlightReplyId != null && r.replyId === highlightReplyId;

    return (
      <Animated.View
        key={r.id}
        style={[
          styles.replyRow,
          isHL && {
            backgroundColor: pulseBg,
            borderColor: pulseBorder,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <Image
          source={{ uri: r.authorProfileUri || seedAvatar(r.authorUsername) }}
          style={styles.replyAvatar}
        />
        <View style={styles.replyBody}>
          <View style={styles.replyHeaderLine}>
            <Text style={styles.replyUsername}>@{r.authorUsername}</Text>
            <Text style={styles.replyTime}> · {timeAgo(r.createdAtMs)}</Text>

            {isMine ? (
              <TouchableOpacity
                onPress={() => openReplyMenu(parentCommentId, r)}
                style={styles.moreBtnSmall}
                activeOpacity={0.8}
              >
                <Icon name="ellipsis-horizontal" size={16} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.replyText}>{r.content}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: CommentItem }) => {
    const isOpen = Boolean(expanded[String(item.commentId)]);
    const isMine = Boolean(myUsername) && item.authorUsername === myUsername;
    const isHL = highlightCommentId != null && item.commentId === highlightCommentId;

    return (
      <Animated.View
        style={[
          styles.commentWrap,
          isHL && {
            backgroundColor: pulseBg,
            borderColor: pulseBorder,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <View style={styles.commentRow}>
          <Image
            source={{ uri: item.authorProfileUri || seedAvatar(item.authorUsername) }}
            style={styles.commentAvatar}
          />
          <View style={styles.commentBody}>
            <View style={styles.commentHeaderLine}>
              <Text style={styles.commentUsername}>@{item.authorUsername}</Text>
              <Text style={styles.commentTime}> · {timeAgo(item.createdAtMs)}</Text>

              {isMine ? (
                <TouchableOpacity
                  onPress={() => openCommentMenu(item)}
                  style={styles.moreBtn}
                  activeOpacity={0.8}
                >
                  <Icon name="ellipsis-horizontal" size={18} color="#6b7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.commentText}>{item.content}</Text>

            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => {
                  setReplyTarget({ commentId: item.commentId, username: item.authorUsername });
                  setEditTarget(null);
                  setExpanded(prev => ({ ...prev, [String(item.commentId)]: true }));
                  requestAnimationFrame(() => inputRef.current?.focus?.());
                }}
                style={styles.actionBtn}
                activeOpacity={0.85}
              >
                <Icon name="arrow-undo-outline" size={16} color="#6b7280" />
                <Text style={styles.actionText}>답글</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => toggleExpanded(item.commentId)}
                style={styles.replyPill}
                activeOpacity={0.85}
              >
                <Text style={styles.replyPillText}>
                  답글 {item.replyCount}개 {isOpen ? '접기' : '보기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isOpen ? (
          <View style={styles.repliesBox}>
            {item.repliesLoading ? (
              <View style={styles.repliesLoadingRow}>
                <ActivityIndicator />
                <Text style={styles.repliesLoadingText}>답글 불러오는 중…</Text>
              </View>
            ) : item.replyCount === 0 ? (
              <Text style={styles.repliesEmpty}>아직 답글이 없어요.</Text>
            ) : item.replies.length === 0 ? (
              <Text style={styles.repliesEmpty}>답글을 불러오지 못했어요. 다시 눌러주세요.</Text>
            ) : (
              item.replies.map(r => renderReply(item.commentId, r))
            )}
          </View>
        ) : null}
      </Animated.View>
    );
  };

  const placeholder = editTarget
    ? editTarget.type === 'comment'
      ? '댓글을 수정하세요'
      : '답글을 수정하세요'
    : replyTarget
      ? '답글을 입력하세요'
      : '댓글을 입력하세요';

  const modeLabel = editTarget
    ? editTarget.type === 'comment'
      ? '댓글 수정 중'
      : '답글 수정 중'
    : replyTarget
      ? `@${replyTarget.username}에게 답글`
      : null;

  const cancelMode = () => {
    setReplyTarget(null);
    setEditTarget(null);
    setText('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeWithAnimation}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        {/* 바깥 눌러 닫기 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: translateYRef.current }] },
            ]}
          >
            {/* 드래그 핸들 */}
            <View {...(panResponderRef.current?.panHandlers ?? {})}>
              <View style={styles.header}>
                <View style={styles.headerHandle} />
                <Text style={styles.headerTitle}>댓글 {comments.length}</Text>
                <TouchableOpacity onPress={closeWithAnimation} style={styles.closeBtn}>
                  <Icon name="close" size={22} color="#222" />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>댓글 불러오는 중…</Text>
              </View>
            ) : (
              <FlatList
                ref={r => (listRef.current = r)}
                data={comments}
                keyExtractor={c => c.id}
                renderItem={renderItem}
                keyboardShouldPersistTaps="always"
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                contentContainerStyle={[
                  styles.listContent,
                  comments.length === 0 && { flexGrow: 1 },
                ]}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                      {errorMsg ? errorMsg : '아직 댓글이 없어요.'}
                    </Text>
                  </View>
                }
              />
            )}

            {/* 입력 영역 */}
            <View style={styles.inputDock}>
              {modeLabel ? (
                <View style={styles.modeBar}>
                  <Text style={styles.modeText}>{modeLabel}</Text>
                  <TouchableOpacity
                    onPress={cancelMode}
                    style={styles.modeClose}
                    activeOpacity={0.85}
                  >
                    <Icon name="close" size={14} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.inputCard}>
                <TextInput
                  ref={r => (inputRef.current = r)}
                  value={text}
                  onChangeText={setText}
                  placeholder={placeholder}
                  placeholderTextColor="#9aa0a6"
                  style={styles.input}
                  multiline
                  blurOnSubmit={false}
                  submitBehavior="submit"
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (!canSubmit || submitting) return;
                    animateSendPress();
                    void (async () => {
                      const result = await submit();
                      if (result.ok) animateSendSuccess();
                      requestAnimationFrame(() => inputRef.current?.focus?.());
                    })();
                  }}
                />

                <Pressable
                  onTouchStart={handleSendTouchStart}
                  disabled={!canSubmit || submitting}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    (!canSubmit || submitting) && styles.sendBtnDisabled,
                    pressed && canSubmit && !submitting ? styles.sendBtnPressed : null,
                  ]}
                  hitSlop={10}
                >
                  <Animated.View style={{ transform: [{ scale: sendScaleRef.current }] }}>
                    <Icon
                      name="send"
                      size={18}
                      color={canSubmit && !submitting ? '#fff' : '#bdbdbd'}
                    />
                  </Animated.View>
                </Pressable>
              </View>

              {errorMsg ? (
                <Text style={styles.errorSmall} numberOfLines={2}>
                  {errorMsg}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kav: { width: '100%', justifyContent: 'flex-end' },
  sheet: {
    height: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#222' },
  closeBtn: { position: 'absolute', right: 14, top: 12, padding: 6 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#9aa0a6', fontSize: 13, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  commentWrap: {
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0)',
    paddingHorizontal: 10,
  },
  commentRow: { flexDirection: 'row', paddingVertical: 10 },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef0f3',
    marginRight: 10,
  },
  commentBody: { flex: 1, paddingRight: 6 },
  commentHeaderLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  commentUsername: { color: '#111827', fontSize: 13, fontWeight: '800' },
  commentTime: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  moreBtn: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 4 },
  commentText: {
    marginTop: 4,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },

  commentActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(17,24,39,0.03)',
  },
  actionText: { color: '#6b7280', fontSize: 12, fontWeight: '800' },

  replyPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.06)',
  },
  replyPillText: { color: '#6b7280', fontSize: 12, fontWeight: '800' },

  repliesBox: {
    marginLeft: 44,
    marginRight: 6,
    marginBottom: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(17,24,39,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.06)',
  },
  repliesEmpty: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  repliesLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  repliesLoadingText: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },

  replyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0)',
    paddingHorizontal: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eef0f3',
    marginRight: 10,
  },
  replyBody: { flex: 1 },
  replyHeaderLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  replyUsername: { color: '#111827', fontSize: 12, fontWeight: '800' },
  replyTime: { color: '#9aa0a6', fontSize: 11, fontWeight: '700' },
  moreBtnSmall: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2 },
  replyText: { marginTop: 3, color: '#111827', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  inputDock: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff' },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.06)',
    marginBottom: 8,
    gap: 8,
  },
  modeText: { color: '#374151', fontSize: 12, fontWeight: '800' },
  modeClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.06)',
  },

  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    padding: 10,
    backgroundColor: '#f6f7f9',
    borderWidth: 1,
    borderColor: '#eceef1',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 92,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#222',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  sendBtnPressed: { opacity: 0.85 },
  sendBtnDisabled: { backgroundColor: '#d8dadd' },

  errorSmall: { marginTop: 8, color: '#ef4444', fontSize: 12, fontWeight: '700' },
});

export default React.memo(VideoCommentModal);
