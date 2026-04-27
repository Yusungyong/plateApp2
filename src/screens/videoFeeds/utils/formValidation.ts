// src/screens/videoFeeds/utils/formValidation.ts
import { Alert } from 'react-native';
import type { VideoPostPayload } from '../types';
import type { Asset } from 'react-native-image-picker';

export const validateVideoPost = (
  form: VideoPostPayload,
  selectedAsset: Asset | null,
  username?: string
): { valid: boolean; error?: string } => {
  if (!username) {
    Alert.alert('로그인이 필요해요', '콘텐츠 등록은 로그인 후 사용할 수 있어요.');
    return { valid: false, error: 'login_required' };
  }

  if (!selectedAsset?.uri && !form.videoUrl.trim()) {
    Alert.alert('영상 선택 필요', '등록할 영상을 먼저 선택해 주세요.');
    return { valid: false, error: 'video_required' };
  }

  if (!form.address?.trim()) {
    Alert.alert('주소 입력 필요', '주소를 입력해 주세요.');
    return { valid: false, error: 'address_required' };
  }

  return { valid: true };
};
