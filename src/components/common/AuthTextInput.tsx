// src/components/common/AuthTextInput.tsx
import React, { forwardRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../styles/theme';

interface AuthTextInputProps extends TextInputProps {
  label: string;
}

const AuthTextInput = forwardRef<TextInput, AuthTextInputProps>(({
  label,
  style,
  onFocus,
  onBlur,
  ...inputProps
}, ref) => {
  const [focused, setFocused] = useState(false);
  const { colors, radius, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, radius, spacing, typography }),
    [colors, radius, spacing, typography],
  );

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        <TextInput
          ref={ref}
          {...inputProps}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </View>
    </View>
  );
});

AuthTextInput.displayName = 'AuthTextInput';

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
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      marginBottom: spacing.xs,
    },
    inputWrapper: {
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.backgroundSoft, // 연한 회색 배경
      borderWidth: 1,
      borderColor: 'transparent',
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    inputWrapperFocused: {
      backgroundColor: colors.background, // 포커스 시 살짝 더 밝게
      borderColor: colors.brandPrimary,
    },
    input: {
      fontSize: 16,
      color: colors.textPrimary,
    },
  });

export default AuthTextInput;
