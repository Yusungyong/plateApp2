// src/screens/videoFeeds/VideoPostEditorScreen.tsx
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
import Config from 'react-native-config';

import AppLayout from '../../components/layout/AppLayout';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { createVideoPost, updateVideoPost, updateVideoPostWithFile } from '../../api/videoFeedApi';
import { useAuth } from '../../auth/AuthProvider';
import { useTheme } from '../../styles/theme';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { searchFriends } from '../../api/friendsApi';
import { geocodeAddress } from '../../api/geocodingApi';
import { createPlace } from '../../api/placeApi';
import { createFriendVisits } from '../../api/friendVisitsApi';

import { useVideoForm } from './hooks/useVideoForm';
import { useVideoPreview } from './hooks/useVideoPreview';
import { useKeyboardAware } from './hooks/useKeyboardAware';
import VideoPreview from './components/VideoPreview';
import FormField from './components/FormField';
import SuggestionList from './components/SuggestionList';
import type { NaverPlaceSuggestion, FriendProfile } from './types';
import {
  stripHtml,
  extractFriendKeyword,
  parseFriends,
  mergeFriendValue,
} from './utils/suggestionUtils';
import { pickVideo, getVideoFileName, getVideoType, withTimeout, todayDate } from './utils/videoUtils';
import { validateVideoPost } from './utils/formValidation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'VideoPostEditor'>;

const SUGGEST_LIMIT = 6;

const VideoPostEditorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const editingStoreId = route.params?.storeId;
  const { form, selectedAsset, setSelectedAsset, updateField, updateMultipleFields } = useVideoForm({
    initialTitle: route.params?.initialTitle,
    initialStoreName: route.params?.initialStoreName,
    initialPlaceId: route.params?.initialPlaceId,
    initialVideoUrl: route.params?.initialVideoUrl,
    initialAddress: route.params?.initialAddress,
  });

  const previewUri = selectedAsset?.uri ?? form.videoUrl ?? '';
  const preview = useVideoPreview(previewUri);
  const keyboard = useKeyboardAware();

  const [saving, setSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  // Address suggestion state
  const [locationInput, setLocationInput] = useState(
    [route.params?.initialStoreName, route.params?.initialAddress].filter(Boolean).join(' · ')
  );
  const [locationLocked, setLocationLocked] = useState(Boolean(locationInput));
  const [addressSuggestions, setAddressSuggestions] = useState<NaverPlaceSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressKeyword, setAddressKeyword] = useState('');
  const [addressActive, setAddressActive] = useState(false);

  // Friend suggestion state
  const [friendSuggestions, setFriendSuggestions] = useState<FriendProfile[]>([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendKeyword, setFriendKeyword] = useState('');
  const [friendActive, setFriendActive] = useState(false);

  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendInputRef = useRef<TextInput | null>(null);
  const locationInputRef = useRef<TextInput | null>(null);

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
    if (user?.username) return;
    requireLogin({
      message: '영상 등록은 로그인 후 사용할 수 있어요.',
      onCancel: () => navigation.goBack(),
    });
  }, [navigation, requireLogin, user?.username]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

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

  const handlePickVideo = async () => {
    setIsPicking(true);
    try {
      const asset = await pickVideo();
      if (!asset?.uri) {
        setIsPicking(false);
        return;
      }
      setSelectedAsset(asset);
      updateField('videoUrl', asset.uri);
    } catch {
      Alert.alert('실패', '영상 파일을 불러오지 못했어요.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleSelectAddress = (item: NaverPlaceSuggestion) => {
    const name = stripHtml(item.title ?? '');
    const address = item.roadAddress || item.address || '';
    updateMultipleFields({ storeName: name, address });
    setLocationInput([name, address].filter(Boolean).join(' · '));
    setLocationLocked(true);
    setAddressKeyword('');
    setAddressSuggestions([]);
    setAddressActive(false);
  };

  const handleSelectFriend = (friend: FriendProfile) => {
    const nextValue = mergeFriendValue(form.withFriends ?? '', friend.username);
    updateField('withFriends', nextValue);
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

  const handleSubmit = async () => {
    const validation = validateVideoPost(form, selectedAsset, user?.username);
    if (!validation.valid) {
      return;
    }

    setSaving(true);
    try {
      if (editingStoreId) {
        const hasNewFile = Boolean(selectedAsset?.uri);
        if (hasNewFile) {
          const geocodeResult = await geocodeAddress(form.address);
          if (!geocodeResult) {
            Alert.alert('주소 확인 필요', '주소를 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
            return;
          }

          const body = new FormData();
          const fileUri = selectedAsset?.uri;
          if (!fileUri) {
            throw new Error('Missing video file');
          }
          const name = getVideoFileName(selectedAsset);
          const type = getVideoType(selectedAsset);
          body.append('file', { uri: fileUri, name, type } as unknown as Blob);

          const finalStoreName = form.storeName?.trim() || form.address?.trim() || '';
          body.append('storeName', finalStoreName);
          body.append('placeId', geocodeResult.placeId);
          body.append('address', geocodeResult.formattedAddress);
          body.append('lat', String(geocodeResult.lat));
          body.append('lng', String(geocodeResult.lng));
          if (form.description) body.append('description', form.description);
          if (form.withFriends) body.append('withFriends', form.withFriends);
          body.append('muteYn', preview.muted ? 'Y' : 'N');
          body.append('openYn', 'Y');
          body.append('useYn', 'Y');

          await updateVideoPostWithFile(editingStoreId, body);
        } else {
          const geocodeResult = await geocodeAddress(form.address);
          if (!geocodeResult) {
            Alert.alert('주소 확인 필요', '주소를 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
            return;
          }

          const payload: Partial<{
            title: string;
            storeName: string;
            placeId: string;
            address: string;
            lat: number;
            lng: number;
            description: string;
            withFriends: string;
          }> = {};

          const title = form.title.trim();
          const storeName = form.storeName.trim();
          const description = form.description.trim();
          const withFriends = form.withFriends.trim();
          const finalStoreName = storeName || form.address?.trim() || '';

          if (title) payload.title = title;
          if (finalStoreName) payload.storeName = finalStoreName;
          payload.placeId = geocodeResult.placeId;
          payload.address = geocodeResult.formattedAddress;
          payload.lat = geocodeResult.lat;
          payload.lng = geocodeResult.lng;
          if (description) payload.description = description;
          if (withFriends) payload.withFriends = withFriends;

          await updateVideoPost(editingStoreId, payload);
        }
      } else {
        const body = new FormData();
        const fileUri = selectedAsset?.uri ?? form.videoUrl;
        if (!fileUri) {
          throw new Error('Missing video file');
        }
        const geocodeResult = await geocodeAddress(form.address);
        if (!geocodeResult) {
          Alert.alert('주소 확인 필요', '주소를 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
          return;
        }
        const name = getVideoFileName(selectedAsset);
        const type = getVideoType(selectedAsset);
        body.append('file', { uri: fileUri, name, type } as unknown as Blob);
        const finalStoreName = form.storeName?.trim() || form.address?.trim() || '';
        body.append('storeName', finalStoreName);
        body.append('placeId', geocodeResult.placeId);
        body.append('address', geocodeResult.formattedAddress);
        body.append('lat', String(geocodeResult.lat));
        body.append('lng', String(geocodeResult.lng));
        if (form.description) body.append('description', form.description);
        if (form.withFriends) body.append('withFriends', form.withFriends);
        body.append('muteYn', preview.muted ? 'Y' : 'N');
        body.append('openYn', 'Y');
        body.append('useYn', 'Y');
        const uploadResult = await createVideoPost(body);
        const storeId = uploadResult?.storeId;
        if (!storeId) {
          throw new Error('Missing storeId from upload response');
        }
        const friends = parseFriends(form.withFriends ?? '');
        const visitDate = todayDate();
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
        if (friends.length > 0) {
          tasks.push(
            withTimeout(
              createFriendVisits({ storeId, visitDate, friends }),
              8000,
              'friendVisits',
            ),
          );
        }
        const results = await Promise.allSettled(tasks);
        const failed = results.find((result) => result.status === 'rejected');
        if (failed) {
          }
      }
      Alert.alert('완료', editingStoreId ? '영상 정보를 수정했어요.' : '새 영상을 등록했어요.');
      navigation.goBack();
    } catch {
      Alert.alert('실패', '영상 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  // Address suggestion effect
  React.useEffect(() => {
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
          `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(keyword)}&display=${SUGGEST_LIMIT}`,
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

  // Friend suggestion effect
  React.useEffect(() => {
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
      title={editingStoreId ? '영상 수정' : '새 영상 등록'}
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
            <TouchableOpacity style={[styles.toggleButton, styles.toggleActive]}>
              <Text style={[styles.toggleText, styles.toggleTextActive]}>동영상</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation.replace('ImageFeedEditor')}
              accessibilityRole="button"
              accessibilityLabel="이미지 등록 화면으로 이동"
            >
              <Text style={styles.toggleText}>이미지</Text>
            </TouchableOpacity>
          </View>

          <VideoPreview
            uri={previewUri}
            muted={preview.muted}
            ready={preview.ready}
            loading={preview.loading}
            isPicking={isPicking}
            onPress={handlePickVideo}
            onToggleMute={preview.toggleMute}
            onLoadStart={preview.handleLoadStart}
            onReadyForDisplay={preview.handleReadyForDisplay}
            onError={preview.handleError}
          />

          <FormField
            label="주소/식당 이름"
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
                  updateMultipleFields({ address: '', storeName: '' });
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
                    updateMultipleFields({ address: text, storeName: text });
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
                  updateField('withFriends', text);
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

          <FormField
            label="내용"
            onLayout={(y) => {
              keyboard.fieldOffsetRef.current.content = y;
            }}
          >
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.description ?? ''}
              onChangeText={(text) => updateField('description', text)}
              onFocus={() => {
                keyboard.setFocusedField('content');
                keyboard.scrollToField('content', 120);
              }}
              onBlur={() => keyboard.setFocusedField(null)}
              placeholder="영상에 대한 내용을 적어주세요."
              multiline
              numberOfLines={4}
            />
          </FormField>

          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.saveButtonText}>
              {saving ? '저장 중…' : editingStoreId ? '수정하기' : '등록하기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
};

export default VideoPostEditorScreen;

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
  suggestField: {
    position: 'relative',
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
