import { Alert, Linking } from 'react-native';
import { getLegalUrl } from '../config/legal';

export const openLegalLink = async (type: 'terms' | 'privacy') => {
  const url = getLegalUrl(type);
  const label = type === 'terms' ? '이용약관' : '개인정보 처리방침';

  if (!url) {
    Alert.alert(
      label,
      `${label} URL이 아직 설정되지 않았어요. 환경변수에 ${
        type === 'terms' ? 'TERMS_OF_SERVICE_URL' : 'PRIVACY_POLICY_URL'
      } 값을 추가해 주세요.`,
    );
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(label, `${label} 링크를 열 수 없어요.`);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(label, `${label} 링크를 열지 못했어요. 잠시 후 다시 시도해 주세요.`);
  }
};
