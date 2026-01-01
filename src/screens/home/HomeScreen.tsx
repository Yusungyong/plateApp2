// src/screens/Home/HomeScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../auth/AuthProvider';

import {
  fetchHomeVideoThumbnails,
  HomeVideoThumbnail,
} from '../../api/homeVideoApi';
import HomeVideoPreviewRow from './contents/HomeVideoPreviewRow';

import {
  fetchHomeImageThumbnails,
  HomeImageThumbnail,
} from '../../api/homeImageApi';
import HomeImageThumbnailGrid from './contents/HomeImageThumbnailGrid';

import AppLayout from '../../components/layout/AppLayout';
import FooterTabBar from '../../navigation/FooterTabBar';
import { useAutoHideFooter } from '../../components/common/useAutoHideFooter';

// ✅ RootStack 타입 가져오기 (경로 주의: HomeScreen은 src/screens/Home 아래)
import type { RootStackParamList } from '../../navigation/MainNavigation';

const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const isFocused = useIsFocused();

  // ✅ 네비게이션
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 🔹 비디오 썸네일
  const [videos, setVideos] = useState<HomeVideoThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🔹 이미지 썸네일(최신 4개)
  const [imageThumbs, setImageThumbs] = useState<HomeImageThumbnail[]>([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgErrorMsg, setImgErrorMsg] = useState<string | null>(null);

  // 🔥 공용 훅: 활동 없으면 Footer 다시 등장
  const { footerVisible, notifyActivity } = useAutoHideFooter(500);

  /** 🔹 홈 상단 비디오 목록 로딩 */
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // ✅ user 정보를 넘겨서 username / guestId 기준으로 조회
      const page = await fetchHomeVideoThumbnails(0, 10, user);
      setVideos(page.content ?? []);
    } catch (e) {
      console.warn('fetchHomeVideoThumbnails error', e);
      setErrorMsg('비디오 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** 🔹 홈 이미지 썸네일(최신 4개) 로딩 */
  const loadImageThumbs = useCallback(async () => {
    try {
      setImgLoading(true);
      setImgErrorMsg(null);

      const items = await fetchHomeImageThumbnails(4);
      setImageThumbs(items ?? []);
    } catch (e: any) {
      console.warn(
        'fetchHomeImageThumbnails error',
        e?.response?.status,
        e?.response?.data,
      );
      setImgErrorMsg('이미지 피드를 불러오는 데 실패했습니다.');
    } finally {
      setImgLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
    loadImageThumbs();
  }, [loadVideos, loadImageThumbs]);

  // 🔥 스크롤 이벤트를 "사용자 활동"으로 보고 훅에 알림
  const handleScroll = useCallback(
    (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
      notifyActivity();
    },
    [notifyActivity],
  );

  return (
    <AppLayout
      title="홈"
      showBack={false}
      showNotification={true}
      footer={footerVisible ? <FooterTabBar /> : null}
      onPressNotification={() => console.log('알림 이동')}
    >
      <ScrollView
        style={styles.scroll}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* 🔹 상단 비디오 영역 */}
        <HomeVideoPreviewRow
          isFocused={isFocused}
          videos={videos}
          loading={loading}
          errorMsg={errorMsg}
          onReload={loadVideos}
        />

        {/* ✅ 비디오 밑: 최신 이미지 4개 썸네일 그리드 */}
        <HomeImageThumbnailGrid
          items={imageThumbs}
          loading={imgLoading}
          errorMsg={imgErrorMsg}
          onReload={loadImageThumbs}
          onPressItem={(item) => {
            // ✅ 썸네일 탭 -> 이미지 뷰어로 이동
            navigation.navigate('ImageFeedViewer', { feedId: item.feedNo });
          }}
        />

        {/* 🔹 기존 홈 콘텐츠 */}
        <View style={styles.homeContent}>
          <Text style={styles.title}>홈 화면</Text>
          <Text style={styles.sub}>로그인한 사용자: {user?.username}</Text>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppLayout>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  homeContent: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  logoutButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#d9534f',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
  },
});
