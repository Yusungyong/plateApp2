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
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import Config from 'react-native-config';
import { FEED_IMAGE_BUCKET } from '../../config/buckets';
import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import {
  createImageFeed,
  updateImageFeed,
  fetchImageFeedViewer,
  addImageFeedImages,
  type ImageFeedPayload,
} from '../../api/imageFeedApi';
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
} from '../videoFeeds/utils/suggestionUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ImageFeedEditor'>;

const ImageFeedEditorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const keyboard = useKeyboardAware();

  const editingFeedId = route.params?.feedId;
  const [form, setForm] = useState<ImageFeedPayload>({
    content: route.params?.initialContent ?? '',
    address: route.params?.initialAddress ?? '',
    storeName: route.params?.initialStoreName ?? '',
    placeId: route.params?.initialPlaceId ?? '',
    withFriends: route.params?.initialWithFriends ?? '',
    imageUrls: route.params?.initialImages ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);

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

  const handleChange = (key: keyof ImageFeedPayload, value: string) => {
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
    if (route.params?.initialContent) {
      loadedFeedRef.current = true;
      return;
    }

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

        const images = Array.isArray(data.images)
          ? data.images.map((img) => joinUrl(imageBucket, img.fileName)).filter(Boolean)
          : [];

        setForm((prev) => ({
          ...prev,
          content: data.content ?? '',
          address: data.location ?? '',
          storeName: data.storeName ?? '',
          placeId: data.placeId ?? '',
          withFriends: (data as any).withFriends ?? '',
          imageUrls: images.length ? images : prev.imageUrls,
        }));

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
  }, [editingFeedId, route.params?.initialContent]);

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
      });
      if (result.didCancel || !result.assets?.length) return;
      const urls = result.assets
        .map((asset) => asset.uri)
        .filter((uri): uri is string => !!uri);
      if (!urls.length) return;

      if (editingFeedId) {
        const body = new FormData();
        urls.forEach((uri, index) => {
          const name = uri.split('/').pop() || `image-${Date.now()}-${index}.jpg`;
          const ext = name.split('.').pop()?.toLowerCase();
          const type =
            ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/jpeg';
          body.append('files', { uri, name, type } as unknown as Blob);
        });
        const res = await addImageFeedImages(editingFeedId, body);
        const imageBucket = FEED_IMAGE_BUCKET || '';
        const joinUrl = (base?: string, path?: string | null) => {
          if (!path) return '';
          if (/^https?:\/\//i.test(path)) return path;
          if (!base) return path;
          const b = base.endsWith('/') ? base.slice(0, -1) : base;
          const p = path.startsWith('/') ? path.slice(1) : path;
          return `${b}/${p}`;
        };
        const newImages = Array.isArray(res?.images)
          ? res.images.map((img: any) => joinUrl(imageBucket, img.fileName)).filter(Boolean)
          : urls;
        setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...newImages] }));
      } else {
        setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...urls] }));
      }
    } catch {
      Alert.alert('실패', '이미지를 불러오지 못했어요.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleSubmit = async () => {
    if (!requireLogin({ message: '이미지 등록은 로그인 후 사용할 수 있어요.' })) return;
    if (!form.content.trim() || !form.address.trim() || form.imageUrls.length === 0) {
      Alert.alert('필수 정보 확인', '내용, 주소, 최소 1장의 이미지가 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      if (editingFeedId) {
        await updateImageFeed(editingFeedId, form);
      } else {
        const body = new FormData();
        form.imageUrls.forEach((uri, index) => {
          const name = uri.split('/').pop() || `image-${Date.now()}-${index}.jpg`;
          const ext = name.split('.').pop()?.toLowerCase();
          const type =
            ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/jpeg';
          body.append('files', { uri, name, type } as unknown as Blob);
        });
        body.append('content', form.content);
        body.append('address', form.address);
        if (form.storeName) body.append('storeName', form.storeName);
        if (form.placeId) body.append('placeId', form.placeId);
        if (form.withFriends) body.append('withFriends', form.withFriends);
        body.append('openYn', 'Y');
        body.append('useYn', 'Y');
        await createImageFeed(body);
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
            images={form.imageUrls}
            isPicking={isPicking}
            onPress={handlePickImages}
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
