import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';

import { useTheme } from '../../styles/theme';

const BACKGROUND_IMAGES = [
  require('../../images/235009D4-9CFC-429E-B0D1-B8264B633BC7_1_105_c.jpeg'),
  require('../../images/26103132-52FE-4FE1-8544-CDE5F71FE74A_4_5005_c.jpeg'),
  require('../../images/272DF710-829A-4B10-B6CD-20E97119AEBD_1_102_o.jpeg'),
  require('../../images/2AFB7AC2-4338-41FC-B0A4-7FE863AB7DF9_1_105_c.jpeg'),
  require('../../images/BB4FC164-D856-40A9-A1F0-94028BAE4FAA_1_105_c.jpeg'),
  require('../../images/E5CD1450-BF95-4092-9446-ED2F152498F6_1_105_c.jpeg'),
];

const ACT_IMAGE = require('../../images/act/D7856748-121D-45C9-9EFB-B7EA30366E32.jpeg');
const BGM_SOURCE = require('../../sounds/4MEN_Four_Men_-_Propose_Song_(mp3.pm).mp3');
const PROPOSAL_LEAD_MS = 5000;
const AudioOnlyVideo = Video as unknown as React.ComponentType<
  React.ComponentProps<typeof Video> & { audioOnly?: boolean }
>;

const EventGateScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasMultipleBackgrounds = BACKGROUND_IMAGES.length > 1;

  const [layerOneIndex, setLayerOneIndex] = useState(0);
  const [layerTwoIndex, setLayerTwoIndex] = useState(hasMultipleBackgrounds ? 1 : 0);
  const layerOneOpacity = useRef(new Animated.Value(1)).current;
  const layerTwoOpacity = useRef(new Animated.Value(0)).current;
  const visibleIndexRef = useRef(0);
  const activeLayerRef = useRef<'one' | 'two'>('one');
  const imageFadeRef = useRef<Animated.CompositeAnimation | null>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('얘랑 결혼하시겠습니까?');
  const imageTransitioningRef = useRef(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const currentYRef = useRef(0);
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const pausedUntilRef = useRef(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proposalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownProposalRef = useRef(false);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const clearProposalTimer = useCallback(() => {
    if (proposalTimerRef.current) {
      clearTimeout(proposalTimerRef.current);
      proposalTimerRef.current = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    clearProposalTimer();
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    translateY.stopAnimation((value) => {
      currentYRef.current = value;
    });
  }, [clearProposalTimer, translateY]);

  const openProposalModal = useCallback(() => {
    setModalMessage('얘랑 결혼하시겠습니까?');
    setShowProposalModal(true);
    modalAnim.setValue(0);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [modalAnim]);

  const startAutoScroll = useCallback(() => {
    if (!contentHeight || !viewportHeight) return;
    if (isDraggingRef.current) return;

    const waitMs = pausedUntilRef.current - Date.now();
    if (waitMs > 0) {
      clearResumeTimer();
      resumeTimerRef.current = setTimeout(() => {
        startAutoScroll();
      }, waitMs + 16);
      return;
    }

    const minY = -contentHeight;
    const maxY = viewportHeight;
    const normalized = clamp(currentYRef.current, minY, maxY);
    translateY.setValue(normalized);
    currentYRef.current = normalized;

    const remainingDistance = Math.max(0, normalized - minY);
    const duration = Math.max(12000, remainingDistance * 58);

    if (!hasShownProposalRef.current) {
      const triggerInMs = Math.max(0, duration - PROPOSAL_LEAD_MS);
      clearProposalTimer();

      if (triggerInMs === 0) {
        hasShownProposalRef.current = true;
        stopAutoScroll();
        clearResumeTimer();
        openProposalModal();
        return;
      }

      proposalTimerRef.current = setTimeout(() => {
        if (hasShownProposalRef.current || isDraggingRef.current) return;
        hasShownProposalRef.current = true;
        stopAutoScroll();
        clearResumeTimer();
        openProposalModal();
      }, triggerInMs);
    }

    const anim = Animated.timing(translateY, {
      toValue: minY,
      duration,
      useNativeDriver: true,
    });

    animationRef.current = anim;
    anim.start(({ finished }) => {
      clearProposalTimer();
      animationRef.current = null;
      if (!finished || isDraggingRef.current) return;

      if (Date.now() < pausedUntilRef.current) {
        startAutoScroll();
        return;
      }

      translateY.setValue(maxY);
      currentYRef.current = maxY;
      startAutoScroll();
    });
  }, [
    clearProposalTimer,
    clearResumeTimer,
    contentHeight,
    openProposalModal,
    stopAutoScroll,
    translateY,
    viewportHeight,
  ]);

  const pauseFor = useCallback((ms: number) => {
    pausedUntilRef.current = Date.now() + ms;
    stopAutoScroll();
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        startAutoScroll();
      }
    }, ms + 16);
  }, [clearResumeTimer, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      currentYRef.current = value;
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  useEffect(() => {
    if (!contentHeight || !viewportHeight) return;
    currentYRef.current = viewportHeight;
    translateY.setValue(viewportHeight);
    startAutoScroll();
    return () => {
      stopAutoScroll();
      clearResumeTimer();
      clearProposalTimer();
    };
  }, [
    clearProposalTimer,
    clearResumeTimer,
    contentHeight,
    startAutoScroll,
    stopAutoScroll,
    translateY,
    viewportHeight,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          isDraggingRef.current = true;
          stopAutoScroll();
          clearResumeTimer();
          dragStartYRef.current = currentYRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const minY = -contentHeight;
          const maxY = viewportHeight;
          const nextY = clamp(dragStartYRef.current + gesture.dy, minY, maxY);
          translateY.setValue(nextY);
          currentYRef.current = nextY;
        },
        onPanResponderRelease: (_, gesture) => {
          isDraggingRef.current = false;
          const isTap = Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6;
          if (isTap) {
            pauseFor(3000);
            return;
          }
          pausedUntilRef.current = Date.now();
          startAutoScroll();
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          pausedUntilRef.current = Date.now();
          startAutoScroll();
        },
      }),
    [clearResumeTimer, contentHeight, pauseFor, startAutoScroll, stopAutoScroll, translateY, viewportHeight],
  );

  useEffect(() => {
    BACKGROUND_IMAGES.forEach((asset) => {
      const resolved = Image.resolveAssetSource(asset);
      if (resolved?.uri) {
        Image.prefetch(resolved.uri).catch(() => undefined);
      }
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (imageTransitioningRef.current || !hasMultipleBackgrounds) return;

      imageTransitioningRef.current = true;
      const next = (visibleIndexRef.current + 1) % BACKGROUND_IMAGES.length;
      const activeLayer = activeLayerRef.current;

      if (activeLayer === 'one') {
        setLayerTwoIndex(next);
        layerTwoOpacity.setValue(0);
        imageFadeRef.current = Animated.parallel([
          Animated.timing(layerOneOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(layerTwoOpacity, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]);
      } else {
        setLayerOneIndex(next);
        layerOneOpacity.setValue(0);
        imageFadeRef.current = Animated.parallel([
          Animated.timing(layerTwoOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(layerOneOpacity, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]);
      }

      imageFadeRef.current.start(({ finished }) => {
        imageFadeRef.current = null;
        if (finished) {
          visibleIndexRef.current = next;
          activeLayerRef.current = activeLayer === 'one' ? 'two' : 'one';
        }
        imageTransitioningRef.current = false;
      });
    }, 7000);

    return () => {
      clearInterval(timer);
      if (imageFadeRef.current) {
        imageFadeRef.current.stop();
        imageFadeRef.current = null;
      }
      imageTransitioningRef.current = false;
    };
  }, [hasMultipleBackgrounds, layerOneOpacity, layerTwoOpacity]);

  return (
    <View style={styles.safeArea}>
      <AudioOnlyVideo
        source={BGM_SOURCE}
        audioOnly
        repeat
        paused={false}
        playInBackground
        playWhenInactive
        ignoreSilentSwitch="ignore"
        style={styles.audioPlayer}
      />

      <View style={styles.bg}>
        <Animated.Image
          source={BACKGROUND_IMAGES[layerOneIndex]}
          style={[styles.bgImage, { opacity: layerOneOpacity }]}
          resizeMode="contain"
        />
        {hasMultipleBackgrounds ? (
          <Animated.Image
            source={BACKGROUND_IMAGES[layerTwoIndex]}
            style={[styles.bgImage, { opacity: layerTwoOpacity }]}
            resizeMode="contain"
          />
        ) : null}

        <View style={styles.overlay} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>편지 </Text>
          <View
            style={styles.marqueeViewport}
            onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
            {...panResponder.panHandlers}
          >
            <Animated.View
              style={{ transform: [{ translateY }] }}
              onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.marqueeText}>안녕 다현아</Text>
              <Text style={styles.marqueeText}>예비신랑 성용이야! :)</Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>우리가 만난 지 벌써 5년이 지났네 :)</Text>
              <Text style={styles.marqueeText}>시간이 이렇게 빨리 지나가다니 너무 놀랍다!</Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>
                편지를 쓰면서 함께한 기억들이 새록새록 떠오르는데 정말 다양하고 행복한 경험이 많았던거같아.
              </Text>
              <Text style={styles.marqueeText}>
                백수였던 나를 만나서 힘들었을 시간 참고 이겨내줘서 너무 고맙고
              </Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>
                그 외에도 이런 시간이 오게될 수 있었던대엔 너의 노력이 참 많았을것같아 고마워 
              </Text>
              <Text style={styles.marqueeText}>앞으로도 우리 행복하게 잘 지내보자</Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>
                서로 가족들 잘 챙기고,가끔은 이렇게 좋은 날도 같이 맞이하고 맛있는것도 많이 먹고!
              </Text>
              <Text style={styles.marqueeText}>돈도 많이 벌어서 여유있는 삶도 살고!</Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>
                그리고 프로포즈때 받고싶어했던 명품빽은 당장은 못해줬지만 우리 상황이 좀 더 개선되고
                여유가 생기면 가까운날 내가 꼭 선물해줄테니까 기다려!
              </Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>ps. 오늘 해장국집 너무 맛있었다 그치?</Text>
              <Text style={styles.marqueeText}>
                지금 프로포즈 주제곡 귀에꼽고 이거 쓰고있는데 흥얼거릴뻔하는거 꾹꾹 참고있어 ㅋㅋㅋㅋ
                이건 들키지 않고 서프라이즈 할수있으면 좋겠다!
              </Text>
              <View style={styles.paragraphGap} />
              <Text style={styles.marqueeText}>사랑해 다현아 ❤️</Text>
            </Animated.View>
          </View>
        </View>
      </View>

      <Modal visible={showProposalModal} transparent animationType="none">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowProposalModal(false)}
        >
          <Pressable style={styles.modalInner} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: modalAnim,
                  transform: [
                    {
                      scale: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={ACT_IMAGE} style={styles.modalImage} resizeMode="cover" />
              <Text style={styles.modalTitle}>{modalMessage}</Text>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalYesBtn}
                  activeOpacity={0.86}
                  onPress={() =>
                    setModalMessage('왼손에 있는 반지를 빼고 손을 앞으로 내밀어주세요!')
                  }
                >
                  <Text style={styles.modalYesText}>예</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalNoBtn}
                  activeOpacity={0.9}
                  onPress={() => Alert.alert('선택이 불가능한 옵션입니다.')}
                >
                  <Text style={styles.modalNoText}>아니오</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default EventGateScreen;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    bg: {
      flex: 1,
      backgroundColor: '#000',
    },
    bgImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.24)',
    },
    textWrap: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
      paddingTop: 56,
    },
    title: {
      color: '#fff',
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: 0.4,
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
      marginBottom: 12,
    },
    marqueeViewport: {
      marginTop: 8,
      overflow: 'hidden',
      width: '100%',
      height: 400,
    },
    marqueeText: {
      color: '#f8f8f8',
      fontSize: 20,
      lineHeight: 30,
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.32)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
      marginBottom: 6,
    },
    paragraphGap: {
      height: 20,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#fff',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#d9d9d9',
    },
    modalInner: {
      width: '100%',
      alignItems: 'center',
    },
    modalImage: {
      width: '100%',
      height: 280,
      backgroundColor: '#ededed',
    },
    modalTitle: {
      paddingHorizontal: 18,
      paddingTop: 16,
      fontSize: 23,
      fontWeight: '800',
      textAlign: 'center',
      color: '#1f1f1f',
    },
    modalButtonRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    modalYesBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
    },
    modalYesText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    modalNoBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: '#e7e7e7',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      opacity: 0.6,
    },
    modalNoText: {
      color: '#6f6f6f',
      fontSize: 15,
      fontWeight: '700',
    },
    audioPlayer: {
      width: 0,
      height: 0,
    },
  });
