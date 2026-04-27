// src/screens/ImageFeed/components/ViewerOverlays.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { ImageFeedViewerResponse } from '../../../api/imageFeedApi';
import { buildProfileUri } from '../../../utils/profileImage';
import { useProfileNavigation } from '../../../hooks/useProfileNavigation';
import { useRequireLogin } from '../../../hooks/useRequireLogin';

const ICON_SIZE = 34;
const TOP_BASE = Platform.OS === 'android' ? 12 : 52;
const BACK_BUTTON_HEIGHT = 44;
const TOP_GAP = 8;
const TOP_CHIP_TOP = TOP_BASE + BACK_BUTTON_HEIGHT + TOP_GAP;

export type FeedMetaUI = {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
};

type Props = {
  uiVisible: boolean;
  onBack: () => void;

  // 호출부 호환용(카운터 UI는 삭제됨)
  activeData: ImageFeedViewerResponse | null;
  activeImageIndex: number;
  totalImages: number;

  meta: FeedMetaUI;
  onToggleLike: () => void;
  onPressLikeCount?: () => void;
  onPressComment: () => void;

  onPressLocation?: () => void;
  onPressMenu?: () => void;
  showActions?: boolean;
  showFooter?: boolean;
};

export default function ViewerOverlays({
  uiVisible,
  onBack,
  activeData,
  meta,
  onToggleLike,
  onPressLikeCount,
  onPressComment,
  onPressLocation,
  onPressMenu,
  showActions = true,
  showFooter = true,
}: Props) {
  const profileUri = useMemo(
    () => buildProfileUri(activeData?.username, activeData?.profileImageUrl),
    [activeData?.profileImageUrl, activeData?.username],
  );
  const { navigateToProfile } = useProfileNavigation();
  const requireLogin = useRequireLogin();

  const [contentExpanded, setContentExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setContentExpanded((v) => !v), []);

  if (!uiVisible) return null;

  const storeName = activeData?.storeName?.trim() || null;
  const location = activeData?.location?.trim() || null;

  const content = activeData?.content ?? '';
  const feedTitle = activeData?.feedTitle ?? null;

  // ✅ “2줄 이상일 가능성” 휴리스틱: 길이가 어느 정도면 더보기 UX 제공
  // (정확한 줄 수 측정은 onTextLayout로도 가능하지만 여기선 가볍게)
  const mayOverflow = content.trim().length >= 70;

  return (
    <>
      {/* ✅ Top Bar (counter removed) */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {(location || storeName) && (
        <View pointerEvents="none" style={[styles.topChipContainer, { top: TOP_CHIP_TOP }]}>
          <View style={styles.topChipStack}>
            {location ? (
              <View style={styles.topChip}>
                <Icon name="location-outline" size={16} color="#fff" />
                <Text style={styles.topChipText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}

            {storeName ? (
              <View style={[styles.topChip, styles.topChipSecondary]}>
                <Icon name="restaurant-outline" size={16} color="#fff" />
                <Text style={styles.topChipText} numberOfLines={1}>
                  {storeName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* ✅ Right Action Stack (VideoOverlayUI style) */}
      {showActions && activeData && (
        <View style={styles.rightContainer} pointerEvents="box-none">
          <View style={styles.stack}>
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                if (!requireLogin({ message: '좋아요는 로그인 후 사용할 수 있어요.' })) return;
                onToggleLike();
              }}
            >
              <Icon
                name={meta.isLiked ? 'heart' : 'heart-outline'}
                size={ICON_SIZE}
                color={meta.isLiked ? '#ff4d4f' : '#fff'}
              />
              <TouchableOpacity
                onPress={() => {
                  if (!requireLogin({ message: '좋아요 목록은 로그인 후 볼 수 있어요.' })) {
                    return;
                  }
                  onPressLikeCount?.();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={onPressLikeCount ? 0.7 : 1}
                disabled={!onPressLikeCount}
              >
                <Text style={styles.count}>{meta.likeCount}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                if (!requireLogin({ message: '댓글은 로그인 후 작성할 수 있어요.' })) return;
                onPressComment();
              }}
            >
              <Icon name="chatbubble-outline" size={ICON_SIZE} color="#fff" />
              <Text style={styles.count}>{meta.commentCount}</Text>
            </TouchableOpacity>

            {!!onPressLocation && (
              <TouchableOpacity style={styles.item} onPress={onPressLocation}>
                <Icon name="location-outline" size={ICON_SIZE} color="#fff" />
              </TouchableOpacity>
            )}

            {!!onPressMenu && (
              <TouchableOpacity style={styles.item} onPress={onPressMenu}>
                <Icon name="ellipsis-horizontal" size={ICON_SIZE} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ✅ Bottom Caption */}
      {showFooter && activeData && (
        <View style={styles.bottomCaption} pointerEvents="box-none">
          {/* 3) 피드 제목 */}
          {!!feedTitle && (
            <Text style={styles.feedTitle} numberOfLines={1}>
              {feedTitle}
            </Text>
          )}

          {/* ✅ 4) 피드 내용: 2줄 이상이면 “터치해서 펼치기” UX */}
          {!!content && (
            <Pressable onPress={mayOverflow ? toggleExpanded : undefined} style={styles.contentWrap}>
              <Text style={styles.content} numberOfLines={contentExpanded ? 0 : 2}>
                {content}
              </Text>

              {/* 힌트 텍스트 */}
              {mayOverflow && !contentExpanded && (
                <Text style={styles.moreHint}>터치해서 더보기</Text>
              )}
              {mayOverflow && contentExpanded && (
                <Text style={styles.moreHint}>터치해서 접기</Text>
              )}
            </Pressable>
          )}

          {/* 1) 프로필 + 닉네임 */}
          <Pressable
            style={styles.userRow}
            onPress={() => navigateToProfile(activeData?.username)}
          >
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.userLine} numberOfLines={1}>
                {activeData.nickName ?? activeData.username}
              </Text>
            </View>
          </Pressable>

        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ✅ Top
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingTop: Platform.OS === 'android' ? 12 : 52,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topChipContainer: {
    position: 'absolute',
    right: 12,
    left: 12,
    alignItems: 'flex-end',
  },
  topChipStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  topChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topChipSecondary: {
    alignSelf: 'flex-end',
  },
  topChipText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },

  // ✅ Right stack
  rightContainer: {
    position: 'absolute',
    right: 12,
    bottom: 120,
  },
  stack: {
    alignItems: 'center',
    gap: 20,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  count: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },

  // ✅ Bottom caption
  bottomCaption: {
    position: 'absolute',
    left: 12,
    right: 78, // 우측 스택 피하기
    bottom: 36,
  },

  // 1) 프로필 + 닉네임 row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222',
  },
  avatarPlaceholder: { opacity: 0.45 },
  userLine: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  // 3) title
  feedTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 0 },

  // 4) content expand UX
  contentWrap: {
    marginTop: 6,
  },
  content: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    lineHeight: 18,
  },
  moreHint: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
  },
});
