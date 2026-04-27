// src/screens/Auth/ForgotPasswordEmailScreen.tsx
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

const ForgotPasswordEmailScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors, spacing, typography } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, spacing, typography }),
    [colors, spacing, typography],
  );

  const handleNext = useCallback(async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    // 한글/공백 방지
    const hasKorean = /[ㄱ-ㅎ가-힣]/.test(trimmed);
    if (hasKorean || /\s/.test(trimmed)) {
      Alert.alert('알림', '이메일 형식을 다시 확인해주세요.');
      return;
    }

    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(trimmed)) {
      Alert.alert('알림', '유효한 이메일 주소를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/email/send-verification', {
        email: trimmed,
      });

      const data = response.data;
      const message =
        (data && data.message) || '인증 코드가 이메일로 전송되었습니다.';

      Alert.alert('안내', message, [
        {
          text: '확인',
          onPress: () => {
            // 🔥 변경된 부분: 다음 단계 화면으로 이동
            navigation.navigate('ForgotPasswordCode', {
              email: trimmed,
            });
          },
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data ||
        '이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

      Alert.alert('오류', String(message));
    } finally {
      setLoading(false);
    }
  }, [email, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>비밀번호 재설정</Text>
          <Text style={styles.description}>
            접시에 가입한 이메일을 입력하면{'\n'}
            비밀번호 재설정을 위한 인증 코드를 보내드릴게요.
          </Text>

          <AuthTextInput
            label="이메일"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttonArea}>
            <PrimaryButton
              title="인증 메일 보내기"
              onPress={handleNext}
              disabled={loading}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordEmailScreen;

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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardArea: {
      flex: 1,
    },
    inner: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    title: {
      ...typography.h1,
      marginBottom: spacing.sm,
      color: colors.textPrimary,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    buttonArea: {
      marginTop: spacing.lg,
    },
  });
