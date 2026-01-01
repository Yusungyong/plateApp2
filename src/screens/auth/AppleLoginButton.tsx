// src/components/auth/AppleLoginButton.tsx
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import { useAuth } from '../../auth/AuthProvider';

const AppleLoginButton = () => {
  const { socialLogin } = useAuth();

  const onPress = useCallback(async () => {
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });

      const { identityToken, authorizationCode, user: appleUser } = response;

      if (identityToken) {
        await socialLogin('apple', {
          identityToken,
          authorizationCode,
          user: appleUser,
        });
      } else {
        console.warn('Apple Sign-In: identityToken 이 없습니다.');
      }
    } catch (err: any) {
      if (err?.code === appleAuth.Error.CANCELED) return;
      console.warn('Apple login error:', err);
    }
  }, [socialLogin]);

  return (
    <AppleButton
      buttonType={AppleButton.Type.SIGN_IN}
      buttonStyle={AppleButton.Style.BLACK}
      cornerRadius={8}
      style={styles.button}
      onPress={onPress}
    />
  );
};

export default AppleLoginButton;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 44,
    marginTop: 12,
  },
});
