// src/screens/my/edit/EmailEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserEmail } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditEmail'>;

const EmailEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialEmailRef = useRef(route.params?.initialValue ?? user?.email ?? '');
  const [email, setEmail] = useState(initialEmailRef.current);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      const trimmed = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        Alert.alert('이메일 확인', '올바른 이메일 주소를 입력해 주세요.');
        return;
      }
      await updateUserEmail(user.username, trimmed);
      await logProfileHistory(user.username, {
        changeType: 'EMAIL',
        before: { email: initialEmailRef.current },
        after: { email: trimmed },
        memo: 'EmailEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', '이메일을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="이메일 변경"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>이메일 주소</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="example@plateapp.com"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default EmailEditScreen;

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
