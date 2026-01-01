// src/components/common/AuthTextInput.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../styles/theme';

interface AuthTextInputProps extends TextInputProps {
  label: string;
}

const AuthTextInput: React.FC<AuthTextInputProps> = ({
  label,
  style,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        <TextInput
          {...inputProps}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
