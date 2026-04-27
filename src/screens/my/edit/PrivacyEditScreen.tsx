// src/screens/my/edit/PrivacyEditScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { updateUserPrivacy } from '../../../api/userApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditPrivacy'>;

const PrivacyEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const initialPrivateRef = useRef(route.params?.initialValue ?? user?.isPrivate ?? false);
  const [isPrivate, setIsPrivate] = useState(!!initialPrivateRef.current);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      setSaving(true);
      await updateUserPrivacy(user.username, isPrivate);
      await logProfileHistory(user.username, {
        changeType: 'PRIVACY',
        before: { isPrivate: initialPrivateRef.current },
        after: { isPrivate },
        memo: 'PrivacyEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', '공개 설정을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title='공개 설정'
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>비공개 계정</Text>
            <Text style={styles.caption}>비공개 시 승인된 사용자만 타임라인을 볼 수 있어요.</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default PrivacyEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  caption: { fontSize: 13, color: '#6f7782', marginTop: 4 },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
