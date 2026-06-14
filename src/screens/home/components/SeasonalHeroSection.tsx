import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { SeasonalHeroItem } from '../types';
import { HOME_COLORS } from '../styles/homeTokens';

const CARD_GAP = 14;
const CARD_MIN_WIDTH = 280;
const CARD_SIDE_PEEK = 58;

type SeasonalHeroSectionProps = {
  items: SeasonalHeroItem[];
  activeSeasonalFoodId: number;
  onSelectItem: (seasonalFoodId: number) => void;
};

const SeasonalHeroSection: React.FC<SeasonalHeroSectionProps> = ({
  items,
  activeSeasonalFoodId,
  onSelectItem,
}) => {
  const listRef = useRef<FlatList<SeasonalHeroItem> | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(screenWidth - CARD_SIDE_PEEK, CARD_MIN_WIDTH);
  const pageWidth = cardWidth + CARD_GAP;

  const activeIndex = useMemo(() => {
    const foundIndex = items.findIndex((item) => item.seasonalFoodId === activeSeasonalFoodId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [activeSeasonalFoodId, items]);

  useEffect(() => {
    if (!listRef.current || activeIndex < 0) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0,
      });
    });
  }, [activeIndex, pageWidth]);

  const handlePressIndicator = useCallback(
    (index: number) => {
      const targetItem = items[index];
      if (!targetItem) {
        return;
      }

      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });

      if (targetItem.seasonalFoodId !== activeSeasonalFoodId) {
        onSelectItem(targetItem.seasonalFoodId);
      }
    },
    [activeSeasonalFoodId, items, onSelectItem],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (items.length <= 1) {
        return;
      }

      const nextIndex = Math.max(
        0,
        Math.min(
          Math.round(event.nativeEvent.contentOffset.x / pageWidth),
          items.length - 1,
        ),
      );
      const nextItem = items[nextIndex];

      if (nextItem && nextItem.seasonalFoodId !== activeSeasonalFoodId) {
        onSelectItem(nextItem.seasonalFoodId);
      }
    },
    [activeSeasonalFoodId, items, onSelectItem, pageWidth],
  );

  const handleScrollToIndexFailed = useCallback(
    ({ index }: { index: number }) => {
      listRef.current?.scrollToOffset({
        offset: Math.max(index, 0) * pageWidth,
        animated: true,
      });
    },
    [pageWidth],
  );

  const renderItem = useCallback(
    ({ item }: { item: SeasonalHeroItem }) => {
      const statItems = item.stats.slice(0, 3);

      return (
        <View style={[styles.cardPage, { width: pageWidth }]}>
          <View style={[styles.card, { width: cardWidth, backgroundColor: item.accentSoftColor }]}>
            <View style={styles.cardNoise} pointerEvents="none" />
            {item.cardImageUrl ? (
              <Image
                source={{ uri: item.cardImageMobileUrl || item.cardImageUrl, cache: 'force-cache' }}
                resizeMode="cover"
                style={styles.heroImage}
              />
            ) : null}

            <View style={styles.topRow}>
              <View style={styles.copyBlock}>
                <View style={styles.eyebrowRow}>
                  <View style={[styles.eyebrowDot, { backgroundColor: item.accentColor }]} />
                  <Text style={styles.eyebrow}>{item.monthLabel}</Text>
                </View>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.subcopy}>{item.subcopy}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              {statItems.map((stat) => (
                <View key={`${item.seasonalFoodId}-${stat.label}`} style={styles.statPill}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    },
    [cardWidth, pageWidth],
  );

  return (
    <View style={styles.sectionShell}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => `${item.seasonalFoodId}`}
        renderItem={renderItem}
        horizontal
        bounces={false}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={pageWidth}
        scrollEnabled={items.length > 1}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        contentContainerStyle={styles.listContent}
      />

      {items.length > 1 ? (
        <View style={styles.paginationWrap}>
          <Text style={styles.paginationHint}>좌우로 넘겨 다른 제철 재료 보기</Text>
          <View style={styles.paginationDots}>
            {items.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <TouchableOpacity
                  key={`seasonal-dot-${item.seasonalFoodId}`}
                  activeOpacity={0.8}
                  onPress={() => handlePressIndicator(index)}
                  style={[
                    styles.paginationDot,
                    isActive && styles.paginationDotActive,
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default memo(SeasonalHeroSection);

const styles = StyleSheet.create({
  sectionShell: {
    marginTop: 2,
    marginBottom: 2,
  },
  listContent: {
    paddingRight: CARD_GAP,
  },
  cardPage: {
    paddingRight: CARD_GAP,
  },
  card: {
    position: 'relative',
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  cardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  heroImage: {
    position: 'absolute',
    right: -20,
    top: 0,
    bottom: 0,
    width: '42%',
    opacity: 0.22,
    borderTopRightRadius: 34,
    borderBottomRightRadius: 34,
  },
  topRow: {
    alignItems: 'flex-start',
  },
  copyBlock: {
    zIndex: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  foodName: {
    fontSize: 36,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -1.1,
    color: HOME_COLORS.textPrimary,
  },
  subcopy: {
    marginTop: 6,
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 20,
    color: HOME_COLORS.textMutedAlt,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    zIndex: 2,
  },
  statPill: {
    minWidth: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.textMutedAlt,
  },
  statValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  paginationWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  paginationHint: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.textMutedAlt,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(42,34,24,0.18)',
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: HOME_COLORS.textPrimary,
  },
});
