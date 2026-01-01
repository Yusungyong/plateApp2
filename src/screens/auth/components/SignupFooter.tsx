import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import PrimaryButton from '../../../components/common/PrimaryButton';
import { colors, spacing, typography, radius } from '../../../styles/theme';

const BRAND_COLOR = '#FF7F50';
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

type Props = {
  step: number;
  canGoNext: boolean;
  isSubmitting: boolean;
  isLastStep: boolean;
  onPrev: () => void;
  onNext: () => void;
  onBackToLogin?: () => void;
};

const SignupFooter: React.FC<Props> = ({
  step,
  canGoNext,
  isSubmitting,
  isLastStep,
  onPrev,
  onNext,
  onBackToLogin,
}) => {
  const nextButtonLabel = isLastStep
    ? isSubmitting
      ? '가입 중...'
      : '회원가입 완료'
    : '다음';

  return (
    <View style={styles.bottomArea}>
      <View style={styles.buttonRow}>
        {step > 0 ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onPrev}
            hitSlop={HIT_SLOP}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>이전</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <PrimaryButton
            title={nextButtonLabel}
            onPress={onNext}
            disabled={!canGoNext}
            loading={isLastStep && isSubmitting}
          />
        </View>
      </View>

      <View style={styles.bottomLoginRow}>
        <Text style={styles.bottomText}>이미 계정이 있으신가요?</Text>
        {onBackToLogin && (
          <TouchableOpacity
            onPress={onBackToLogin}
            hitSlop={HIT_SLOP}
          >
            <Text style={styles.bottomLoginLink}>로그인</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomArea: {
    marginTop: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,127,80,0.35)',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: BRAND_COLOR,
  },
  bottomLoginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    alignItems: 'center',
  },
  bottomText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  bottomLoginLink: {
    ...typography.bodySmall,
    color: BRAND_COLOR,
    fontWeight: '600',
  },
});

export default SignupFooter;
