import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type { Comment } from '../../../api/commentsApi';
import {
  createImageFeedComment,
  createVideoFeedComment,
  fetchImageFeedComments,
  fetchVideoFeedComments,
} from '../../../api/commentsApi';
import { useRequireLogin } from '../../../hooks/useRequireLogin';
import { buildProfileUri } from '../../../utils/profileImage';
import { formatTimeAgo } from '../../../utils/dateTime';
import type { HomeContentFeedItem } from '../mockContentFeedData';

type Props = {
  visible: boolean;
  item: HomeContentFeedItem | null;
  onClose: () => void;
  onCommentCreated?: ((item: HomeContentFeedItem) => void) | null;
};

const HomeContentFeedCommentSheet: React.FC<Props> = ({
  visible,
  item,
  onClose,
  onCommentCreated = null,
}) => {
  const requireLogin = useRequireLogin();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const placeholder = useMemo(() => {
    if (!item) return '댓글을 입력해보세요';
    return item.contentType === 'VIDEO'
      ? '영상에 댓글 남기기'
      : '이미지에 댓글 남기기';
  }, [item]);

  const loadComments = useCallback(
    async (refresh = false) => {
      if (!item || item.isMock) {
        setComments([]);
        setError(null);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextComments =
          item.contentType === 'VIDEO'
            ? await fetchVideoFeedComments(item.storeId, { limit: 30, offset: 0 })
            : await fetchImageFeedComments(item.feedId, { limit: 30, offset: 0 });
        setComments(nextComments);
        setError(null);
      } catch {
        setError('댓글을 불러오지 못했어요.');
      } finally {
        if (refresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [item],
  );

  useEffect(() => {
    if (!visible) return;
    setDraft('');
    loadComments(false).catch(() => undefined);
  }, [loadComments, visible]);

  const handleSubmit = useCallback(async () => {
    const content = draft.trim();
    if (!item || !content) {
      return;
    }
    if (
      !requireLogin({
        message: '댓글은 로그인 후 작성할 수 있어요.',
      })
    ) {
      return;
    }

    try {
      setPosting(true);
      const created =
        item.contentType === 'VIDEO'
          ? await createVideoFeedComment(item.storeId, { content })
          : await createImageFeedComment(item.feedId, { content });
      setComments((prev) => [created, ...prev]);
      setDraft('');
      onCommentCreated?.(item);
    } catch {
      setError('댓글을 등록하지 못했어요.');
    } finally {
      setPosting(false);
    }
  }, [draft, item, onCommentCreated, requireLogin]);

  const renderItem = useCallback(({ item: comment }: { item: Comment }) => {
    const profileUri = buildProfileUri(comment.username, comment.profileImageUrl);
    return (
      <View style={styles.commentRow}>
        <Image source={{ uri: profileUri }} style={styles.avatar} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor} numberOfLines={1}>
              {comment.nickname ?? comment.username}
            </Text>
            <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
      </View>
    );
  }, []);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>첫 댓글을 남겨보세요</Text>
        <Text style={styles.emptyBody}>
          아직 댓글이 없어요. 카드 흐름을 끊지 않고 여기서 바로 대화를 시작할 수 있어요.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={24}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>댓글</Text>
                {item ? (
                  <Text style={styles.headerMeta} numberOfLines={1}>
                    {item.storeName}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="close" size={18} color="#1b1712" />
              </TouchableOpacity>
            </View>

            {loading && comments.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(comment) => String(comment.commentId)}
                renderItem={renderItem}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => loadComments(true)}
              />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor="#918678"
                style={styles.input}
                multiline
                maxLength={240}
                textAlignVertical="top"
              />
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={!draft.trim() || posting}
                style={[
                  styles.submitButton,
                  (!draft.trim() || posting) && styles.submitButtonDisabled,
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {posting ? '등록 중' : '등록'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default HomeContentFeedCommentSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    maxHeight: '76%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ddd3c6',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b1712',
  },
  headerMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6f6355',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f1eb',
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1ece5',
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
    paddingTop: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthor: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#1b1712',
  },
  commentTime: {
    fontSize: 11,
    color: '#8b7f72',
  },
  commentText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#2c241b',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1b1712',
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#7d7265',
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 10,
    fontSize: 12,
    color: '#b00020',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: '#eee5da',
    paddingTop: 12,
    gap: 10,
  },
  input: {
    minHeight: 82,
    maxHeight: 140,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8f4ee',
    fontSize: 13,
    color: '#1b1712',
  },
  submitButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#18130e',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fffaf4',
  },
});
