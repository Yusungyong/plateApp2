import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../styles/theme';

type Props = {
  step: number;
  subtitle: string;
  title?: string;
  totalSteps?: number;
};

const SignupHeader: React.FC<Props> = ({
  step,
  subtitle,
  title = '회원가입',
  totalSteps = 4,
}) => {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );
  return (
    <View style={styles.header}>
      <Text style={styles.titleText}>{title}</Text>
      <Text style={styles.subText}>{subtitle}</Text>

      <View style={styles.stepIndicatorRow}>
        {Array.from({ length: totalSteps }, (_, i) => i).map(i => {
          const active = i === step;
          return (
            <View
              key={i}
              style={[
                styles.stepDot,
                active && styles.stepDotActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const createStyles = ({
  colors,
  spacing,
  typography,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
}) =>
  StyleSheet.create({
    header: {
      marginBottom: spacing.lg,
    },
    titleText: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subText: {
      marginTop: spacing.sm,
      ...typography.subtitle,
      color: colors.textSecondary,
    },
    stepIndicatorRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.divider,
    },
    stepDotActive: {
      width: 18,
      borderRadius: 9,
      backgroundColor: colors.brandPrimary,
    },
  });

export default SignupHeader;
