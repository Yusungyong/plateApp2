import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { spacing } from '../../../styles/theme';
import AuthTextInput from '../../../components/common/AuthTextInput';

type Props = {
  password: string;
  passwordConfirm: string;
  onChangePassword: (text: string) => void;
  onChangePasswordConfirm: (text: string) => void;
  pwInputRef: React.RefObject<TextInput>;
  pwConfirmInputRef: React.RefObject<TextInput>;
  onValidityChange?: (valid: boolean) => void; // ✅ 비밀번호 전체 유효 여부
};

const SignupStepPassword: React.FC<Props> = ({
  password,
  passwordConfirm,
  onChangePassword,
  onChangePasswordConfirm,
  pwInputRef,
  pwConfirmInputRef,
  onValidityChange,
}) => {
  const trimmedPw = password;
  const trimmedConfirm = passwordConfirm;

  const isTooShort =
    trimmedPw.length > 0 && trimmedPw.length < 8;

  const isMismatch =
    trimmedPw.length >= 8 &&
    trimmedConfirm.length > 0 &&
    trimmedPw !== trimmedConfirm;

  const isValid =
    trimmedPw.length >= 8 &&
    trimmedConfirm.length > 0 &&
    trimmedPw === trimmedConfirm;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  return (
    <View style={styles.stepContainer}>
      <AuthTextInput
        ref={pwInputRef}
        label="비밀번호"
        value={password}
        onChangeText={onChangePassword}
        placeholder="영문, 숫자 조합 8자 이상"
        secureTextEntry
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          pwConfirmInputRef.current?.focus();
        }}
      />

      <AuthTextInput
        ref={pwConfirmInputRef}
        label="비밀번호 확인"
        value={passwordConfirm}
        onChangeText={onChangePasswordConfirm}
        placeholder="비밀번호를 다시 입력해주세요"
        secureTextEntry
        returnKeyType="done"
      />

      {isTooShort && (
        <Text style={styles.errorText}>
          비밀번호는 최소 8자 이상이어야 해요.
        </Text>
      )}

      {isMismatch && (
        <Text style={styles.errorText}>
          비밀번호가 서로 일치하지 않아요.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    marginTop: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: '#E64545',
  },
});

export default SignupStepPassword;
