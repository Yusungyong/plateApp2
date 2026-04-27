import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppLayout from '../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/AuthProvider';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useTheme } from '../../../styles/theme';
import ProfileSectionCard from '../components/ProfileSectionCard';
import { updatePassword } from '../../../api/profileApi';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PasswordEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    const minLen = 8;
    if (!currentPassword.trim()) {
      Alert.alert('현재 비밀번호 확인', '현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword.length < minLen) {
      Alert.alert('비밀번호 확인', `새 비밀번호는 ${minLen}자 이상이어야 합니다.`);
      return;
    }
    if (!/[0-9]/.test(newPassword) || !/[A-Za-z]/.test(newPassword)) {
      Alert.alert('비밀번호 확인', '영문과 숫자를 모두 포함해 주세요.');
      return;
    }
    if (newPassword !== passwordCheck) {
      Alert.alert('비밀번호 불일치', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('비밀번호 확인', '현재 비밀번호와 다른 값으로 설정해 주세요.');
      return;
    }

    try {
      setSaving(true);
      await updatePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      Alert.alert('변경 완료', '비밀번호를 변경했습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.';
      Alert.alert('변경 실패', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="비밀번호 변경"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProfileSectionCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>안전한 비밀번호로 업데이트하세요.</Text>
          <Text style={styles.infoText}>
            현재 비밀번호를 확인한 뒤 새 비밀번호를 저장합니다. 새 비밀번호는 영문과 숫자를
            포함한 8자 이상이어야 합니다.
          </Text>
        </ProfileSectionCard>

        <ProfileSectionCard style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>현재 비밀번호</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="현재 비밀번호를 입력하세요"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>새 비밀번호</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="영문과 숫자를 포함한 8자 이상"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>새 비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={passwordCheck}
              onChangeText={setPasswordCheck}
              placeholder="새 비밀번호를 다시 입력하세요"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '비밀번호 저장'}</Text>
          </TouchableOpacity>
        </ProfileSectionCard>
      </ScrollView>
    </AppLayout>
  );
};

export default PasswordEditScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
    },
    infoCard: {
      padding: 18,
      marginBottom: 16,
      backgroundColor: colors.background,
    },
    infoTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    infoText: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    formCard: {
      padding: 18,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderDefault,
      backgroundColor: colors.backgroundSoft,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.textPrimary,
    },
    saveButton: {
      marginTop: 8,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.textPrimary,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.background,
    },
  });
