// src/screens/videoFeeds/hooks/useKeyboardAware.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Platform, ScrollView } from 'react-native';
import type { KeyboardState, FieldOffsets } from '../types';

export const useKeyboardAware = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedField, setFocusedField] = useState<KeyboardState['focusedField']>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const fieldOffsetRef = useRef<FieldOffsets>({
    address: 0,
    withFriends: 0,
    content: 0,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!focusedField) {
      return;
    }
    const offset = fieldOffsetRef.current[focusedField];
    if (offset == null) {
      return;
    }
    const handle = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, offset - 80),
        animated: true,
      });
    }, 120);
    return () => clearTimeout(handle);
  }, [focusedField, keyboardHeight]);

  const scrollToField = useCallback((field: keyof FieldOffsets, offset = 80) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, fieldOffsetRef.current[field] - offset),
        animated: true,
      });
    });
  }, []);

  return {
    keyboardHeight,
    focusedField,
    setFocusedField,
    scrollRef,
    fieldOffsetRef,
    scrollToField,
  };
};
