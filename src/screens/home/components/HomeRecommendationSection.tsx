import React, { memo } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type {
  RecommendationItem,
  RecommendationSection,
} from '../../../api/recommendationsApi';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';

type Props = {
  sections: RecommendationSection[];
  loading?: boolean;
  error?: string | null;
  onPressItem?: (item: RecommendationItem) => void;
  onPressRefresh?: () => void;
};

const formatDistance = (distanceM?: number | null) => {
  if (!distanceM || distanceM <= 0) return null;
  if (distanceM < 1000) return `${Math.round(distanceM)}m`;
  return `${(distanceM / 1000).toFixed(distanceM < 10_000 ? 1 : 0)}km`;
};

const targetIconName = (targetType: RecommendationItem['targetType']) => {
  if (targetType === 'VIDEO_FEED') return 'play-circle-outline';
  if (targetType === 'IMAGE_FEED') return 'images-outline';
  if (targetType === 'SEASONAL_MENU') return 'leaf-outline';
  return 'storefront-outline';
};

const RecommendationCard: React.FC<{
  item: RecommendationItem;
  onPress?: (item: RecommendationItem) => void;
}> = ({ item, onPress }) => {
  const distance = formatDistance(item.distanceM);
  const meta = [distance, item.category, item.friendNames?.length ? `친구 ${item.friendNames.length}명` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress?.(item)}
    >
      <ImageBackground
        source={{ uri: item.thumbnailUrl ?? 'https://picsum.photos/id/1060/900/1200' }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.cardImageOverlay}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.score}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Icon name={targetIconName(item.targetType)} size={15} color="#fff" />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <View style={styles.reasonRow}>
          {item.reasonLabels.slice(0, 2).map((label) => (
            <View key={`${item.id}-${label}`} style={styles.reasonChip}>
              <Text style={styles.reasonText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeRecommendationSection: React.FC<Props> = ({
  sections,
  loading = false,
  error = null,
  onPressItem,
  onPressRefresh,
}) => {
  if (loading && sections.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>추천을 준비하는 중...</Text>
      </View>
    );
  }

  if (error && sections.length === 0) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>추천을 불러오지 못했어요.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onPressRefresh} activeOpacity={0.88}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>RECOMMENDED</Text>
          <Text style={styles.title}>맞춤 추천</Text>
          <Text style={styles.subtitle}>
            위치, 취향, 친구 반응, 인기, 제철 신호를 점수로 합산합니다.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onPressRefresh}
          activeOpacity={0.84}
        >
          <Icon name="refresh-outline" size={16} color={HOME_COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {sections.map((section) => (
        <View key={section.key} style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>
              {section.subtitle}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardRow}
          >
            {section.items.map((item) => (
              <RecommendationCard key={item.id} item={item} onPress={onPressItem} />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
};

export default memo(HomeRecommendationSection);

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: HOME_COLORS.surfaceSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: HOME_COLORS.action,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: HOME_COLORS.textMutedAlt,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeader: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: HOME_COLORS.textMuted,
  },
  cardRow: {
    paddingHorizontal: 10,
    gap: 10,
  },
  card: {
    width: 176,
    borderRadius: HOME_RADII.cardSmall,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
  },
  cardImage: {
    height: 128,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  cardImageStyle: {
    resizeMode: 'cover',
  },
  cardImageOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 9,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  scoreBadge: {
    minWidth: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  typeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardTitle: {
    minHeight: 40,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
  },
  cardSubtitle: {
    marginTop: 5,
    minHeight: 34,
    fontSize: 12,
    lineHeight: 17,
    color: HOME_COLORS.textMutedAlt,
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 11,
    color: HOME_COLORS.textMuted,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 9,
  },
  reasonChip: {
    maxWidth: 76,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '800',
    color: HOME_COLORS.textSecondary,
  },
  loadingBox: {
    marginHorizontal: 10,
    marginTop: 18,
    marginBottom: 12,
    borderRadius: HOME_RADII.cardSmall,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: HOME_COLORS.textMuted,
  },
  errorBox: {
    marginHorizontal: 10,
    marginTop: 18,
    marginBottom: 12,
    borderRadius: HOME_RADII.cardSmall,
    padding: 16,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: HOME_COLORS.textPrimary,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textOnDark,
  },
});
