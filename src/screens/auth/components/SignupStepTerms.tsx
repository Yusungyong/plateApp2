import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../styles/theme';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

type Props = {
  agreeService: boolean;
  agreePrivacy: boolean;
  onToggleAll: () => void;
  onToggleService: () => void;
  onTogglePrivacy: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onValidityChange?: (valid: boolean) => void; // ✅ 유효성 결과 부모로 전달
};

const SignupStepTerms: React.FC<Props> = ({
  agreeService,
  agreePrivacy,
  onToggleAll,
  onToggleService,
  onTogglePrivacy,
  onOpenTerms,
  onOpenPrivacy,
  onValidityChange,
}) => {
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );
  const isRequiredAgreed = agreeService && agreePrivacy;
  const showError =
    !isRequiredAgreed && (agreeService || agreePrivacy); // 한쪽이라도 체크했다가 풀리면 안내

  // 스텝의 유효 여부를 부모로 올림
  React.useEffect(() => {
    onValidityChange?.(isRequiredAgreed);
  }, [isRequiredAgreed, onValidityChange]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.agreementBox}>
        <TouchableOpacity
          style={styles.agreeRow}
          onPress={onToggleAll}
          hitSlop={HIT_SLOP}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              isRequiredAgreed && styles.checkboxChecked,
            ]}
          >
            {isRequiredAgreed && (
              <Text style={styles.checkboxMark}>✓</Text>
            )}
          </View>
          <Text style={styles.agreeAllText}>전체 동의</Text>
        </TouchableOpacity>

        <View style={styles.agreeItems}>
          <View style={styles.agreeRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                agreeService && styles.checkboxChecked,
              ]}
              onPress={onToggleService}
              hitSlop={HIT_SLOP}
              activeOpacity={0.8}
            >
              {agreeService && (
                <Text style={styles.checkboxMark}>✓</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.agreeText}>
              (필수) 서비스 이용약관
            </Text>
            {onOpenTerms && (
              <TouchableOpacity
                onPress={onOpenTerms}
                hitSlop={HIT_SLOP}
              >
                <Text style={styles.linkSmall}>보기</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.agreeRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                agreePrivacy && styles.checkboxChecked,
              ]}
              onPress={onTogglePrivacy}
              hitSlop={HIT_SLOP}
              activeOpacity={0.8}
            >
              {agreePrivacy && (
                <Text style={styles.checkboxMark}>✓</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.agreeText}>
              (필수) 개인정보 처리방침
            </Text>
            {onOpenPrivacy && (
              <TouchableOpacity
                onPress={onOpenPrivacy}
                hitSlop={HIT_SLOP}
              >
                <Text style={styles.linkSmall}>보기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showError && (
          <Text style={styles.errorText}>
            필수 약관에 모두 동의해야 다음 단계로 진행할 수 있어요.
          </Text>
        )}
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
    stepContainer: {
      marginTop: spacing.sm,
    },
    agreementBox: {
      gap: spacing.md,
    },
    agreeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      backgroundColor: colors.background,
    },
    checkboxChecked: {
      borderColor: colors.brandPrimary,
      backgroundColor: colors.brandPrimary,
    },
    checkboxMark: {
      fontSize: 13,
      color: '#FFFFFF',
    },
    agreeAllText: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    agreeItems: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    agreeText: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      marginRight: spacing.sm,
    },
    linkSmall: {
      fontSize: 12,
      color: colors.brandPrimary,
      textDecorationLine: 'underline',
    },
    errorText: {
      marginTop: spacing.xs,
      fontSize: 12,
      color: '#E64545',
    },
  });

export default SignupStepTerms;
