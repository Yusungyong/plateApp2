import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { fetchRecipeDetail, RecipeDetail } from '../../api/recipeApi';
import { useTheme } from '../../styles/theme';

type DetailRoute = RouteProp<RootStackParamList, 'RecipeDetail'>;

const RecipeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchRecipeDetail(route.params.recipeId);
      setDetail(data);
      setError(null);
    } catch {
      setError('레시피 상세를 불러오지 못했어요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.recipeId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (loading) {
    return (
      <AppLayout title="레시피 상세" showBack showNotification={false} onPressBack={() => navigation.goBack()}>
        <View style={styles.centerBox}>
          <ActivityIndicator />
        </View>
      </AppLayout>
    );
  }

  if (error || !detail) {
    return (
      <AppLayout title="레시피 상세" showBack showNotification={false} onPressBack={() => navigation.goBack()}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error ?? '데이터가 없어요.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setLoading(true);
            load().catch(() => {});
          }}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="레시피 상세" showBack showNotification={false} onPressBack={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          load().catch(() => {});
        }} />}
      >
        <Text style={styles.title}>{detail.title}</Text>
        {detail.summary ? <Text style={styles.summary}>{detail.summary}</Text> : null}
        <View style={styles.metaRow}>
          {typeof detail.cookTimeMin === 'number' ? <Text style={styles.metaText}>조리 {detail.cookTimeMin}분</Text> : null}
          {detail.difficulty ? <Text style={styles.metaText}>난이도 {detail.difficulty}</Text> : null}
          {typeof detail.servings === 'number' ? <Text style={styles.metaText}>{detail.servings}인분</Text> : null}
        </View>

        {detail.tags?.length ? (
          <View style={styles.tagRow}>
            {detail.tags.map((tag) => (
              <View key={tag.id} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {detail.ingredients?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>재료</Text>
            {detail.ingredients.map((item, idx) => (
              <View style={styles.row} key={`${item.name}-${idx}`}>
                <Text style={styles.rowLeft}>{item.name}</Text>
                <Text style={styles.rowRight}>{item.quantity ?? '-'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {detail.steps?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>조리 순서</Text>
            {detail.steps
              .slice()
              .sort((a, b) => a.stepNo - b.stepNo)
              .map((step) => (
                <View style={styles.stepCard} key={step.stepNo}>
                  <Text style={styles.stepTitle}>STEP {step.stepNo}</Text>
                  {step.title ? <Text style={styles.stepSubTitle}>{step.title}</Text> : null}
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              ))}
          </View>
        ) : null}
      </ScrollView>
    </AppLayout>
  );
};

export default RecipeDetailScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    retryButton: {
      marginTop: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    retryText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    summary: {
      marginTop: 8,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    metaRow: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.backgroundSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    tagRow: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tagChip: {
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    rowLeft: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
      paddingRight: 8,
    },
    rowRight: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    stepCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.backgroundSoft,
    },
    stepTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPrimary,
    },
    stepSubTitle: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    stepDescription: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
