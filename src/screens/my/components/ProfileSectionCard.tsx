import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../styles/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const ProfileSectionCard: React.FC<Props> = ({ children, style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.borderDefault,
          shadowColor: colors.textPrimary,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default ProfileSectionCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    overflow: 'hidden',
  },
});
