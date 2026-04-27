// src/navigation/FooterTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRequireLogin } from '../hooks/useRequireLogin';

const FooterTabBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const requireLogin = useRequireLogin();

  const tabs = [
    { name: '홈', icon: 'home-outline', route: 'Home' },
    { name: '검색', icon: 'search-outline', route: 'Search' },
    { name: '추가', icon: 'add-circle-outline', route: 'VideoPostEditor', protected: true },
    { name: '레시피', icon: 'restaurant-outline', route: 'Recipe' },
    { name: '프로필', icon: 'person-outline', route: 'MyPage', protected: true },
  ];

  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const isActive = route.name === tab.route;

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => {
              if (tab.protected) {
                const ok = requireLogin({
                  message: '이 기능은 로그인 후 사용할 수 있어요.',
                });
                if (!ok) return;
              }
              navigation.navigate(tab.route as never);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? '#111' : '#8b91a1'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FooterTabBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 16,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    color: '#8b91a1',
  },
  labelActive: {
    color: '#111',
    fontWeight: '600',
  },
});
