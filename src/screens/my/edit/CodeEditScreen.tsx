// src/screens/my/edit/CodeEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserCode } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditCode'>;

const CodeEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialCodeRef = useRef(route.params?.initialValue ?? user?.code ?? '');
  const [code, setCode] = useState(initialCodeRef.current || 'ABCD1234');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length < 4 || trimmed.length > 16) {
        Alert.alert('코드 확인', '코드는 4~16자 사이여야 합니다.');
        return;
      }
      await updateUserCode(user.username, trimmed);
      await logProfileHistory(user.username, {
        changeType: 'CODE',
        before: { code: initialCodeRef.current },
        after: { code: trimmed },
        memo: 'CodeEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', '코드를 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title='사용자 코드'
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>사용자 코드</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder='ABCD1234'
          autoCapitalize='characters'
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default CodeEditScreen;

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
