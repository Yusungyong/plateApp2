// src/screens/Auth/LoginScreenContainer.tsx
import React from 'react';
import { Alert } from 'react-native';
import LoginScreen from './LoginScreen';
import { useAuth, type SocialSignupRequired } from '../../auth/AuthProvider';

const LoginScreenContainer = ({ navigation }: { navigation: any }) => {
  const { login } = useAuth();

  const handleLogin = async (id: string, pw: string) => {
    try {
      const ok = await login(id, pw);
      if (!ok) {
        Alert.alert('로그인 실패', '아이디 또는 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '잠시 후 다시 시도해주세요.';
      Alert.alert('로그인 실패', message);
    }
  };

  const handleSocialSignupRequired = (payload: SocialSignupRequired) => {
    navigation.navigate('SocialSignup', payload);
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onContinueAsGuest={() => navigation.navigate('Home')}
      onSignupPress={() => {
        navigation.navigate('Signup');
      }}
      onForgotPasswordPress={() => {
        // 🔹 비밀번호 찾기 > 이메일 검증 페이지로 이동
        navigation.navigate('ForgotPasswordEmail');
      }}
      onSocialSignupRequired={handleSocialSignupRequired}
      onSocialLoginPress={(_provider: 'apple' | 'kakao' | 'google') => {}}
    />
  );
};

export default LoginScreenContainer;
