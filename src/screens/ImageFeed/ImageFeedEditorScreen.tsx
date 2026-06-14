import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import Config from 'react-native-config';
import { FEED_IMAGE_BUCKET } from '../../config/buckets';
import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  createImageFeed,
  updateImageFeed,
  fetchImageFeedViewer,
  addImageFeedImages,
  deleteImageFeedImage,
  replaceImageFeedImage,
  type ImageFeedPayload,
} from '../../api/imageFeedApi';
import { createFriendVisits } from '../../api/friendVisitsApi';
import { createPlace } from '../../api/placeApi';
import { geocodeAddress } from '../../api/geocodingApi';
import { useAuth } from '../../auth/AuthProvider';
import { useTheme } from '../../styles/theme';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import FormField from '../videoFeeds/components/FormField';
import ImagePreview from './components/ImagePreview';
import { useKeyboardAware } from '../videoFeeds/hooks/useKeyboardAware';
import SuggestionList from '../videoFeeds/components/SuggestionList';
import type { NaverPlaceSuggestion, FriendProfile } from '../videoFeeds/types';
import { searchFriends } from '../../api/friendsApi';
import {
  stripHtml,
  extractFriendKeyword,
  mergeFriendValue,
  parseFriends,
} from '../videoFeeds/utils/suggestionUtils';
import { todayDate } from '../videoFeeds/utils/videoUtils';
import {
  MOBILE_IMAGE_UPLOAD_EXTENSIONS,
  getImageUploadValidationError,
} from '../../utils/uploadValidation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ImageFeedEditor'>;

type EditorImageItem = {
  id: string;
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  imageId?: number | null;
  uploadName?: string | null;
  isPersisted: boolean;
  isDirty?: boolean;
};

type EditorFormState = Omit<ImageFeedPayload, 'imageUrls'>;

const isRemoteUri = (value?: string | null) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const inferImageMimeType = (value?: string | null) => {
  const extension = value?.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const extensionFromMimeType = (mimeType?: string | null) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const sanitizeFileToken = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);

const basenameOfPath = (value?: string | null) =>
  (value ?? '')
    .split(/[?#]/)[0]
    .split('/')
    .pop()
    ?.trim() || '';

const buildStableUploadName = (params: {
  id: string;
  fileName?: string | null;
  mimeType?: string | null;
}) => {
  const base = sanitizeFileToken(params.id) || `${Date.now()}`;
  const existingExtension = params.fileName?.split('.').pop()?.toLowerCase();
  const extension = existingExtension || extensionFromMimeType(params.mimeType);
  return `plate-image-${base}.${extension}`;
};

const inferResizeFormat = (mimeType?: string | null, fileName?: string | null) => {
  if (mimeType === 'image/png' || fileName?.toLowerCase().endsWith('.png')) {
    return 'PNG' as const;
  }
  if (
    Platform.OS !== 'ios' &&
    (mimeType === 'image/webp' || fileName?.toLowerCase().endsWith('.webp'))
  ) {
    return 'WEBP' as const;
  }
  return 'JPEG' as const;
};

const buildEditorImageId = (uri: string, index: number) => `${uri}-${index}-${Date.now()}`;

const createEditorImageItem = (
  params: Partial<EditorImageItem> & { uri: string; index: number; isPersisted: boolean },
): EditorImageItem => ({
  id: params.id ?? buildEditorImageId(params.uri, params.index),
  uri: params.uri,
  width: params.width,
  height: params.height,
  fileName: params.fileName ?? params.uri.split('/').pop() ?? null,
  mimeType: params.mimeType ?? inferImageMimeType(params.fileName ?? params.uri),
  fileSize: params.fileSize ?? null,
  imageId: params.imageId ?? null,
  uploadName:
    params.uploadName ??
    (params.isPersisted
      ? basenameOfPath(params.fileName ?? params.uri)
      : buildStableUploadName({
          id: params.id ?? buildEditorImageId(params.uri, params.index),
          fileName: params.fileName ?? params.uri,
          mimeType: params.mimeType ?? inferImageMimeType(params.fileName ?? params.uri),
        })),
  isPersisted: params.isPersisted,
  isDirty: params.isDirty ?? false,
});

const mapAssetToEditorImage = (asset: Asset, index: number): EditorImageItem | null => {
  if (!asset.uri) {
    return null;
  }
  return createEditorImageItem({
    uri: asset.uri,
    index,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? null,
    mimeType: asset.type ?? null,
    fileSize: asset.fileSize ?? null,
    isPersisted: false,
  });
};

const getEditorImageValidationError = (item: EditorImageItem) =>
  getImageUploadValidationError(item, {
    label: '이미지',
    allowedExtensions: MOBILE_IMAGE_UPLOAD_EXTENSIONS,
  });

const mapUriToEditorImage = (
  uri: string,
  index: number,
  isPersisted: boolean,
  imageId?: number | null,
): EditorImageItem =>
  createEditorImageItem({
    uri,
    index,
    imageId,
    isPersisted,
  });

const resolveImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });

