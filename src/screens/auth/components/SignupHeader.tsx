import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../styles/theme';

const BRAND_COLOR = '#FF7F50';

type Props = {
  step: number;      // 0~3
  subtitle: string;
};

const SignupHeader: React.FC<Props> = ({ step, subtitle }) => {
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

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  titleText: {
    ...typography.title,
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
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  stepDotActive: {
    width: 18,
    borderRadius: 9,
    backgroundColor: BRAND_COLOR,
  },
});

export default SignupHeader;
