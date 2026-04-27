// src/components/common/PrimaryButton.tsx
import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../styles/theme';

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled,
  loading,
  style,
}) => {
  const isDisabled = disabled || loading;
  const { colors, radius, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, radius, spacing, typography }),
    [colors, radius, spacing, typography],
  );

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const createStyles = ({
  colors,
  radius,
  spacing,
  typography,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
}) =>
  StyleSheet.create({
    button: {
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.brandPrimary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonDisabled: {
      backgroundColor: colors.brandDisabled,
    },
    text: {
      color: '#FFFFFF',
      ...typography.button,
    },
  });

export default PrimaryButton;
