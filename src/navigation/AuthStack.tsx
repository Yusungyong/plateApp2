// src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreenContainer from '../screens/auth/LoginScreenContainer';
import SignupScreenContainer from '../screens/auth/SignupScreenContainer';
import SocialSignupScreenContainer from '../screens/auth/SocialSignupScreenContainer';
import ForgotPasswordEmailScreen from '../screens/auth/forgetPassword/ForgotPasswordEmailScreen';
import ForgotPasswordCodeScreen from '../screens/auth/forgetPassword/ForgotPasswordCodeScreen';
import ForgotPasswordResetScreen from '../screens/auth/forgetPassword/ForgotPasswordResetScreen';
import LegalDocumentScreen from '../screens/shared/LegalDocumentScreen';
import type { LegalDocumentType } from '../config/legal';
import type { SocialProvider } from '../auth/AuthProvider';

export type AuthStackParamList = {
  Login: undefined;
  SignIn: undefined;
  Signup: undefined;
  SocialSignup: {
    provider: SocialProvider;
    signupToken: string;
    email?: string | null;
    nickname?: string | null;
    providerUserId?: string | null;
  };
  LegalDocument: { documentType: LegalDocumentType };
  ForgotPasswordEmail: undefined;
  ForgotPasswordCode: { email: string };
  ForgotPasswordReset: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreenContainer} />
      <Stack.Screen name="SignIn" component={LoginScreenContainer} />
      <Stack.Screen name="Signup" component={SignupScreenContainer} />
      <Stack.Screen name="SocialSignup" component={SocialSignupScreenContainer} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />

      {/* 비밀번호 재설정 플로우 */}
      <Stack.Screen
        name="ForgotPasswordEmail"
        component={ForgotPasswordEmailScreen}
      />
      <Stack.Screen
        name="ForgotPasswordCode"
        component={ForgotPasswordCodeScreen}
      />
      <Stack.Screen
        name="ForgotPasswordReset"
        component={ForgotPasswordResetScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
