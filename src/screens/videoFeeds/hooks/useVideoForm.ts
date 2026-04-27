// src/screens/videoFeeds/hooks/useVideoForm.ts
import { useState, useCallback } from 'react';
import type { VideoPostPayload } from '../types';
import type { Asset } from 'react-native-image-picker';

interface UseVideoFormProps {
  initialTitle?: string;
  initialStoreName?: string;
  initialPlaceId?: string;
  initialVideoUrl?: string;
  initialAddress?: string;
}

export const useVideoForm = (props: UseVideoFormProps = {}) => {
  const [form, setForm] = useState<VideoPostPayload>({
    title: props.initialTitle ?? '',
    storeName: props.initialStoreName ?? '',
    placeId: props.initialPlaceId ?? '',
    videoUrl: props.initialVideoUrl ?? '',
    address: props.initialAddress ?? '',
    description: '',
    withFriends: '',
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const updateField = useCallback((key: keyof VideoPostPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMultipleFields = useCallback((updates: Partial<VideoPostPayload>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      title: props.initialTitle ?? '',
      storeName: props.initialStoreName ?? '',
      placeId: props.initialPlaceId ?? '',
      videoUrl: props.initialVideoUrl ?? '',
      address: props.initialAddress ?? '',
      description: '',
      withFriends: '',
    });
    setSelectedAsset(null);
  }, [props]);

  return {
    form,
    selectedAsset,
    setSelectedAsset,
    updateField,
    updateMultipleFields,
    resetForm,
  };
};
