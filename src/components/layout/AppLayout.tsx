// src/components/layout/AppLayout.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  title?: string;
  showBack?: boolean;
  showNotification?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onPressBack?: () => void;
  onPressNotification?: () => void;
};

export default function AppLayout({
  title = '',
  showBack = false,
  showNotification = true,
  children,
  footer,
  onPressBack,
  onPressNotification,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity onPress={onPressBack}>
            <Ionicons name="chevron-back" size={24} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        {showNotification ? (
          <TouchableOpacity onPress={onPressNotification}>
            <Ionicons name="notifications-outline" size={22} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>{children}</View>

      {/* Footer */}
      {footer && (
        <View
          style={[
            styles.footer,
            // 기기별 하단 안전 영역(insets.bottom)을 그대로 사용
            { paddingBottom: insets.bottom },
          ]}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.4,
    borderBottomColor: '#e6e6e6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  footer: {
    height: 60,
    borderTopWidth: 0.6,
    borderTopColor: '#e6e6e6',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
});
