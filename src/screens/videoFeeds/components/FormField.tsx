// src/screens/videoFeeds/components/FormField.tsx
import React, { memo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  onLayout?: (y: number) => void;
}

const FormField: React.FC<FormFieldProps> = ({ label, children, onLayout }) => {
  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const y = event.nativeEvent.layout.y;
        onLayout?.(y);
      }}
    >
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
};

export default memo(FormField);

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  label: {
    fontSize: 13,
    color: '#6f7782',
    marginBottom: 6,
  },
});
