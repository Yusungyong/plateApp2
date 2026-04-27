// src/screens/Auth/ForgotPasswordCodeScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthTextInput from '../../../components/common/AuthTextInput';
import PrimaryButton from '../../../components/common/PrimaryButton';
import { useTheme } from '../../../styles/theme';
import api from '../../../api/axiosInstance';

const ForgotPasswordCodeScreen = ({ route, navigation }: any) => {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();

    if (!trimmed || trimmed.length !== 6) {
      Alert.alert('알림', '6자리 인증 코드를 정확히 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 서버에서 코드 검증
      await api.post('/api/email/verify', {
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
        style={styles.keyboardArea}
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
    container: { flex: 1, backgroundColor: colors.background },
    keyboardArea: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    title: { ...typography.h1, marginBottom: spacing.sm, color: colors.textPrimary },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
  });
