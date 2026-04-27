// src/screens/videoFeeds/types/index.ts
import type { Asset } from 'react-native-image-picker';

export interface VideoPostPayload {
  title: string;
  storeName: string;
  placeId: string;
  videoUrl: string;
  address: string;
  description: string;
  withFriends: string;
}

export interface VideoFormState extends VideoPostPayload {
  selectedAsset: Asset | null;
}

export interface NaverPlaceSuggestion {
  title: string;
  address?: string;
  roadAddress?: string;
}

export interface FriendProfile {
  id: number;
  username: string;
  nickname: string;
}

export interface SuggestionState<T> {
  items: T[];
  loading: boolean;
  keyword: string;
  isActive: boolean;
}

export interface VideoPreviewState {
  loading: boolean;
  ready: boolean;
  muted: boolean;
  uri: string;
}

export interface KeyboardState {
  height: number;
  focusedField: 'address' | 'withFriends' | 'content' | null;
}

export interface FieldOffsets {
  address: number;
  withFriends: number;
  content: number;
}
