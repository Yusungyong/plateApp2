// src/screens/home/components/SectionCard.tsx
import React, { memo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';

interface SectionCardProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: ViewStyle;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  actionText,
  onAction,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionText && onAction && (
          <TouchableOpacity
            onPress={onAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.action}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
};

export default memo(SectionCard);

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    marginHorizontal: 0,
    padding: 16,
    borderRadius: HOME_RADII.card,
    backgroundColor: HOME_COLORS.cardBg,
    shadowColor: HOME_COLORS.cardShadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: HOME_COLORS.textPrimary,
  },
  action: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.action,
  },
});
