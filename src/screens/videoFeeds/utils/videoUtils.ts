// src/screens/videoFeeds/utils/videoUtils.ts
import { launchImageLibrary } from 'react-native-image-picker';

export const pickVideo = async () => {
  const result = await launchImageLibrary({
    mediaType: 'video',
    selectionLimit: 1,
    includeBase64: false,
  });

  if (result.didCancel || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
};

export const getVideoFileName = (asset: any): string => {
  return (
    asset?.fileName ??
    `video-${Date.now()}.${asset?.type?.split('/')[1] ?? 'mp4'}`
  );
};

export const getVideoType = (asset: any): string => {
  return asset?.type ?? 'video/mp4';
};

export const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const todayDate = (): string => {
  return new Date().toISOString().slice(0, 10);
};
