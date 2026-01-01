// src/navigation/MainNavigation.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthProvider';
import HomeScreen from '../screens/home/HomeScreen';
import AuthStack from './AuthStack';
import VideoFeedScreen from '../screens/videoFeeds/VideoFeedScreen';

// ✅ 추가: 테스트 뷰어 스크린 (네가 만든 경로에 맞게 import)
import ImageFeedViewerScreen from '../screens/ImageFeed/ImageFeedViewerScreen';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;

  VideoFeedScreen: {
    username?: string;
    storeId: number;
    placeId: string;
  };

  // ✅ 추가: 이미지 뷰어
  ImageFeedViewerTest: {
    feedId: number;
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const MainNavigation = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer key={user ? 'logged-in' : 'logged-out'}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="Home" component={HomeScreen} />

            <RootStack.Screen name="VideoFeedScreen" component={VideoFeedScreen} />

            {/* ✅ 추가 */}
            <RootStack.Screen
              name="ImageFeedViewer"
              component={ImageFeedViewerScreen}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigation;
