import React, { memo, type ReactNode, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type { HomeContentFeedItem } from '../mockContentFeedData';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';
import {
  getHomeContentFeedAuthorLabel,
  getHomeContentFeedAuthorProfile,
} from './homeContentFeedCardUtils';

type Props = {
  item: HomeContentFeedItem;
  media: ReactNode;
  likePending?: boolean;
  onPressLike?: (() => void) | null;
  onPressComment?: (() => void) | null;
  onPressOpen?: (() => void) | null;
};

const HomeContentFeedCardFrame: React.FC<Props> = ({
  item,
  media,
  likePending = false,
  onPressLike = null,
  onPressComment = null,
  onPressOpen = null,
}) => {
  const authorLabel = useMemo(
    () => getHomeContentFeedAuthorLabel(item.author),
    [item.author],
  );
  const authorProfile = useMemo(
    () => getHomeContentFeedAuthorProfile(item.author),
    [item.author],
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.authorBlock}>
          <Image source={{ uri: authorProfile }} style={styles.avatar} />
          <View style={styles.authorCopy}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorLabel}
            </Text>
            <Text style={styles.authorMeta} numberOfLines={1}>
              {item.storeName} · {item.createdLabel}
            </Text>
          </View>
        </View>
      </View>

      {onPressOpen && !item.isMock ? (
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={onPressOpen}
          style={styles.cardBody}
        >
          {media}
        </TouchableOpacity>
      ) : (
        <View style={styles.cardBody}>{media}</View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.cardMetaRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!onPressLike || likePending || item.isMock}
            onPress={onPressLike ?? undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.metaChip,
              item.stats.likedByMe && styles.metaChipActive,
              (!onPressLike || item.isMock) && styles.metaChipDisabled,
            ]}
          >
            <Icon
              name={item.stats.likedByMe ? 'heart' : 'heart-outline'}
              size={16}
              color={
                item.stats.likedByMe
                  ? HOME_COLORS.action
                  : HOME_COLORS.textMuted
              }
            />
            <Text style={styles.metaChipText}>{item.stats.likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!onPressComment || item.isMock}
            onPress={onPressComment ?? undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.metaChip,
              (!onPressComment || item.isMock) && styles.metaChipDisabled,
            ]}
          >
            <Icon
              name="chatbubble-outline"
              size={15}
              color={HOME_COLORS.textMuted}
            />
            <Text style={styles.metaChipText}>{item.stats.commentCount}</Text>
          </TouchableOpacity>
          {item.isMock ? (
            <View style={styles.previewPill}>
              <Text style={styles.previewPillText}>목데이터 프리뷰</Text>
            </View>
          ) : null}
        </View>
        {onPressOpen && !item.isMock ? (
          <TouchableOpacity activeOpacity={0.94} onPress={onPressOpen}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

export default memo(HomeContentFeedCardFrame);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: HOME_COLORS.surface,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  authorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  authorCopy: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  authorMeta: {
    marginTop: 3,
    fontSize: 11,
    color: HOME_COLORS.textMuted,
  },
  cardBody: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  cardFooter: {
    paddingHorizontal: 4,
    paddingTop: 9,
    paddingBottom: 0,
  },
  cardTitle: {
    marginTop: 7,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  cardAddress: {
    marginTop: 4,
    fontSize: 12,
    color: HOME_COLORS.textMuted,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: HOME_RADII.badge,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  metaChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D5B0',
  },
  metaChipDisabled: {
    opacity: 0.72,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textMuted,
  },
  previewPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: HOME_RADII.badge,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: HOME_COLORS.textSecondary,
  },
});
