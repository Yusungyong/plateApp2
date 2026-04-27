// src/navigation/MainNavigation.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthProvider';
import HomeScreen from '../screens/home/HomeScreen';
import AuthStack from './AuthStack';
import VideoFeedScreen from '../screens/videoFeeds/VideoFeedScreen';
import FullScreenMapScreen from '../screens/home/FullScreenMapScreen';

// ✅ 추가: 테스트 뷰어 스크린 (네가 만든 경로에 맞게 import)
import ImageFeedViewerScreen from '../screens/ImageFeed/ImageFeedViewerScreen';
import MyPageScreen from '../screens/my/MyPageScreen';
import AccountSettingsScreen from '../screens/my/AccountSettingsScreen';
import ProfileEditScreen from '../screens/my/ProfileEditScreen';
import MyLikesScreen from '../screens/my/MyLikesScreen';
import MyPostsScreen from '../screens/my/MyPostsScreen';
import MyFriendsScreen from '../screens/my/MyFriendsScreen';
import BlockedUsersScreen from '../screens/my/BlockedUsersScreen';
import ProfileContentGridScreen from '../screens/my/ProfileContentGridScreen';
import ProfileImageViewerScreen from '../screens/my/ProfileImageViewerScreen';
import FriendVisitHistoryScreen from '../screens/my/FriendVisitHistoryScreen';
import ReportHistoryScreen from '../screens/my/ReportHistoryScreen';
import NicknameEditScreen from '../screens/my/edit/NicknameEditScreen';
import RegionEditScreen from '../screens/my/edit/RegionEditScreen';
import EmailEditScreen from '../screens/my/edit/EmailEditScreen';
import PasswordEditScreen from '../screens/my/edit/PasswordEditScreen';
import PhoneEditScreen from '../screens/my/edit/PhoneEditScreen';
import RoleEditScreen from '../screens/my/edit/RoleEditScreen';
import ProfileImageEditScreen from '../screens/my/edit/ProfileImageEditScreen';
import CodeEditScreen from '../screens/my/edit/CodeEditScreen';
import FcmTokenEditScreen from '../screens/my/edit/FcmTokenEditScreen';
import PrivacyEditScreen from '../screens/my/edit/PrivacyEditScreen';
import DeleteAccountScreen from '../screens/my/edit/DeleteAccountScreen';
import VideoPostEditorScreen from '../screens/videoFeeds/VideoPostEditorScreen';
import ImageFeedEditorScreen from '../screens/ImageFeed/ImageFeedEditorScreen';
import NotificationScreen from '../screens/notifications/NotificationScreen';
import RecipeScreen from '../screens/recipe/RecipeScreen';
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import type { VideoFeedItem } from '../api/videoFeedApi';
import FeedSearchScreen from '../screens/search/FeedSearchScreen';
import LegalDocumentScreen from '../screens/shared/LegalDocumentScreen';
import type { LegalDocumentType } from '../config/legal';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Search: undefined;
  Recipe: undefined;
  RecipeDetail: { recipeId: number };
  LegalDocument: { documentType: LegalDocumentType };
  FullScreenMap: undefined;
  MyPage: undefined;
  AccountSettings: undefined;
  ProfileEdit: { username?: string } | undefined;
  MyLikes: undefined;
  MyPosts: { initialTab?: 'video' | 'image' } | undefined;
  ProfileContentGrid: { type: 'video' | 'image' | 'like'; title?: string; username?: string };
  ProfileImageViewer: { uri?: string; title?: string; username?: string };
  MyFriends: undefined;
  BlockedUsers: undefined;
  ReportHistory: undefined;
  FriendVisitHistory: {
    friendUsername: string;
    friendNickname?: string | null;
  };
  VideoPostEditor:
    | {
        storeId?: number;
        initialTitle?: string;
        initialStoreName?: string;
        initialPlaceId?: string;
        initialVideoUrl?: string;
        initialAddress?: string;
      }
    | undefined;
  ImageFeedEditor:
    | {
        feedId?: number;
        initialContent?: string;
        initialAddress?: string;
        initialWithFriends?: string;
        initialStoreName?: string;
        initialPlaceId?: string;
        initialImages?: string[];
      }
    | undefined;
  EditNickname: { initialValue?: string } | undefined;
  EditRegion: { initialValue?: string } | undefined;
  EditEmail: { initialValue?: string } | undefined;
  EditPassword: undefined;
  EditPhone: { initialValue?: string } | undefined;
  EditRole: { initialValue?: string } | undefined;
  EditProfileImage: { initialValue?: string } | undefined;
  EditCode: { initialValue?: string } | undefined;
  EditFcmToken: { initialValue?: string } | undefined;
  EditPrivacy: { initialValue?: boolean } | undefined;
  DeleteAccount: undefined;

  VideoFeedScreen: {
    username?: string;
    storeId: number;
    placeId: string;
    context?: 'myPosts';
    contextItems?: VideoFeedItem[];
    contextIndex?: number;
  };

  ImageFeedViewer: {
    feedId?: number;
    feedIds?: number[];
    groupId?: string;
    groupIds?: string[];
    initialIndex?: number;
  };
  Notification: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const MainNavigation = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer key={user ? 'logged-in' : 'logged-out'}>
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
        <RootStack.Screen name="Home" component={HomeScreen} />
        <RootStack.Screen name="Search" component={FeedSearchScreen} />
        <RootStack.Screen name="Recipe" component={RecipeScreen} />
        <RootStack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <RootStack.Screen name="LegalDocument" component={LegalDocumentScreen} />
        <RootStack.Screen name="FullScreenMap" component={FullScreenMapScreen} />
        <RootStack.Screen name="VideoFeedScreen" component={VideoFeedScreen} />
        <RootStack.Screen name="ImageFeedViewer" component={ImageFeedViewerScreen} />

        {user ? (
          <>
            <RootStack.Screen name="MyPage" component={MyPageScreen} />
            <RootStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <RootStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <RootStack.Screen name="MyLikes" component={MyLikesScreen} />
            <RootStack.Screen name="MyPosts" component={MyPostsScreen} />
            <RootStack.Screen name="ProfileContentGrid" component={ProfileContentGridScreen} />
            <RootStack.Screen name="ProfileImageViewer" component={ProfileImageViewerScreen} />
            <RootStack.Screen name="MyFriends" component={MyFriendsScreen} />
            <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <RootStack.Screen name="ReportHistory" component={ReportHistoryScreen} />
            <RootStack.Screen name="FriendVisitHistory" component={FriendVisitHistoryScreen} />
            <RootStack.Screen name="EditNickname" component={NicknameEditScreen} />
            <RootStack.Screen name="EditRegion" component={RegionEditScreen} />
            <RootStack.Screen name="EditEmail" component={EmailEditScreen} />
            <RootStack.Screen name="EditPassword" component={PasswordEditScreen} />
            <RootStack.Screen name="EditPhone" component={PhoneEditScreen} />
            <RootStack.Screen name="EditRole" component={RoleEditScreen} />
            <RootStack.Screen name="EditProfileImage" component={ProfileImageEditScreen} />
            <RootStack.Screen name="EditCode" component={CodeEditScreen} />
            <RootStack.Screen name="EditFcmToken" component={FcmTokenEditScreen} />
            <RootStack.Screen name="EditPrivacy" component={PrivacyEditScreen} />
            <RootStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
            <RootStack.Screen name="VideoPostEditor" component={VideoPostEditorScreen} />
            <RootStack.Screen name="ImageFeedEditor" component={ImageFeedEditorScreen} />
            <RootStack.Screen name="Notification" component={NotificationScreen} />
          </>
        ) : null}

        <RootStack.Screen
          name="Auth"
          component={AuthStack}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigation;
