// src/screens/my/ProfileImageViewerScreen.tsx
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../../navigation/MainNavigation';
import { buildProfileUri } from '../../utils/profileImage';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProfileImageViewer'>;

const ProfileImageViewerScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { uri, title, username } = route.params;
  const profileUri = buildProfileUri(username, uri ?? null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title ?? '프로필 이미지'}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <Image source={{ uri: profileUri }} style={styles.image} resizeMode="contain" />
      </View>
    </SafeAreaView>
  );
};

export default ProfileImageViewerScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#f4f6fb',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: '#8b93a5',
    fontSize: 14,
  },
});
