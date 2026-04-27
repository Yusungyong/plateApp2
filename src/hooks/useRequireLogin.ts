import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthProvider';
import type { RootStackParamList } from '../navigation/MainNavigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type RequireLoginOptions = {
  message?: string;
  onCancel?: () => void;
};

export const useRequireLogin = () => {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();

  return useCallback(
    (options?: RequireLoginOptions) => {
      if (user?.username) return true;
      Alert.alert(
        '로그인이 필요해요',
        options?.message ?? '로그인 후 이용할 수 있어요.',
        [
          { text: '취소', style: 'cancel', onPress: options?.onCancel },
          { text: '로그인', onPress: () => navigation.navigate('Auth') },
        ],
      );
      return false;
    },
    [navigation, user?.username],
  );
};
