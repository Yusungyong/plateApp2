// src/screens/Auth/SignupScreenContainer.tsx
import React from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import SignupScreen from './SignupScreen';
import api from '../../api/axiosInstance'; // 🔹 실제 경로 맞게 수정
import type { AuthStackParamList } from '../../navigation/AuthStack';

type SignupScreenContainerProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

const SignupScreenContainer: React.FC<SignupScreenContainerProps> = ({ navigation }) => {
  const handleSubmit = async ({
    id,
    password,
    nickname,
    agreePrivacy: _agreePrivacy,
    agreeService: _agreeService,
  }: {
    id: string;
    password?: string;
    nickname: string;
    agreeService: boolean;
    agreePrivacy: boolean;
  }) => {
    try {
      // 서버에서 email로 받으니까 필드 이름 맞춰서 전송
      const payload = {
        email: id,
        password,
        nickname,
      };

      await api.post('/api/auth/signup', payload);

      Alert.alert('회원가입 완료', '이제 로그인해보세요!', [
        {
          text: '확인',
          onPress: () => navigation.goBack(), // 🔹 Login 화면으로
        },
      ]);
    } catch (error: any) {
      // 서버에서 에러 메시지를 내려주고 있다면 그걸 우선 사용
      const message =
        error?.response?.data?.message ||
        error?.response?.data ||
        '회원가입 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';

      Alert.alert('회원가입 실패', String(message));
    }
  };

  return (
    <SignupScreen
      onSubmit={handleSubmit}
      onBackToLoginPress={() => {
        navigation.goBack();
      }}
      onOpenTerms={() => {
        navigation.navigate('LegalDocument', { documentType: 'terms' });
      }}
      onOpenPrivacy={() => {
        navigation.navigate('LegalDocument', { documentType: 'privacy' });
      }}
    />
  );
};

export default SignupScreenContainer;
