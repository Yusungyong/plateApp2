import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeMapPreview from './contents/HomeMapPreview';
import type { NearbyStoreMarker } from '../../api/mapStoreApi';
import { useAuth } from '../../auth/AuthProvider';
import type { RootStackParamList } from '../../navigation/MainNavigation';
import { lastKnownLocationStatusRef, lastKnownUserLocationRef } from './utils/mapUtils';
import type { HomeLocationStatus } from './types';

const FullScreenMapScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [centerUserFn, setCenterUserFn] = useState<(() => void) | undefined>();
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>(
    lastKnownUserLocationRef.current ? 'granted' : lastKnownLocationStatusRef.current,
  );
  const canCenterUser =
    locationStatus === 'granted' &&
    !!lastKnownUserLocationRef.current &&
    !!centerUserFn;

  const handleOpenFeed = useCallback(
    (marker: NearbyStoreMarker) => {
      if (!marker.placeId) {
        return;
      }
      if (
        marker.contentType?.toUpperCase() === 'IMAGE' &&
        marker.imageFeedId
      ) {
        navigation.navigate('ImageFeedViewer', { feedId: marker.imageFeedId });
        return;
      }
      navigation.navigate('VideoFeedScreen', {
        storeId: marker.storeId,
        placeId: marker.placeId,
        username: user?.username ?? undefined,
      });
    },
    [navigation, user?.username],
  );

  return (
    <View style={styles.container}>
      <HomeMapPreview
        key="fullscreen-map-reset"
        interactive
        isActive={isFocused}
        style={styles.map}
        onPressMarker={handleOpenFeed}
        onRequestCenterUser={setCenterUserFn}
        onLocationStatusChange={setLocationStatus}
      />
      <View
        pointerEvents="box-none"
        style={[styles.backButtonWrap, { top: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="홈으로 돌아가기"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.centerButtonWrap, { bottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={[styles.centerButton, !canCenterUser && styles.centerButtonDisabled]}
          onPress={() => centerUserFn?.()}
          disabled={!canCenterUser}
          accessibilityRole="button"
          accessibilityLabel="내 위치로 이동"
        >
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.centerButtonText}>내 위치</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FullScreenMapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  backButtonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  centerButtonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  centerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerButtonDisabled: {
    opacity: 0.45,
  },
  centerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
