// src/screens/ImageFeed/components/FeedCommentModal.tsx
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
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../api/axiosInstance';
import { useAuth } from '../../../auth/AuthProvider';
import {
  extractItemsFromPage,
  getKeyboardOverlapInset,
  getPreferredUserDisplayName,
  isInt32,
  seedAvatar,
  timeAgo,
  toMs,
  withTimeout,
} from '../../shared/commentUtils';
import { buildProfileUri } from '../../../utils/profileImage';
import { useProfileNavigation } from '../../../hooks/useProfileNavigation';


type Props = {
  visible: boolean;
  onClose: () => void;
  feedId: number | null;

  // (선택) 나중에 overlay meta 연동할 때 사용
  onCommentCountChange?: (delta: number) => void; // +1 / -1
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CLOSE_THRESHOLD = 120;
const COLLAPSED_SHEET_HEIGHT_RATIO = 0.66;
const EXPANDED_SHEET_HEIGHT_RATIO = 0.9;
const MIN_SHEET_TOP_GAP = 16;
const COLLAPSED_SHEET_MIN_HEIGHT = 380;
const EXPANDED_SHEET_MIN_HEIGHT = 460;

// ===== API shapes (서버 DTO 기준) =====
type ApiAuthor = {
  username: string;
  userId?: number;
  nickName?: string;
  profileImageUrl?: string;
  isPrivate?: boolean;
};

type ApiComment = {
  commentId: number;
  feedId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: ApiAuthor;
  replyCount?: number; // ✅ B안
};

type ApiReply = {
  replyId: number;
  commentId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: ApiAuthor;
};

// ===== UI models =====
type ReplyItem = {
  id: string;
  replyId: number;
  commentId: number;
  content: string;
  createdAtMs: number;
  authorUsername: string;
  authorDisplayName: string;
  authorNick?: string;
  authorProfileUri?: string;
};

type CommentItem = {
  id: string;
  commentId: number;
  feedId: number;
  content: string;
  createdAtMs: number;
  authorUsername: string;
  authorDisplayName: string;
  authorNick?: string;
  authorProfileUri?: string;

  replyCount: number;
  replies: ReplyItem[]; // 펼치기 전엔 빈 배열
  repliesLoaded: boolean;
  repliesLoading: boolean;
  pending?: boolean;
};

const extractPageMeta = (resData: any) => {
  const page = Number(resData?.page ?? resData?.number ?? 0);
  const size = Number(resData?.size ?? 20);
  const total = Number(resData?.totalElements ?? 0);
  return {
    page: Number.isFinite(page) ? page : 0,
    size: Number.isFinite(size) ? size : 20,
    totalElements: Number.isFinite(total) ? total : 0,
  };
};

const normalizeReply = (r: ApiReply): ReplyItem => {
  const username = (r?.author?.username ?? 'plate_user').toString();
  const nick = (r?.author?.nickName ?? '').toString().trim();
  const profile = buildProfileUri(username, r?.author?.profileImageUrl);
  const replyId = Number(r?.replyId ?? 0);
  const displayName = getPreferredUserDisplayName({
    nickName: r?.author?.nickName,
    username,
  });

  return {
    id: String(replyId || Date.now()),
    replyId: replyId || 0,
    commentId: Number(r?.commentId ?? 0),
    content: (r?.content ?? '').toString(),
    createdAtMs: toMs(r?.createdAt),
    authorUsername: username,
    authorDisplayName: displayName,
    authorNick: nick || undefined,
    authorProfileUri: profile,
  };
};

const normalizeComment = (c: ApiComment): CommentItem => {
  const username = (c?.author?.username ?? 'plate_user').toString();
  const nick = (c?.author?.nickName ?? '').toString().trim();
  const profile = buildProfileUri(username, c?.author?.profileImageUrl);
  const displayName = getPreferredUserDisplayName({
    nickName: c?.author?.nickName,
    username,
  });

  return {
    id: String(c.commentId),
    commentId: c.commentId,
    feedId: c.feedId,
    content: (c.content ?? '').toString(),
    createdAtMs: toMs(c.createdAt),
    authorUsername: username,
    authorDisplayName: displayName,
    authorNick: nick || undefined,
    authorProfileUri: profile,

    replyCount: Number((c as any)?.replyCount ?? 0),
    replies: [],
    repliesLoaded: false,
    repliesLoading: false,
    pending: false,
  };
};

const FeedCommentModal: React.FC<Props> = ({ visible, onClose, feedId, onCommentCountChange }) => {
  const { user } = useAuth();
  const { navigateToProfile } = useProfileNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

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

  // ✅ Animated refs
  const translateYRef = useRef(new Animated.Value(SCREEN_HEIGHT));
  const backdropOpacityRef = useRef(new Animated.Value(0));
  const composerBottomAnimRef = useRef(new Animated.Value(0));
  const sendScaleRef = useRef(new Animated.Value(1));
  const hlPulseRef = useRef(new Animated.Value(0));

  const inputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<CommentItem> | null>(null);
  const keyboardInsetRef = useRef(0);
  const keyboardVisibleRef = useRef(false);

  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null);
  const [highlightReplyId, setHighlightReplyId] = useState<number | null>(null);

  const [text, setText] = useState('');
  const textRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [hasNext, setHasNext] = useState(true);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const pageRef = useRef(0);
  const lastLoadMorePageRef = useRef<number | null>(null);

  const [replyTarget, setReplyTarget] = useState<{
    commentId: number;
    username: string;
    displayName: string;
  } | null>(null);

  const [editTarget, setEditTarget] = useState<
    | { type: 'comment'; commentId: number; initialText: string }
    | { type: 'reply'; commentId: number; replyId: number; initialText: string }
    | null
  >(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(92);
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  const canSubmit = text.trim().length > 0;

  const scrollToTop = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated });
    });
  }, []);

  const closeWithAnimation = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropOpacityRef.current, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateYRef.current, {
        toValue: windowHeight,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      keyboardInsetRef.current = 0;
      keyboardVisibleRef.current = false;
      setKeyboardInset(0);
      setKeyboardVisible(false);
      setIsComposerFocused(false);
      pageRef.current = 0;
      lastLoadMorePageRef.current = null;
      setText('');
      setReplyTarget(null);
      setEditTarget(null);
      setExpanded({});
      setErrorMsg(null);
      setSubmitting(false);
      submittingRef.current = false;
      setHighlightCommentId(null);
      setHighlightReplyId(null);
      setComments([]);
      setPage(0);
      setSize(20);
      setHasNext(true);
      onClose();
    });
  }, [onClose, windowHeight]);

  // ✅ panResponder null-safe
  const panResponderRef = useRef<any>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, g: any) =>
        keyboardInsetRef.current <= 0 && !keyboardVisibleRef.current && g.dy > 6,
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
    translateYRef.current.setValue(windowHeight);
    backdropOpacityRef.current.setValue(0);
    Animated.parallel([
      Animated.timing(backdropOpacityRef.current, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateYRef.current, {
        toValue: 0,
        damping: 24,
        mass: 0.95,
        stiffness: 210,
        useNativeDriver: true,
      }),
    ]).start();
  }, [windowHeight]);

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
    async (nextPage = 0, append = false, options?: { silent?: boolean }) => {
      if (!feedId && feedId !== 0) return;
      if (!append) {
        lastLoadMorePageRef.current = null;
      }
      if (append) {
        setLoadingMore(true);
      } else if (!options?.silent) {
        setLoading(true);
      }
      setErrorMsg(null);

      try {
        const res = await api.get(`/api/image-feeds/${feedId}/comments`, {
          params: { page: nextPage, size: 20 },
        });

        const payload = res.data?.data ?? res.data;
        const meta = extractPageMeta(payload);
        const raw = extractItemsFromPage(payload) as ApiComment[];
        const normalized = raw.map(normalizeComment);

        const resolvedSize = meta.size ?? 20;
        const resolvedPage =
          append ? nextPage : Number.isFinite(meta.page) ? meta.page : nextPage;
        setComments(prev => (append ? [...prev, ...normalized] : normalized));
        setPage(resolvedPage);
        pageRef.current = resolvedPage;
        setSize(resolvedSize);

        // totalElements 기반 hasNext 계산 (없으면 length 기반 fallback)
        if (meta.totalElements > 0) {
          setHasNext((resolvedPage + 1) * resolvedSize < meta.totalElements);
        } else {
          setHasNext(normalized.length >= resolvedSize);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? '댓글을 불러오지 못했어요.';
        setErrorMsg(String(msg));
        if (!append) setComments([]);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [feedId],
  );

  const refresh = async () => {
    setRefreshing(true);
    await fetchComments(0, false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loading || loadingMore || refreshing) return;
    if (!hasNext) return;
    const nextPage = pageRef.current + 1;
    if (lastLoadMorePageRef.current === nextPage) return;
    lastLoadMorePageRef.current = nextPage;
    await fetchComments(nextPage, true);
  };

  const canLoadMore = hasNext && comments.length >= size;

  // ✅ 답글은 펼칠 때만 조회
  const fetchReplies = useCallback(async (commentId: number) => {
    setComments(prev =>
      prev.map(c =>
        c.commentId === commentId ? { ...c, repliesLoading: true } : c,
      ),
    );

    try {
      const res = await api.get(`/api/image-feeds/comments/${commentId}/replies`, {
        params: { page: 0, size: 50 },
      });

      const payload = res.data?.data ?? res.data;
      const raw = extractItemsFromPage(payload) as ApiReply[];
      const normalizedReplies = raw.map(normalizeReply);

      setComments(prev =>
        prev.map(c =>
          c.commentId === commentId
            ? {
                ...c,
                replies: normalizedReplies,
                repliesLoaded: true,
                repliesLoading: false,
                replyCount: Math.max(c.replyCount, normalizedReplies.length),
              }
            : c,
        ),
      );
    } catch {
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
    const willOpen = !expanded[key];

    setExpanded(prev => ({ ...prev, [key]: willOpen }));

    if (!willOpen) return;

    const target = comments.find(c => c.commentId === commentId);
    if (!target) return;

    if (target.replyCount > 0 && !target.repliesLoaded) {
      await fetchReplies(commentId);
    }
  };

  // ===== CRUD =====
  const updateComment = async (commentId: number, content: string) => {
    await api.put(`/api/image-feeds/comments/${commentId}`, { content });
  };
  const deleteComment = async (commentId: number) => {
    await api.delete(`/api/image-feeds/comments/${commentId}`);
  };
  const updateReply = async (replyId: number, content: string) => {
    await api.put(`/api/image-feeds/replies/${replyId}`, { content });
  };
  const deleteReply = async (replyId: number) => {
    await api.delete(`/api/image-feeds/replies/${replyId}`);
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
    if (item.pending) return;
    if (!myUsername || item.authorUsername !== myUsername) {
      Alert.alert('권한 없음', '내가 작성한 댓글만 수정/삭제할 수 있어요.');
      return;
    }
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
                  onCommentCountChange?.(-1);
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
    if (!myUsername || r.authorUsername !== myUsername) {
      Alert.alert('권한 없음', '내가 작성한 답글만 수정/삭제할 수 있어요.');
      return;
    }
    Alert.alert('답글', '원하는 작업을 선택하세요', [
      {
        text: '수정',
        onPress: () => {
          if (!isInt32(r.replyId) || r.replyId <= 0) {
            Alert.alert('잠깐!', 'replyId가 올바르지 않아 수정이 불가능해요. 새로고침 후 다시 시도해줘.');
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
            Alert.alert('잠깐!', 'replyId가 올바르지 않아 삭제가 불가능해요. 새로고침 후 다시 시도해줘.');
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
  const submit = async (contentOverride?: string) => {
    const content = (contentOverride ?? text).trim();
    const hasContent = content.length > 0;
    if (!hasContent || submittingRef.current) return { ok: false as const };
    if (!feedId && feedId !== 0) return { ok: false as const };

    submittingRef.current = true;
    setText('');
    textRef.current = '';
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
            Alert.alert('잠깐!', 'replyId가 올바르지 않아 수정이 불가능해요. 새로고침 후 다시 시도해줘.');
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
        const res = await api.post(`/api/image-feeds/comments/${replyTarget.commentId}/replies`, {
          content,
        });

        const serverReplyId = Number(res?.data?.replyId ?? res?.data?.data?.replyId);

        setExpanded(prev => ({ ...prev, [String(replyTarget.commentId)]: true }));

        // replyCount 즉시 증가
        setComments(prev =>
          prev.map(c =>
            c.commentId === replyTarget.commentId ? { ...c, replyCount: c.replyCount + 1 } : c,
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
      const tempId = `temp-${Date.now()}`;
      const me = myUsername || 'me';
      const myDisplayName = getPreferredUserDisplayName({
        nickName: user?.nickName ?? user?.nickname ?? user?.displayName,
        username: me,
      });
      const optimistic: CommentItem = {
        id: tempId,
        commentId: 0,
        feedId,
        content,
        createdAtMs: Date.now(),
        authorUsername: me,
        authorDisplayName: myDisplayName,
        authorProfileUri: buildProfileUri(
          me,
          user?.profileImageUrl ?? user?.avatarUrl ?? null,
        ),
        replyCount: 0,
        replies: [],
        repliesLoaded: true,
        repliesLoading: false,
        pending: true,
      };
      setComments(prev => [optimistic, ...prev]);
      scrollToTop(true);

      const res = await withTimeout(
        api.post(`/api/image-feeds/${feedId}/comments`, { content }),
        10000,
      );
      const serverCommentId = Number(res?.data?.commentId ?? res?.data?.data?.commentId);

      if (Number.isFinite(serverCommentId) && isInt32(serverCommentId) && serverCommentId > 0) {
        setComments(prev =>
          prev.map(c =>
            c.id === tempId
              ? {
                  ...c,
                  id: String(serverCommentId),
                  commentId: serverCommentId,
                  pending: false,
                }
              : c,
          ),
        );
        flashHighlightComment(serverCommentId);
        onCommentCountChange?.(+1);
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }

      // 서버 정합성 맞추기 위해 첫 페이지 갱신
      await fetchComments(0, false, { silent: true });
      scrollToTop(false);
      return { ok: true as const };
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '요청에 실패했어요.';
      setErrorMsg(String(msg));
      setText(content);
      textRef.current = content;
      setComments(prev => prev.filter(c => !c.pending));
      return { ok: false as const };
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSend = (contentOverride?: string) => {
    const content = (contentOverride ?? textRef.current).trim();
    if (!content || submittingRef.current) return;
    animateSendPress();
    submit(content)
      .then((result) => {
        if (result.ok) {
          animateSendSuccess();
        }
      })
      .catch(() => {});
  };

  const handleSendPress = () => {
    handleSend((textRef.current || text).trim());
  };

  useEffect(() => {
    if (!visible) return;
    setIsComposerFocused(false);
    openAnim();
    fetchComments(0, false);
    scrollToTop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, feedId]);

  useEffect(() => {
    if (!visible) {
      keyboardInsetRef.current = 0;
      keyboardVisibleRef.current = false;
      setKeyboardInset(0);
      setKeyboardVisible(false);
      return;
    }

    const syncKeyboardInset = (event: any) => {
      const nextInset = getKeyboardOverlapInset(event, insets.bottom);

      keyboardInsetRef.current = nextInset;
      keyboardVisibleRef.current = true;
      setKeyboardInset(nextInset);
      setKeyboardVisible(true);
    };
    const resetKeyboardInset = () => {
      keyboardInsetRef.current = 0;
      keyboardVisibleRef.current = false;
      setKeyboardInset(0);
      setKeyboardVisible(false);
    };

    const frameEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const frameSub = Keyboard.addListener(frameEvent, syncKeyboardInset);
    const hideSub = Keyboard.addListener(hideEvent, resetKeyboardInset);

    return () => {
      frameSub.remove();
      hideSub.remove();
      keyboardInsetRef.current = 0;
      keyboardVisibleRef.current = false;
      setKeyboardInset(0);
      setKeyboardVisible(false);
    };
  }, [insets.bottom, visible]);

  const collapsedSheetHeight = useMemo(
    () =>
      Math.max(
        COLLAPSED_SHEET_MIN_HEIGHT,
        Math.min(
          windowHeight - Math.max(insets.top + 8, MIN_SHEET_TOP_GAP),
          windowHeight * COLLAPSED_SHEET_HEIGHT_RATIO,
        ),
      ),
    [insets.top, windowHeight],
  );

  const expandedSheetHeight = useMemo(
    () =>
      Math.max(
        EXPANDED_SHEET_MIN_HEIGHT,
        Math.min(
          windowHeight - Math.max(insets.top + 8, MIN_SHEET_TOP_GAP),
          windowHeight * EXPANDED_SHEET_HEIGHT_RATIO,
        ),
      ),
    [insets.top, windowHeight],
  );

  const shouldExpandSheet =
    keyboardVisible ||
    isComposerFocused ||
    replyTarget != null ||
    editTarget != null;

  const targetSheetHeight = shouldExpandSheet
    ? expandedSheetHeight
    : collapsedSheetHeight;

  const sheetKeyboardLift = 0;
  const composerBottomInset = keyboardVisible ? keyboardInset : 0;
  const composerSafeBottom = keyboardVisible ? 6 : Math.max(insets.bottom, 6);
  const composerPaddingBottom = 12 + composerSafeBottom;
  const listBottomInset = composerHeight + composerPaddingBottom + composerBottomInset + 12;

  useEffect(() => {
    Animated.timing(composerBottomAnimRef.current, {
      toValue: composerBottomInset,
      duration: keyboardVisible ? 220 : 180,
      useNativeDriver: false,
    }).start();
  }, [composerBottomInset, keyboardVisible]);

  const handleBackdropPress = useCallback(() => {
    if (keyboardVisibleRef.current) {
      Keyboard.dismiss();
      return;
    }
    closeWithAnimation();
  }, [closeWithAnimation]);

  const dismissKeyboardIfVisible = useCallback(() => {
    if (keyboardVisibleRef.current) {
      Keyboard.dismiss();
    }
  }, []);

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
        <TouchableOpacity
          onPress={() => navigateToProfile(r.authorUsername)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: r.authorProfileUri || seedAvatar(r.authorUsername) }}
            style={styles.replyAvatar}
          />
        </TouchableOpacity>
          <View style={styles.replyBody}>
          <View style={styles.replyHeaderLine}>
            <TouchableOpacity onPress={() => navigateToProfile(r.authorUsername)}>
              <Text style={styles.replyUsername}>{r.authorDisplayName}</Text>
            </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => navigateToProfile(item.authorUsername)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.authorProfileUri || seedAvatar(item.authorUsername) }}
              style={styles.commentAvatar}
            />
          </TouchableOpacity>
          <View style={styles.commentBody}>
            <View style={styles.commentHeaderLine}>
              <TouchableOpacity onPress={() => navigateToProfile(item.authorUsername)}>
                <Text style={styles.commentUsername}>{item.authorDisplayName}</Text>
              </TouchableOpacity>
              <Text style={styles.commentTime}> · {timeAgo(item.createdAtMs)}</Text>
              {item.pending ? (
                <Text style={styles.commentPending}> · 등록 중</Text>
              ) : null}

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
                  setReplyTarget({
                    commentId: item.commentId,
                    username: item.authorUsername,
                    displayName: item.authorDisplayName,
                  });
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
      ? `${replyTarget.displayName}에게 답글`
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
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropDim, { opacity: backdropOpacityRef.current }]}
        />
        {/* 바깥 눌러 닫기 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <Animated.View
          style={[
            styles.sheet,
            {
              height: targetSheetHeight,
              transform: [
                { translateY: translateYRef.current },
                { translateY: -sheetKeyboardLift },
              ],
            },
          ]}
        >
            {/* 드래그 핸들 */}
            <View {...(panResponderRef.current?.panHandlers ?? {})}>
              <View style={styles.header} onTouchStart={dismissKeyboardIfVisible}>
                <View style={styles.headerHandle} />
                <Text style={styles.headerTitle}>댓글 {comments.length}</Text>
                <TouchableOpacity onPress={closeWithAnimation} style={styles.closeBtn}>
                  <Icon name="close" size={22} color="#222" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.body}>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>댓글 불러오는 중…</Text>
                </View>
              ) : (
                <FlatList
                  ref={r => {
                    listRef.current = r;
                  }}
                  style={styles.list}
                  data={comments}
                  keyExtractor={c => c.id}
                  renderItem={renderItem}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  onTouchStart={dismissKeyboardIfVisible}
                  onScrollBeginDrag={dismissKeyboardIfVisible}
                  onEndReached={canLoadMore ? loadMore : undefined}
                  onEndReachedThreshold={0.3}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                  contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: listBottomInset },
                    comments.length === 0 && styles.listContentEmpty,
                  ]}
                  scrollIndicatorInsets={{ bottom: listBottomInset }}
                  ListEmptyComponent={
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>{errorMsg ? errorMsg : '아직 댓글이 없어요.'}</Text>
                    </View>
                  }
                />
              )}

              {/* 입력 영역 */}
              <Animated.View
                style={[
                  styles.inputDock,
                  {
                    bottom: composerBottomAnimRef.current,
                    paddingBottom: composerPaddingBottom,
                  },
                ]}
                onLayout={event => {
                  const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                  if (nextHeight > 0 && nextHeight !== composerHeight) {
                    setComposerHeight(nextHeight);
                  }
                }}
              >
                {modeLabel ? (
                  <View style={styles.modeBar}>
                    <Text style={styles.modeText}>{modeLabel}</Text>
                    <TouchableOpacity onPress={cancelMode} style={styles.modeClose} activeOpacity={0.85}>
                      <Icon name="close" size={14} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.inputCard}>
                  <TextInput
                    ref={r => {
                      inputRef.current = r;
                    }}
                    value={text}
                    onChangeText={value => {
                      textRef.current = value;
                      setText(value);
                    }}
                    placeholder={placeholder}
                    placeholderTextColor="#9aa0a6"
                    style={styles.input}
                    multiline
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => setIsComposerFocused(false)}
                    blurOnSubmit={false}
                    submitBehavior="submit"
                    returnKeyType="send"
                    onSubmitEditing={() => {
                      const content = (textRef.current || text).trim();
                      if (!content || submittingRef.current) return;
                      handleSend(content);
                    }}
                  />

                  <Pressable
                    onPress={handleSendPress}
                    disabled={!canSubmit || submitting}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      (!canSubmit || submitting) && styles.sendBtnDisabled,
                      pressed && canSubmit && !submitting ? styles.sendBtnPressed : null,
                    ]}
                    hitSlop={10}
                  >
                    <Animated.View style={{ transform: [{ scale: sendScaleRef.current }] }}>
                      <Icon name="send" size={18} color={canSubmit && !submitting ? '#fff' : '#bdbdbd'} />
                    </Animated.View>
                  </Pressable>
                </View>

                {errorMsg ? (
                  <Text style={styles.errorSmall} numberOfLines={2}>
                    {errorMsg}
                  </Text>
                ) : null}
              </Animated.View>
            </View>
          </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  body: { flex: 1 },
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

  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  listContentEmpty: { flexGrow: 1 },
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
  commentPending: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
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

  inputDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eceef1',
  },
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

export default FeedCommentModal;
