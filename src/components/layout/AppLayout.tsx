// src/components/layout/AppLayout.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../styles/theme';

type Props = {
  title?: string;
  showBack?: boolean;
  showNotification?: boolean;
  notificationCount?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerHeight?: number;
  onPressBack?: () => void;
  onPressNotification?: () => void;
  onPressFriends?: () => void;
};

export default function AppLayout({
  title = '',
  showBack = false,
  showNotification = true,
  notificationCount,
  children,
  footer,
  footerHeight = 54,
  onPressBack,
  onPressNotification,
  onPressFriends,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const safeBottom = insets.bottom;
  const footerContentPaddingBottom = Math.max(safeBottom - 15, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity onPress={onPressBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.leftPlaceholder} />
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        {showNotification ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onPressNotification} style={styles.headerIconBtn}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.textPrimary}
                />
                {notificationCount ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationCount > 99 ? '99+' : `${notificationCount}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            {onPressFriends ? (
              <TouchableOpacity onPress={onPressFriends} style={styles.headerIconBtn}>
                <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.rightPlaceholder} />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>{children}</View>

      {/* Footer */}
      {footer && (
        <View
          style={[
            styles.footer,
            {
              height: footerHeight + safeBottom,
              paddingBottom: footerContentPaddingBottom,
            },
          ]}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderDefault,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconBtn: {
      marginLeft: 10,
    },
    iconWrap: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      right: -6,
      top: -4,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: '#ff4d4f',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      backgroundColor: colors.background,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
      backgroundColor: colors.background,
      paddingTop: 4,
    },
    leftPlaceholder: {
      width: 24,
    },
    rightPlaceholder: {
      width: 22,
    },
  });
