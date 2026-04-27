import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../../styles/theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
};

const SettingsRow: React.FC<Props> = ({
  icon,
  title,
  description,
  value,
  onPress,
  destructive = false,
  isLast = false,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.row, !isLast && styles.rowDivider, style]}
      {...(onPress ? { activeOpacity: 0.85, onPress } : {})}
    >
      <View
        style={[
          styles.iconWrap,
          destructive ? styles.iconWrapDanger : styles.iconWrapNeutral,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? '#c43737' : colors.textPrimary}
        />
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, destructive && styles.titleDanger]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <View style={styles.right}>
        {value ? <Text style={[styles.value, onPress && styles.valueWithChevron]}>{value}</Text> : null}
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </Container>
  );
};

export default SettingsRow;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 16,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderDefault,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      marginTop: 1,
    },
    iconWrapNeutral: {
      backgroundColor: colors.backgroundSoft,
    },
    iconWrapDanger: {
      backgroundColor: '#fff1f1',
    },
    body: {
      flex: 1,
      paddingRight: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    titleDanger: {
      color: '#c43737',
    },
    description: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      paddingTop: 2,
    },
    value: {
      maxWidth: 124,
      textAlign: 'right',
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    valueWithChevron: {
      marginRight: 8,
    },
  });
