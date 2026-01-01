import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { spacing } from '../../../styles/theme';
import AuthTextInput from '../../../components/common/AuthTextInput';

type Props = {
  nickname: string;
  onChangeNickname: (text: string) => void;
  inputRef: React.RefObject<TextInput>;
  onSubmitEditing: () => void;
  onValidityChange?: (valid: boolean) => void; // ✅ 닉네임 유효 여부
};

const SignupStepNickname: React.FC<Props> = ({
  nickname,
  onChangeNickname,
  inputRef,
  onSubmitEditing,
  onValidityChange,
}) => {
  const trimmed = nickname.trim();
  const isValid = trimmed.length > 0;
  const showError = !isValid && nickname.length > 0;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  return (
    <View style={styles.stepContainer}>
      <AuthTextInput
        ref={inputRef}
        label="닉네임"
        value={nickname}
        onChangeText={onChangeNickname}
        placeholder="앱에서 표시될 이름"
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
      />
      {showError && (
        <Text style={styles.errorText}>
          닉네임을 한 글자 이상 입력해주세요.
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

export default SignupStepNickname;
