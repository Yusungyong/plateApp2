// src/screens/my/edit/NicknameEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserNickname } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Route = RouteProp<RootStackParamList, 'EditNickname'>;

const NicknameEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialNicknameRef = useRef(route.params?.initialValue ?? user?.nickName ?? user?.username ?? '');
  const [nickname, setNickname] = useState(initialNicknameRef.current);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      const trimmed = nickname.trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        Alert.alert('닉네임 확인', '닉네임은 2~20자 사이로 입력해 주세요.');
        return;
      }
      await updateUserNickname(user.username, trimmed);
      await logProfileHistory(user.username, {
        changeType: 'NICKNAME',
        before: { nickName: initialNicknameRef.current },
        after: { nickName: trimmed },
        memo: 'NicknameEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', '닉네임을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="닉네임 변경"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>새 닉네임</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="예: plate_master"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default NicknameEditScreen;

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
