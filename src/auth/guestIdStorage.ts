// src/auth/guestIdStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_ID_KEY = 'plate_guest_id_v1';

let cachedGuestId: string | null = null;

/**
 * 간단한 guestId 생성기
 * - 의존성 없이 Date.now + random 으로 문자열 만듦
 * - 한 디바이스 기준으로 한 번만 생성해서 AsyncStorage에 저장
 */
const generateGuestId = (): string => {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `g_${timestamp}_${random}`;
};

/**
 * 디바이스를 대표하는 guestId를 가져온다.
 * - 이미 저장된 값이 있으면 그걸 쓰고
 * - 없으면 새로 생성해서 AsyncStorage에 저장한 뒤 리턴
 */
export const getOrCreateGuestId = async (): Promise<string> => {
  // 메모리 캐시 우선
  if (cachedGuestId) {
    return cachedGuestId;
  }

  try {
    const stored = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (stored && stored.trim().length > 0) {
      cachedGuestId = stored;
      return stored;
    }
  } catch (e) {
    console.warn('[guestIdStorage] getItem error', e);
    // 에러가 나도 앱이 터지진 않게 새로 생성해서 진행
  }

  const newId = generateGuestId();

  try {
    await AsyncStorage.setItem(GUEST_ID_KEY, newId);
  } catch (e) {
    console.warn('[guestIdStorage] setItem error', e);
  }

  cachedGuestId = newId;
  return newId;
};

/**
 * (옵션) guestId를 초기화하고 싶을 때 사용
 * - 일반 플로우에서는 쓸 일 거의 없음 (디버깅용)
 */
export const resetGuestId = async (): Promise<void> => {
  cachedGuestId = null;
  try {
    await AsyncStorage.removeItem(GUEST_ID_KEY);
  } catch (e) {
    console.warn('[guestIdStorage] removeItem error', e);
  }
};
