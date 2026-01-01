// src/screens/auth/ForgotPasswordResetScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AuthTextInput from '../../../components/common/AuthTextInput';
import PrimaryButton from '../../../components/common/PrimaryButton';
import { colors, spacing, typography } from '../../../styles/theme';
import api from '../../../api/axiosInstance';

const ForgotPasswordResetScreen = ({ route, navigation }: any) => {
  const { email } = route.params;

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);

  // SignupStepPassword 정책과 동일한 체크
  const trimmedPw = pw1;
  const trimmedConfirm = pw2;

  const isTooShort = trimmedPw.length > 0 && trimmedPw.length < 8;

  const isMismatch =
    trimmedPw.length >= 8 &&
    trimmedConfirm.length > 0 &&
    trimmedPw !== trimmedConfirm;

  const isValid =
    trimmedPw.length >= 8 &&
    trimmedConfirm.length > 0 &&
    trimmedPw === trimmedConfirm;

  const handleResetPassword = useCallback(async () => {
    if (!isValid) {
      if (isTooShort) {
        Alert.alert('알림', '비밀번호는 최소 8자 이상이어야 해요.');
        return;
      }
      if (isMismatch) {
        Alert.alert('알림', '비밀번호가 서로 일치하지 않아요.');
        return;
      }
      Alert.alert('알림', '비밀번호를 올바르게 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/reset-password', {
        email,
        newPassword: pw1,
      });

      Alert.alert('완료', '비밀번호가 성공적으로 변경되었어요.', [
        { text: '로그인하러 가기', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '비밀번호 변경 중 오류가 발생했습니다.';
      Alert.alert('오류', String(msg));
    } finally {
      setLoading(false);
    }
  }, [pw1, pw2, isValid, isMismatch, isTooShort, email, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>새 비밀번호 설정</Text>

          <AuthTextInput
            label="비밀번호"
            value={pw1}
            onChangeText={setPw1}
            placeholder="영문, 숫자 조합 8자 이상"
            secureTextEntry
          />

          <AuthTextInput
            label="비밀번호 확인"
            value={pw2}
            onChangeText={setPw2}
            placeholder="비밀번호를 다시 입력해주세요"
            secureTextEntry
          />

          {isTooShort && (
            <Text style={styles.errorText}>비밀번호는 최소 8자 이상이어야 해요.</Text>
          )}

          {isMismatch && (
            <Text style={styles.errorText}>비밀번호가 서로 일치하지 않아요.</Text>
          )}

          <PrimaryButton
            title="비밀번호 변경"
            onPress={handleResetPassword}
            disabled={loading || !isValid}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordResetScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.h1, marginBottom: spacing.lg },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: '#E64545',
  },
});
