// src/screens/Auth/ForgotPasswordCodeScreen.tsx
import React, { useState, useCallback } from 'react';
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

const ForgotPasswordCodeScreen = ({ route, navigation }: any) => {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();

    if (!trimmed || trimmed.length !== 6) {
      Alert.alert('알림', '6자리 인증 코드를 정확히 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 서버에서 코드 검증
      const res = await api.post('/email/verify', {
        email,
        verificationCode: trimmed,
      });

      Alert.alert('성공', '인증이 완료되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.navigate('ForgotPasswordReset', { email });
          },
        },
      ]);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        '인증 코드가 올바르지 않습니다.';
      Alert.alert('실패', String(msg));
    } finally {
      setLoading(false);
    }
  }, [code, email, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>인증 코드 확인</Text>
          <Text style={styles.description}>
            이메일({email})로 전달된 6자리 인증 코드를 입력해주세요.
          </Text>

          <AuthTextInput
            label="인증 코드"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <PrimaryButton
            title="다음"
            onPress={handleVerify}
            disabled={loading}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordCodeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.h1, marginBottom: spacing.sm },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
});
