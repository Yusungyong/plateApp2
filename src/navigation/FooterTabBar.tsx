// src/navigation/FooterTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRequireLogin } from '../hooks/useRequireLogin';

type FooterTabBarProps = {
  variant?: 'default' | 'overlay';
};

const FooterTabBar: React.FC<FooterTabBarProps> = ({ variant = 'default' }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const requireLogin = useRequireLogin();

  const tabs = [
    { name: '홈', icon: 'home-outline', route: 'Home' },
    { name: '검색', icon: 'search-outline', route: 'Search' },
    { name: '추가', icon: 'add-circle-outline', route: 'ImageFeedEditor', protected: true },
    { name: '레시피', icon: 'restaurant-outline', route: 'Recipe' },
    { name: '프로필', icon: 'person-outline', route: 'MyPage', protected: true },
  ];

  return (
    <View
      style={[
        styles.container,
        variant === 'default' && styles.containerDocked,
        variant === 'overlay' && styles.containerOverlay,
      ]}
    >
      {tabs.map(tab => {
        const isActive = route.name === tab.route;
        const isComposer = tab.route === 'ImageFeedEditor';

        return (
          <TouchableOpacity
            key={tab.route}
            style={[styles.tab, isComposer && styles.tabComposer]}
            onPress={() => {
              if (isActive) {
                return;
              }
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
            <View
              style={[
                styles.iconWrap,
                isActive && styles.iconWrapActive,
                isComposer && styles.iconWrapComposer,
                variant === 'overlay' && styles.iconWrapOverlay,
                variant === 'overlay' && isActive && styles.iconWrapOverlayActive,
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={isComposer ? 24 : 22}
                color={isActive || isComposer ? '#161616' : '#7a7a7a'}
              />
            </View>
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
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 6,
    paddingBottom: 0,
    paddingTop: 6,
  },
  containerDocked: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  containerOverlay: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#ececec',
    borderWidth: 1,
    borderRadius: 24,
    marginHorizontal: 6,
    marginBottom: 1,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 18,
  },
  tabComposer: {
    marginTop: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#f3f4f6',
  },
  iconWrapOverlay: {
    backgroundColor: 'transparent',
  },
  iconWrapOverlayActive: {
    backgroundColor: '#f3f4f6',
  },
  iconWrapComposer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  label: {
    fontSize: 11,
    marginTop: 3,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  labelActive: {
    color: '#161616',
    fontWeight: '700',
  },
});
