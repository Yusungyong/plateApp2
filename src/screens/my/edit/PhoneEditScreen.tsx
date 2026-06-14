// src/screens/my/edit/PhoneEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateMyUserProfile } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditPhone'>;

const PhoneEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, patchUser, refreshUser } = useAuth();
  const initialPhoneRef = useRef(route.params?.initialValue ?? user?.phone ?? '');
  const [phone, setPhone] = useState(initialPhoneRef.current || '010-1234-5678');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      const trimmed = phone.trim();
      const phoneRegex = /^0\d{1,2}-\d{3,4}-\d{4}$/;
      if (!phoneRegex.test(trimmed)) {
        Alert.alert('휴대폰 번호 확인', '010-1234-5678 형식으로 입력해 주세요.');
        return;
      }
      await updateMyUserProfile({ phone: trimmed });
      try {
        await refreshUser();
      } catch {
        patchUser({ phone: trimmed, phoneNumber: trimmed });
      }
      await logProfileHistory(user.username, {
        changeType: 'PHONE',
        before: { phone: initialPhoneRef.current },
        after: { phone: trimmed },
        memo: 'PhoneEditScreen',
      });
      navigation.goBack();
    } catch {
      Alert.alert('실패', '휴대폰 번호를 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title='휴대폰 번호'
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>휴대폰 번호</Text>
        <TextInput
          style={styles.input}
          keyboardType='phone-pad'
          value={phone}
          onChangeText={setPhone}
          placeholder='010-0000-0000'
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default PhoneEditScreen;

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
