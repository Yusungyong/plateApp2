// src/screens/home/components/SectionCard.tsx
import React, { memo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { HOME_COLORS, HOME_RADII } from '../styles/homeTokens';

interface SectionCardProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'video' | 'map' | 'gallery';
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  eyebrow,
  description,
  actionText,
  onAction,
  children,
  style,
  tone = 'default',
}) => {
  const toneStyle =
    tone === 'map'
      ? styles.cardMap
      : tone === 'gallery'
      ? styles.cardGallery
      : tone === 'video'
      ? styles.cardVideo
      : null;

  return (
    <View style={[styles.card, toneStyle, style]}>
      <View style={styles.header}>
        <View style={styles.copyBlock}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>
        {actionText && onAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.action}>{actionText}</Text>
            <Text style={styles.actionArrow}>›</Text>
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: HOME_RADII.card,
    backgroundColor: HOME_COLORS.panelBg,
    shadowColor: HOME_COLORS.cardShadow,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
    overflow: 'hidden',
  },
  cardVideo: {
    backgroundColor: '#ffffff',
  },
  cardMap: {
    backgroundColor: '#ffffff',
  },
  cardGallery: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    columnGap: 12,
  },
  copyBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: HOME_COLORS.action,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: HOME_COLORS.textPrimary,
  },
  description: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: HOME_COLORS.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  action: {
    fontSize: 12,
    fontWeight: '800',
    color: HOME_COLORS.action,
    letterSpacing: 0.2,
  },
  actionArrow: {
    marginLeft: 4,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '700',
    color: HOME_COLORS.action,
  },
});
