import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../styles/theme';

type Props = {
  step: number;      // 0~3
  subtitle: string;
};

const SignupHeader: React.FC<Props> = ({ step, subtitle }) => {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );
  return (
    <View style={styles.header}>
      <Text style={styles.titleText}>회원가입</Text>
      <Text style={styles.subText}>{subtitle}</Text>

      <View style={styles.stepIndicatorRow}>
        {[0, 1, 2, 3].map(i => {
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
