// src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreenContainer from '../screens/auth/LoginScreenContainer';
import SignupScreenContainer from '../screens/auth/SignupScreenContainer';
import ForgotPasswordEmailScreen from '../screens/auth/forgetPassword/ForgotPasswordEmailScreen';
import ForgotPasswordCodeScreen from '../screens/auth/forgetPassword/ForgotPasswordCodeScreen';
import ForgotPasswordResetScreen from '../screens/auth/forgetPassword/ForgotPasswordResetScreen';
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPasswordEmail: undefined;
  ForgotPasswordCode: { email: string };
  ForgotPasswordReset: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreenContainer} />
      <Stack.Screen name="Signup" component={SignupScreenContainer} />

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
