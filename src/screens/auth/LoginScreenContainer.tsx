// src/screens/Auth/LoginScreenContainer.tsx
import React from 'react';
import { Alert } from 'react-native';
import LoginScreen from './LoginScreen';
import { useAuth } from '../../auth/AuthProvider';

const LoginScreenContainer = ({ navigation }: any) => {
  const { login } = useAuth();

  const handleLogin = async (id: string, pw: string) => {
    const ok = await login(id, pw);
    if (!ok) {
      Alert.alert('로그인 실패', '아이디 또는 비밀번호를 확인해주세요.');
      return;
    }
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onSignupPress={() => {
        navigation.navigate('Signup');
      }}
      onForgotPasswordPress={() => {
        // 🔹 비밀번호 찾기 > 이메일 검증 페이지로 이동
        navigation.navigate('ForgotPasswordEmail');
      }}
      onSocialLoginPress={provider => {
        console.log('social login:', provider);
      }}
    />
  );
};

export default LoginScreenContainer;
