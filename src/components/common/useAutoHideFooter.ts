// src/hooks/useAutoHideFooter.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';

export function useAutoHideFooter(idleMs: number = 2000) {
  const [footerVisible, setFooterVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnimationRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateFooter = () => {
    const now = Date.now();
    if (now - lastAnimationRef.current < 120) {
      return;
    }
    lastAnimationRef.current = now;
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
  };

  const hideFooter = useCallback(() => {
    setFooterVisible((prev) => {
      if (!prev) return prev;
      animateFooter();
      return false;
    });
  }, []);

  const showFooter = useCallback(() => {
    setFooterVisible((prev) => {
      if (prev) return prev;
      animateFooter();
      return true;
    });
  }, []);

  // 🔥 사용자 활동(스크롤 등) 발생 시 호출
  const notifyActivity = useCallback(() => {
    // 이전 타이머 제거
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // 활동 중에는 Footer 숨김
    setFooterVisible(prev => {
      if (prev) {
        animateFooter();
      }
      if (!prev) return prev; // 이미 숨겨져 있으면 그대로
      return false;
    });

    // idleMs 후에 다시 Footer 표시
    idleTimerRef.current = setTimeout(() => {
      animateFooter();
      setFooterVisible(true);
    }, idleMs);
  }, [idleMs]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  return {
    footerVisible,
    notifyActivity, // ← 이걸 onScroll 쪽에서 호출
    hideFooter,
    showFooter,
  };
}
