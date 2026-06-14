// src/screens/my/edit/ProfileImageEditScreen.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { AxiosError } from 'axios';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, Asset } from 'react-native-image-picker';

import AppLayout from '../../../components/layout/AppLayout';
import type { RootStackParamList } from '../../../navigation/MainNavigation';
import { useAuth } from '../../../auth/AuthProvider';
import { uploadProfileImage } from '../../../api/profileApi';
import { logProfileHistory } from '../../../utils/profileHistoryLogger';
import { buildProfileUri, markProfileImageUpdated } from '../../../utils/profileImage';
import {
  MOBILE_IMAGE_UPLOAD_EXTENSIONS,
  getImageUploadValidationError,
} from '../../../utils/uploadValidation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EditProfileImage'>;

const getUploadErrorMessage = (error: unknown) => {
  const axiosError = error as AxiosError<any>;
  const responseBody = axiosError?.response?.data;
  const message =
    responseBody?.message ??
    responseBody?.error ??
    responseBody?.data?.message ??
    (error as Error | undefined)?.message;

  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return '프로필 이미지를 저장하지 못했어요.';
};

const buildUploadFileName = (asset: Asset) => {
  if (asset.fileName && asset.fileName.trim().length > 0) {
    return asset.fileName;
  }

  const extensionFromType = asset.type?.split('/')[1]?.trim();
  const safeExtension = extensionFromType ? extensionFromType.replace(/[^a-zA-Z0-9]/g, '') : 'jpg';
  return `profile_${Date.now()}.${safeExtension || 'jpg'}`;
};

const ProfileImageEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, patchUser, refreshUser } = useAuth();

  const initialImageRef = useRef(route.params?.initialValue ?? '');
  const [previewUri, setPreviewUri] = useState(initialImageRef.current);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const handlePickImage = useCallback(async () => {
    try {
      setPicking(true);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert('선택 오류', '이미지를 다시 선택해 주세요.');
        return;
      }
      const validationError = getImageUploadValidationError(asset, {
        label: '프로필 이미지',
        allowedExtensions: MOBILE_IMAGE_UPLOAD_EXTENSIONS,
      });
      if (validationError) {
        Alert.alert('업로드할 수 없어요', validationError);
        return;
      }
      setSelectedAsset(asset);
      setPreviewUri(asset.uri);
    } catch {
      Alert.alert('실패', '이미지를 불러오지 못했어요.');
    } finally {
      setPicking(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.username) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    if (!selectedAsset?.uri) {
      Alert.alert('이미지 없음', '앨범에서 이미지를 선택해 주세요.');
      return;
    }
    const validationError = getImageUploadValidationError(selectedAsset, {
      label: '프로필 이미지',
      allowedExtensions: MOBILE_IMAGE_UPLOAD_EXTENSIONS,
    });
    if (validationError) {
      Alert.alert('업로드할 수 없어요', validationError);
      return;
    }
    try {
      setSaving(true);
      const fileName = buildUploadFileName(selectedAsset);
      const mimeType = selectedAsset.type ?? 'image/jpeg';
      const uploaded = await uploadProfileImage({
        uri: selectedAsset.uri,
        name: fileName,
        type: mimeType,
      });
      const nextProfileImageUrl = uploaded?.profileImageUrl ?? selectedAsset.uri;
      markProfileImageUpdated(user.username, nextProfileImageUrl);
      try {
        await refreshUser();
      } catch {
        patchUser({ profileImageUrl: nextProfileImageUrl });
      }
      await logProfileHistory(user.username, {
        changeType: 'PROFILE_IMAGE',
        before: { profileImageUrl: initialImageRef.current },
        after: {
          profileImageUrl: nextProfileImageUrl,
          originalFileName: fileName,
          mimeType,
        },
        memo: 'ProfileImageEditScreen',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('실패', getUploadErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [navigation, patchUser, refreshUser, selectedAsset, user?.username]);

  const previewSource = useMemo(() => {
    if (!previewUri) return undefined;
    const isLocal = /^(file|content):\/\//i.test(previewUri);
    const resolvedUri = isLocal
      ? previewUri
      : buildProfileUri(user?.username, previewUri ?? null);
    return isLocal
      ? { uri: resolvedUri }
      : { uri: resolvedUri, cache: 'force-cache' as const };
  }, [previewUri, user?.username]);

  return (
    <AppLayout
      title="프로필 이미지"
      showBack
      showNotification={false}
      onPressBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        {previewSource ? (
          <Image source={previewSource} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewPlaceholder]}>
            <Text style={styles.previewPlaceholderText}>이미지 없음</Text>
          </View>
        )}
        <Text style={styles.caption}>로컬 앨범에서 이미지를 선택해 프로필로 사용할 수 있어요.</Text>

        <TouchableOpacity style={styles.pickButton} onPress={handlePickImage} disabled={picking}>
          <Text style={styles.pickButtonText}>{picking ? '앨범 여는 중…' : '앨범에서 선택'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '업로드 중…' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

export default ProfileImageEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    alignItems: 'center',
  },
  preview: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#e6e7eb',
    marginBottom: 16,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    color: '#9aa0ab',
    fontSize: 13,
  },
  caption: {
    textAlign: 'center',
    color: '#6f7782',
    fontSize: 13,
    marginBottom: 20,
  },
  pickButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7ccd4',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickButtonText: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
