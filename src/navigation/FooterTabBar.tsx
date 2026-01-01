// src/navigation/FooterTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

const FooterTabBar = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const tabs = [
    { name: 'Home', icon: 'home-outline', route: 'Home' },
    { name: 'Search', icon: 'search-outline', route: 'Search' },
    { name: 'Add', icon: 'add-circle-outline', route: 'Create' },
    { name: 'Notice', icon: 'notifications-outline', route: 'Notification' },
    { name: 'My', icon: 'person-outline', route: 'MyPage' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const isActive = route.name === tab.route;

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.route as never)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              // 활성 탭이면 진한 색, 아니면 회색
              color={isActive ? '#111' : '#999'}
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
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tab: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    color: '#999',
  },
  labelActive: {
    color: '#111',
    fontWeight: '600',
  },
});
