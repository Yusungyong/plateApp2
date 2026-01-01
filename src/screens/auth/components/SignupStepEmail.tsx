import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { spacing } from '../../../styles/theme';
import AuthTextInput from '../../../components/common/AuthTextInput';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  inputRef: React.RefObject<TextInput>;
  onSubmitEditing: () => void;
  onValidityChange?: (valid: boolean) => void; // ✅ 이메일 유효 여부 부모로 전달
};

const SignupStepEmail: React.FC<Props> = ({
  value,
  onChangeText,
  inputRef,
  onSubmitEditing,
  onValidityChange,
}) => {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const trimmed = value.trim();

    let valid = true;

    // 1) 빈 값
    if (!trimmed) valid = false;

    // 2) 공백 포함 여부
    if (/\s/.test(trimmed)) valid = false;

    // 3) 한글 포함 여부 (자모 + 완성형)
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(trimmed)) valid = false;

    // 4) 기본 이메일 형식 체크
    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmed)) valid = false;

    onValidityChange?.(valid);

    // 값이 있고(valid = false)일 때만 에러 표시
    setShowError(!!trimmed && !valid);
  }, [value, onValidityChange]);

  return (
    <View style={styles.stepContainer}>
      <AuthTextInput
        ref={inputRef}
        label="아이디 (이메일)"
        value={value}
        onChangeText={onChangeText}
        placeholder="예: plate@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
      />
      {showError && (
        <Text style={styles.errorText}>
          공백이나 한글이 없는 올바른 이메일 주소를 입력해주세요.
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

export default SignupStepEmail;
