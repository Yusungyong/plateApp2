import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthProvider';
import { useRequireLogin } from './useRequireLogin';
import type { RootStackParamList } from '../navigation/MainNavigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const useProfileNavigation = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const myUsername = (user?.username ?? '').toString().trim();

  const navigateToProfile = useCallback(
    (username?: string | null) => {
      if (!requireLogin({ message: '프로필은 로그인 후 확인할 수 있어요.' })) {
        return;
      }
      const target = (username ?? '').toString().trim();
      if (!target) return;
      if (myUsername && target === myUsername) {
        navigation.navigate('MyPage');
        return;
      }
      navigation.navigate('ProfileEdit', { username: target });
    },
    [navigation, myUsername, requireLogin],
  );

  return { navigateToProfile, myUsername };
};
