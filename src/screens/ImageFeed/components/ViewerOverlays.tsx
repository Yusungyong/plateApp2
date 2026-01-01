// src/screens/ImageFeed/components/ViewerOverlays.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import type { ImageFeedViewerResponse } from '../../../api/imageFeedApi';

const PROFILE_BASE_URL = Config.PROFILE_BUCKET ?? '';
const ICON_SIZE = 34;

const joinUrl = (base?: string, path?: string) => {
  if (!path) return null;
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${b}/${p}`;
};

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
  onPressComment: () => void;

  onPressLocation?: () => void;
  onPressMenu?: () => void;
};

export default function ViewerOverlays({
  uiVisible,
  onBack,
  activeData,
  meta,
  onToggleLike,
  onPressComment,
  onPressLocation,
  onPressMenu,
}: Props) {
  const profileUri = useMemo(
    () => joinUrl(PROFILE_BASE_URL, activeData?.profileImageUrl ?? undefined),
    [activeData?.profileImageUrl],
  );

  const [contentExpanded, setContentExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setContentExpanded((v) => !v), []);

  if (!uiVisible) return null;

  const storeName = activeData?.storeName ?? null;
  const location = activeData?.location ?? null;

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

      {/* ✅ Right Action Stack (VideoOverlayUI style) */}
      {activeData && (
        <View style={styles.rightContainer} pointerEvents="box-none">
          <View style={styles.stack}>
            <TouchableOpacity style={styles.item} onPress={onToggleLike}>
              <Icon
                name={meta.isLiked ? 'heart' : 'heart-outline'}
                size={ICON_SIZE}
                color={meta.isLiked ? '#ff4d4f' : '#fff'}
              />
              <Text style={styles.count}>{meta.likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={onPressComment}>
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
                <Icon name="restaurant-outline" size={ICON_SIZE} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ✅ Bottom Caption */}
      {activeData && (
        <View style={styles.bottomCaption} pointerEvents="box-none">
          {/* 1) 프로필 + 닉네임 (요청대로 “합친 로우” 유지) */}
          <View style={styles.userRow}>
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
          </View>

          {/* ✅ 2) 식당이름 + 주소를 “프로필/닉네임 로우 밑”으로 내림 */}
          {(!!storeName || !!location) && (
            <View style={styles.placeBlock}>
              {!!storeName && (
                <Text style={styles.storeLine} numberOfLines={1}>
                  {storeName}
                </Text>
              )}
              {!!location && (
                <Text style={styles.placeLine} numberOfLines={1}>
                  {location}
                </Text>
              )}
            </View>
          )}

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
  item: { alignItems: 'center' },
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
    bottom: 20,
  },

  // 1) 프로필 + 닉네임 row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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

  // 2) place block (moved under userRow)
  placeBlock: {
    marginBottom: 10,
  },
  storeLine: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  placeLine: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
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
