// src/screens/my/edit/RoleEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserRole } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditRole'>;

const RoleEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialRoleRef = useRef(route.params?.initialValue ?? user?.role ?? 'USER');
  const [role, setRole] = useState(initialRoleRef.current || 'USER');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      const trimmed = role.trim().toUpperCase();
      if (!trimmed) {
        Alert.alert('역할 확인', '역할을 입력해 주세요.');
        return;
      }
      await updateUserRole(user.username, trimmed);
      await logProfileHistory(user.username, {
        changeType: 'ROLE',
        before: { role: initialRoleRef.current },
        after: { role: trimmed },
        memo: 'RoleEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', '역할 정보를 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title='역할 변경'
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>역할</Text>
        <TextInput
          style={styles.input}
          value={role}
          onChangeText={setRole}
          placeholder='예: USER'
          autoCapitalize='characters'
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default RoleEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  label: { fontSize: 13, color: '#777', marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
