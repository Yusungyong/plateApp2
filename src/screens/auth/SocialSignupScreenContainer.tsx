import React from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SignupScreen from './SignupScreen';
import { useAuth } from '../../auth/AuthProvider';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SocialSignup'>;

const providerLabelMap: Record<Props['route']['params']['provider'], string> = {
  apple: 'Apple',
  google: 'Google',
  kakao: '카카오',
};

const SocialSignupScreenContainer: React.FC<Props> = ({ navigation, route }) => {
  const { completeSocialSignup } = useAuth();
  const { signupToken, email, nickname, provider } = route.params;

  const handleSubmit = async ({
    id,
    nickname: nextNickname,
    agreePrivacy,
    agreeService,
  }: {
    id: string;
    nickname: string;
    agreeService: boolean;
    agreePrivacy: boolean;
  }) => {
    try {
      await completeSocialSignup({
        signupToken,
        email: id,
        nickname: nextNickname,
        agreeService,
        agreePrivacy,
      });
    } catch (error: any) {
      const message =
        error?.message ||
        '소셜 회원가입을 완료하지 못했어요. 잠시 후 다시 시도해주세요.';
      Alert.alert('회원가입 실패', String(message));
    }
  };

  return (
    <SignupScreen
      mode="social"
      title={`${providerLabelMap[provider]} 회원가입`}
      initialValues={{
        id: email ?? '',
        nickname: nickname ?? '',
      }}
      onSubmit={handleSubmit}
      onBackToLoginPress={() => navigation.goBack()}
      onOpenTerms={() => {
        navigation.navigate('LegalDocument', { documentType: 'terms' });
      }}
      onOpenPrivacy={() => {
        navigation.navigate('LegalDocument', { documentType: 'privacy' });
      }}
    />
  );
};

export default SocialSignupScreenContainer;