const buildImageUploadFile = (item: EditorImageItem, fallbackIndex: number) => {
  const name =
    item.uploadName ||
    item.fileName ||
    `image-${Date.now()}-${fallbackIndex}.${extensionFromMimeType(item.mimeType)}`;
  const type = item.mimeType || inferImageMimeType(name);
  return {
    uri: item.uri,
    name,
    type,
  };
};

const resolveCreatedStoreId = (payload: unknown): number | undefined => {
  const candidates = [
    payload,
    payload && typeof payload === 'object' ? (payload as any).data : undefined,
  ];

  for (const candidate of candidates) {
    const storeId = candidate?.storeId;
    if (typeof storeId === 'number' && Number.isFinite(storeId)) {
      return storeId;
    }
  }

  return undefined;
};

const withTimeout = async <T,>(
  task: Promise<T>,
  timeoutMs: number,
  tag: string,
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${tag} timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const ImageFeedEditorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const keyboard = useKeyboardAware();

  const editingFeedId = route.params?.feedId;
  const [form, setForm] = useState<EditorFormState>({
    content: route.params?.initialContent ?? '',
    address: route.params?.initialAddress ?? '',
    storeName: route.params?.initialStoreName ?? '',
    placeId: route.params?.initialPlaceId ?? '',
    withFriends: route.params?.initialWithFriends ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [rotatingImageId, setRotatingImageId] = useState<string | null>(null);
  const [removedPersistedImageIds, setRemovedPersistedImageIds] = useState<number[]>([]);
  const [imageItems, setImageItems] = useState<EditorImageItem[]>(() =>
    (route.params?.initialImages ?? []).map((uri, index) =>
      mapUriToEditorImage(uri, index, isRemoteUri(uri)),
    ),
  );

  const [locationInput, setLocationInput] = useState(
    [route.params?.initialStoreName, route.params?.initialAddress].filter(Boolean).join(' · ')
  );
  const [locationLocked, setLocationLocked] = useState(Boolean(locationInput));
  const [addressSuggestions, setAddressSuggestions] = useState<NaverPlaceSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressKeyword, setAddressKeyword] = useState('');
  const [addressActive, setAddressActive] = useState(false);

  const [friendSuggestions, setFriendSuggestions] = useState<FriendProfile[]>([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendKeyword, setFriendKeyword] = useState('');
  const [friendActive, setFriendActive] = useState(false);

  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendInputRef = useRef<TextInput | null>(null);
  const locationInputRef = useRef<TextInput | null>(null);
  const loadedFeedRef = useRef(false);

  const handleChange = (key: keyof EditorFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const scheduleCloseSuggestions = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setAddressActive(false);
      setFriendActive(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user?.username) return;
    requireLogin({
      message: '이미지 등록은 로그인 후 사용할 수 있어요.',
      onCancel: () => navigation.goBack(),
    });
  }, [navigation, requireLogin, user?.username]);

  useEffect(() => {
    if (!editingFeedId) return;
    if (loadedFeedRef.current) return;

    let mounted = true;
    const fetchDetail = async () => {
      try {
        setLoadingFeed(true);
        const data = await fetchImageFeedViewer(editingFeedId);
        if (!mounted || !data) return;

        const imageBucket = FEED_IMAGE_BUCKET || '';
        const joinUrl = (base?: string, path?: string | null) => {
          if (!path) return '';
          if (/^https?:\/\//i.test(path)) return path;
          if (!base) return path;
          const b = base.endsWith('/') ? base.slice(0, -1) : base;
          const p = path.startsWith('/') ? path.slice(1) : path;
          return `${b}/${p}`;
        };

        const nextImageItems = Array.isArray(data.images)
          ? data.images
              .map((img, index) => {
                const uri = joinUrl(imageBucket, img.fileName);
                if (!uri) {
                  return null;
                }
                return mapUriToEditorImage(uri, index, true, index + 1);
              })
              .filter((item): item is EditorImageItem => Boolean(item))
          : [];

        setForm((prev) => ({
          ...prev,
          content: data.content ?? '',
          address: data.location ?? '',
          storeName: data.storeName ?? '',
          placeId: data.placeId ?? '',
          withFriends: (data as any).withFriends ?? '',
        }));
        setImageItems(nextImageItems);
        setRemovedPersistedImageIds([]);

        const composed = [data.storeName, data.location].filter(Boolean).join(' · ');
        setLocationInput(composed);
        setLocationLocked(Boolean(composed));
      } catch {
      } finally {
        if (mounted) {
          setLoadingFeed(false);
          loadedFeedRef.current = true;
        }
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [editingFeedId]);

  const handleFocusSuggest = (field: 'address' | 'friend') => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (field === 'address') {
      setAddressActive(true);
    } else {
      setFriendActive(true);
    }
  };

  const handlePickImages = async () => {
    setIsPicking(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 0,
        includeBase64: false,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel || !result.assets?.length) return;
      const invalidAsset = result.assets.find((asset) =>
        getImageUploadValidationError(asset, {
          label: '이미지',
          allowedExtensions: MOBILE_IMAGE_UPLOAD_EXTENSIONS,
        }),
      );
      if (invalidAsset) {
        const message = getImageUploadValidationError(invalidAsset, {
          label: '이미지',
          allowedExtensions: MOBILE_IMAGE_UPLOAD_EXTENSIONS,
        });
        Alert.alert('업로드할 수 없어요', message ?? '이미지 파일을 확인해 주세요.');
        return;
      }
      const nextItems = result.assets
        .map((asset, index) => mapAssetToEditorImage(asset, index))
        .filter((item): item is EditorImageItem => Boolean(item));
      if (!nextItems.length) return;

      setImageItems((prev) => [...prev, ...nextItems]);
    } catch {
      Alert.alert('실패', '이미지를 불러오지 못했어요.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === imageId);
      if (!target) {
        return prev;
      }

      if (target.isPersisted && typeof target.imageId === 'number') {
        setRemovedPersistedImageIds((current) =>
          current.includes(target.imageId!) ? current : [...current, target.imageId!],
        );
      }

      return prev.filter((item) => item.id !== imageId);
    });
  };

  const handleRotateImage = async (imageId: string) => {
    const target = imageItems.find((item) => item.id === imageId);
    if (!target) {
      return;
    }
    if (target.isPersisted && !target.imageId) {
      Alert.alert('잠시만요', '기존 이미지 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setRotatingImageId(imageId);
    try {
      const currentSize =
        target.width && target.height
          ? { width: target.width, height: target.height }
          : await resolveImageSize(target.uri);
      const resizeFormat = inferResizeFormat(target.mimeType, target.fileName);
      const response = await ImageResizer.createResizedImage(
        target.uri,
        Math.max(1, Math.round(currentSize.height)),
        Math.max(1, Math.round(currentSize.width)),
        resizeFormat,
        100,
        90,
        undefined,
        false,
      );

      const nextMimeType =
        resizeFormat === 'PNG'
          ? 'image/png'
          : resizeFormat === 'WEBP'
            ? 'image/webp'
            : 'image/jpeg';

      setImageItems((prev) =>
        prev.map((item) =>
          item.id === imageId
            ? {
                ...item,
                uri: response.uri,
                width: response.width,
                height: response.height,
                fileName: response.name ?? item.fileName,
                mimeType: nextMimeType,
                uploadName: item.uploadName,
                isPersisted: item.isPersisted,
                isDirty: item.isPersisted ? true : item.isDirty,
              }
            : item,
        ),
      );
    } catch {
      Alert.alert('실패', '이미지를 회전하지 못했어요. 다른 이미지를 선택하거나 다시 시도해 주세요.');
    } finally {
      setRotatingImageId(null);
    }
  };

  const handleSubmit = async () => {
    if (!requireLogin({ message: '이미지 등록은 로그인 후 사용할 수 있어요.' })) return;
    if (!form.content.trim() || !form.address.trim() || imageItems.length === 0) {
      Alert.alert('필수 정보 확인', '내용, 주소, 최소 1장의 이미지가 필요합니다.');
      return;
    }
    const invalidImage = imageItems.find((item) =>
      (!item.isPersisted || item.isDirty) && getEditorImageValidationError(item),
    );
    if (invalidImage) {
      Alert.alert(
        '업로드할 수 없어요',
        getEditorImageValidationError(invalidImage) ?? '이미지 파일을 확인해 주세요.',
      );
      return;
    }

    setSaving(true);
    try {
      const geocodeResult = await geocodeAddress(form.address);
      if (!geocodeResult) {
        Alert.alert('주소 확인 필요', '주소를 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
        return;
      }

      const finalStoreName = form.storeName?.trim() || form.address?.trim() || '';

      if (editingFeedId) {
        await updateImageFeed(editingFeedId, {
          content: form.content,
          address: geocodeResult.formattedAddress,
          storeName: finalStoreName || form.storeName,
          placeId: geocodeResult.placeId,
          lat: geocodeResult.lat,
          lng: geocodeResult.lng,
          withFriends: form.withFriends,
        });

        const unresolvedReplacement = imageItems.some(
          (item) => item.isPersisted && item.isDirty && !item.imageId,
        );
        if (unresolvedReplacement) {
          throw new Error('기존 이미지 식별 정보를 아직 찾지 못했습니다.');
        }

        const replacementImages = imageItems.filter(
          (item) => item.isPersisted && item.isDirty && typeof item.imageId === 'number',
        );
        for (const item of replacementImages) {
          await replaceImageFeedImage(
            editingFeedId,
            item.imageId!,
            buildImageUploadFile(item, item.imageId!),
          );
        }

        const sortedRemovedImageIds = [...removedPersistedImageIds].sort((a, b) => b - a);
        for (const imageId of sortedRemovedImageIds) {
          await deleteImageFeedImage(editingFeedId, imageId);
        }

        const pendingImages = imageItems.filter((item) => !item.isPersisted);
        if (pendingImages.length > 0) {
          const body = new FormData();
          pendingImages.forEach((item, index) => {
            body.append(
              'files',
              buildImageUploadFile(item, index) as unknown as Blob,
            );
          });
          await addImageFeedImages(editingFeedId, body);
        }
      } else {
        const body = new FormData();
        imageItems.forEach((item, index) => {
          body.append(
            'files',
            buildImageUploadFile(item, index) as unknown as Blob,
          );
        });
        body.append('content', form.content);
        body.append('address', geocodeResult.formattedAddress);
        body.append('storeName', finalStoreName);
        body.append('placeId', geocodeResult.placeId);
        body.append('lat', String(geocodeResult.lat));
        body.append('lng', String(geocodeResult.lng));
        if (form.withFriends) body.append('withFriends', form.withFriends);
        body.append('openYn', 'Y');
        body.append('useYn', 'Y');
        const createResult = await createImageFeed(body);
        const friends = parseFriends(form.withFriends ?? '');
        const storeId = resolveCreatedStoreId(createResult);
        const tasks: Promise<unknown>[] = [
          withTimeout(
            createPlace({
              placeId: geocodeResult.placeId,
              address: geocodeResult.formattedAddress,
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
            }),
            8000,
            'place',
          ),
        ];
        if (friends.length > 0 && storeId) {
          tasks.push(
            withTimeout(
              createFriendVisits({
                storeId,
                visitDate: todayDate(),
                friends,
                storeName: finalStoreName || undefined,
                address: geocodeResult.formattedAddress,
              }),
              8000,
              'friendVisits',
            ),
          );
        }
        await Promise.allSettled(tasks);
      }
      Alert.alert('완료', editingFeedId ? '이미지 피드를 수정했어요.' : '새 이미지 피드를 등록했어요.');
      navigation.goBack();
    } catch {
      Alert.alert('실패', '이미지 피드를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAddress = (item: NaverPlaceSuggestion) => {
    const name = stripHtml(item.title ?? '');
    const address = item.roadAddress || item.address || '';
    setForm((prev) => ({ ...prev, storeName: name, address }));
    setLocationInput([name, address].filter(Boolean).join(' · '));
    setLocationLocked(true);
    setAddressKeyword('');
    setAddressSuggestions([]);
    setAddressActive(false);
  };

  const handleSelectFriend = (friend: FriendProfile) => {
    const nextValue = mergeFriendValue(form.withFriends ?? '', friend.username);
    setForm((prev) => ({ ...prev, withFriends: nextValue }));
    setFriendKeyword('');
    setFriendSuggestions([]);
    setFriendActive(true);
    keyboard.setFocusedField('withFriends');
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    requestAnimationFrame(() => {
      friendInputRef.current?.focus();
    });
  };

  useEffect(() => {
    const keyword = addressKeyword.trim();
    if (!keyword || !addressActive) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }
    if (!Config.NAVER_CLIENT_ID || !Config.NAVER_CLIENT_SECRET) {
      return;
    }
    const naverHeaders: Record<string, string> = {
      'X-Naver-Client-Id': Config.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': Config.NAVER_CLIENT_SECRET,
    };
    let cancelled = false;
    setAddressLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(keyword)}&display=6`,
          {
            headers: naverHeaders,
          },
        );
        if (!response.ok) {
          throw new Error(`Naver search failed: ${response.status}`);
        }
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setAddressSuggestions(items);
        }
      } catch {
        if (!cancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setAddressLoading(false);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [addressActive, addressKeyword]);

  useEffect(() => {
    const keyword = friendKeyword.trim();
    if (!keyword || !friendActive) {
      setFriendSuggestions([]);
      setFriendLoading(false);
      return;
    }
    let cancelled = false;
    setFriendLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await searchFriends(keyword, 8);
        if (!cancelled) {
          setFriendSuggestions(result);
        }
      } catch {
        if (!cancelled) {
          setFriendSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setFriendLoading(false);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [friendActive, friendKeyword]);

  const showAddressSuggestions =
    !locationLocked &&
    addressActive &&
    (addressLoading || addressSuggestions.length > 0 || addressKeyword.trim().length > 0);

  const showFriendSuggestions =
    friendActive &&
    (friendLoading || friendSuggestions.length > 0 || friendKeyword.trim().length > 0);
  const scrollContentStyle = useMemo(
    () => [
      styles.container,
      { paddingBottom: Math.max(40, keyboard.keyboardHeight + 40) },
    ],
    [keyboard.keyboardHeight, styles.container],
  );

  return (
    <AppLayout
      title={editingFeedId ? '이미지 수정' : '새 이미지 등록'}
      showBack
      onPressBack={() => navigation.goBack()}
      showNotification={false}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          ref={keyboard.scrollRef}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollIndicatorInsets={{ bottom: Math.max(0, keyboard.keyboardHeight) }}
        >
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation.replace('VideoPostEditor')}
              accessibilityRole="button"
              accessibilityLabel="동영상 등록 화면으로 이동"
            >
              <Text style={styles.toggleText}>동영상</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, styles.toggleActive]}>
              <Text style={[styles.toggleText, styles.toggleTextActive]}>이미지</Text>
            </TouchableOpacity>
          </View>

          <ImagePreview
            images={imageItems}
            isPicking={isPicking}
            onPress={handlePickImages}
            onRotateCurrent={handleRotateImage}
            onDeleteCurrent={(imageId) => {
              Alert.alert('이미지 삭제', '현재 이미지를 목록에서 제거할까요?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '삭제',
                  style: 'destructive',
                  onPress: () => handleDeleteImage(imageId),
                },
              ]);
            }}
            rotatingImageId={rotatingImageId}
          />

          <FormField
            label="본문 내용 *"
            onLayout={(y) => {
              keyboard.fieldOffsetRef.current.content = y;
            }}
          >
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.content}
              onChangeText={(text) => handleChange('content', text)}
              onFocus={() => {
                keyboard.setFocusedField('content');
                keyboard.scrollToField('content', 120);
              }}
              onBlur={() => keyboard.setFocusedField(null)}
              placeholder="방문 후기를 적어주세요."
              multiline
              numberOfLines={4}
            />
          </FormField>

          <FormField
            label="주소 *"
            onLayout={(y) => {
              keyboard.fieldOffsetRef.current.address = y;
            }}
          >
            {locationLocked ? (
              <TouchableOpacity
                style={[styles.input, styles.lockedInput]}
                onPress={() => {
                  setLocationLocked(false);
                  setLocationInput('');
                  setForm((prev) => ({ ...prev, address: '', storeName: '' }));
                  setAddressKeyword('');
                  setAddressSuggestions([]);
                  setAddressActive(true);
                  requestAnimationFrame(() => {
                    locationInputRef.current?.focus();
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.lockedTitle} numberOfLines={1}>
                  {form.storeName || locationInput}
                </Text>
                <Text style={styles.lockedSubtitle} numberOfLines={1}>
                  {form.address || locationInput}
                </Text>
                <Text style={styles.lockedHint}>탭해서 다시 입력</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.suggestField}>
                <TextInput
                  style={styles.input}
                  ref={locationInputRef}
                  value={locationInput}
                  onChangeText={(text) => {
                    setLocationInput(text);
                    setAddressKeyword(text);
                    setForm((prev) => ({ ...prev, address: text, storeName: text }));
                    setAddressActive(true);
                  }}
                  onFocus={() => {
                    keyboard.setFocusedField('address');
                    handleFocusSuggest('address');
                    keyboard.scrollToField('address', 90);
                  }}
                  onBlur={() => {
                    scheduleCloseSuggestions();
                    keyboard.setFocusedField(null);
                  }}
                  placeholder="예: 홍대맛집, 서울 마포구 ..."
                />
                {showAddressSuggestions && (
                  <SuggestionList
                    items={addressSuggestions}
                    loading={addressLoading}
                    keyword={addressKeyword}
                    maxHeight={Math.max(
                      180,
                      Dimensions.get('window').height -
                        keyboard.keyboardHeight -
                        (keyboard.fieldOffsetRef.current.address + 100),
                    )}
                    onSelect={handleSelectAddress}
                    renderTitle={(item) => stripHtml(item.title ?? '') || '이름 없음'}
                    renderSubtitle={(item) =>
                      item.roadAddress || item.address || '주소 정보 없음'
                    }
                  />
                )}
              </View>
            )}
          </FormField>

          <FormField
            label="함께한 친구"
            onLayout={(y) => {
              keyboard.fieldOffsetRef.current.withFriends = y;
            }}
          >
            <View style={styles.suggestField}>
              <TextInput
                style={styles.input}
                ref={friendInputRef}
                value={form.withFriends ?? ''}
                onChangeText={(text) => {
                  setForm((prev) => ({ ...prev, withFriends: text }));
                  setFriendKeyword(extractFriendKeyword(text));
                  setFriendActive(true);
                }}
                onFocus={() => {
                  keyboard.setFocusedField('withFriends');
                  handleFocusSuggest('friend');
                  keyboard.scrollToField('withFriends', 90);
                }}
                onBlur={() => {
                  scheduleCloseSuggestions();
                  keyboard.setFocusedField(null);
                }}
                placeholder="예: @plate_master, @lazyduck"
              />
              {showFriendSuggestions && (
                <SuggestionList
                  items={friendSuggestions}
                  loading={friendLoading}
                  keyword={friendKeyword}
                  maxHeight={Math.max(
                    180,
                    Dimensions.get('window').height -
                      keyboard.keyboardHeight -
                      (keyboard.fieldOffsetRef.current.withFriends + 100),
                  )}
                  onSelect={handleSelectFriend}
                  renderTitle={(item) => `@${item.username}`}
                  renderSubtitle={(item) => item.nickname}
                />
              )}
            </View>
          </FormField>

          {loadingFeed ? <Text style={styles.helperText}>불러오는 중…</Text> : null}

          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.saveButtonText}>
              {saving ? '저장 중…' : editingFeedId ? '수정하기' : '등록하기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
};

export default ImageFeedEditorScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  toggleRow: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f1f3f7',
    borderRadius: 18,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7dce5',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7a8291',
  },
  toggleTextActive: {
    color: '#111',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d6dae1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  suggestField: {
    position: 'relative',
  },
  lockedInput: {
    justifyContent: 'center',
    gap: 2,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1f2a',
  },
  lockedSubtitle: {
    fontSize: 12,
    color: '#6f7782',
  },
  lockedHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#9aa0ab',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6f7782',
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  });
