import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { SeasonalHeroItem } from '../types';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';

type SeasonalMenuHubProps = {
  item: SeasonalHeroItem;
  totalFoods: number;
  onPressOverview: () => void;
  onPressRecipe: () => void;
  onPressMap: () => void;
};

const SeasonalMenuHub: React.FC<SeasonalMenuHubProps> = ({
  item,
  totalFoods,
  onPressOverview,
  onPressRecipe,
  onPressMap,
}) => {
  const briefStats = useMemo(
    () => [
      { label: '카테고리', value: item.category || '-' },
      { label: item.seasonalTerm ? '절기' : '월', value: item.seasonalTerm || `${item.month}월` },
      { label: '항목', value: `${totalFoods}개` },
    ],
    [item.category, item.month, item.seasonalTerm, totalFoods],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>제철 메뉴</Text>
      <Text style={styles.sectionDescription}>
        {item.name}을 중심으로 바로 이동할 수 있는 메뉴만 모았습니다.
      </Text>

      <View style={styles.cardGrid}>
        <TouchableOpacity activeOpacity={0.9} style={styles.menuCardLarge} onPress={onPressOverview}>
          <View style={[styles.menuIconWrap, { backgroundColor: item.accentSoftColor }]}>
            <Icon name="leaf-outline" size={20} color={item.accentColor} />
          </View>
          <Text style={styles.menuTitle}>이번 달 재료</Text>
          <Text style={styles.menuDescription} numberOfLines={3}>
            {item.monthLabel} 기준으로 {item.name}과 함께 보여줄 제철 음식 목록을 먼저 봅니다.
          </Text>
          <View style={styles.menuFooter}>
            <Text style={styles.menuCta}>재료 보기</Text>
            <Icon name="arrow-forward" size={15} color={HOME_COLORS.textPrimary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={styles.menuCard} onPress={onPressRecipe}>
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconWrap, styles.recipeIconWrap]}>
              <Icon name="restaurant-outline" size={20} color={HOME_COLORS.action} />
            </View>
            <Text style={styles.menuTitle}>제철 레시피</Text>
          </View>
          <Text style={styles.menuDescription} numberOfLines={3}>
            {item.name}와 어울리는 레시피 화면으로 바로 이동합니다.
          </Text>
          <View style={styles.menuFooter}>
            <Text style={styles.menuCta}>레시피 열기</Text>
            <Icon name="arrow-forward" size={15} color={HOME_COLORS.textPrimary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={styles.menuCard} onPress={onPressMap}>
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconWrap, styles.mapIconWrap]}>
              <Icon name="map-outline" size={20} color={HOME_COLORS.action} />
            </View>
            <Text style={styles.menuTitle}>제철 가게</Text>
          </View>
          <Text style={styles.menuDescription} numberOfLines={3}>
            {item.name}를 즐길 수 있는 가게 탐색으로 이동합니다.
          </Text>
          <View style={styles.menuFooter}>
            <Text style={styles.menuCta}>지도 열기</Text>
            <Icon name="arrow-forward" size={15} color={HOME_COLORS.textPrimary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.briefCard}>
        <Text style={styles.briefEyebrow}>이번 달 한눈에</Text>
        <View style={styles.briefStatsRow}>
          {briefStats.map((stat) => (
            <View key={`${item.seasonalFoodId}-${stat.label}`} style={styles.briefStat}>
              <Text style={styles.briefStatLabel}>{stat.label}</Text>
              <Text style={styles.briefStatValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default memo(SeasonalMenuHub);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: HOME_COLORS.textMutedAlt,
  },
  cardGrid: {
    marginTop: 12,
    gap: 10,
  },
  menuCardLarge: {
    borderRadius: HOME_RADII.card,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  menuCard: {
    borderRadius: HOME_RADII.cardSmall,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recipeIconWrap: {
    backgroundColor: '#F6EEDF',
    marginRight: 10,
    marginBottom: 0,
  },
  mapIconWrap: {
    backgroundColor: '#ECF1F8',
    marginRight: 10,
    marginBottom: 0,
  },
  menuTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  menuDescription: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    color: HOME_COLORS.textMutedAlt,
  },
  menuFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuCta: {
    fontSize: 13,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  briefCard: {
    marginTop: 10,
    borderRadius: HOME_RADII.cardSmall,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: HOME_COLORS.surfaceSoft,
  },
  briefEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.textSecondary,
  },
  briefStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  briefStat: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  briefStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.textMutedAlt,
  },
  briefStatValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '900',
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
});
