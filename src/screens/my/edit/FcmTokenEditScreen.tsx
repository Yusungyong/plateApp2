// src/screens/my/edit/FcmTokenEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserFcmToken } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditFcmToken'>;

const FcmTokenEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialTokenRef = useRef(route.params?.initialValue ?? user?.fcmToken ?? '');
  const [token, setToken] = useState(initialTokenRef.current || 'fcm-token-value');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      const trimmed = token.trim();
      if (trimmed.length < 8) {
        Alert.alert('토큰 확인', '토큰을 다시 확인해 주세요.');
        return;
      }
      await updateUserFcmToken(user.username, trimmed);
      await logProfileHistory(user.username, {
        changeType: 'FCM_TOKEN',
        before: { fcmToken: initialTokenRef.current },
        after: { fcmToken: trimmed },
        memo: 'FcmTokenEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', 'FCM 토큰을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title='FCM 토큰'
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <Text style={styles.label}>토큰 값</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder='fcm-token'
          autoCapitalize='none'
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default FcmTokenEditScreen;

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
