// src/screens/videoFeeds/hooks/useVideoPreview.ts
import { useState, useRef, useEffect } from 'react';

export const useVideoPreview = (previewUri: string) => {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const loadingSinceRef = useRef(0);

  useEffect(() => {
    if (previewUri) {
      setLoading(true);
      setReady(false);
      loadingSinceRef.current = Date.now();
    } else {
      setLoading(false);
      setReady(false);
    }
  }, [previewUri]);

  const handleLoadStart = () => {
    setLoading(true);
    setReady(false);
    loadingSinceRef.current = Date.now();
  };

  const handleReadyForDisplay = () => {
    const elapsed = Date.now() - loadingSinceRef.current;
    const delay = elapsed < 300 ? 300 - elapsed : 0;
    if (delay > 0) {
      setTimeout(() => {
        setLoading(false);
        setReady(true);
      }, delay);
    } else {
      setLoading(false);
      setReady(true);
    }
  };

  const handleError = () => {
    setLoading(false);
    setReady(true);
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  return {
    loading,
    ready,
    muted,
    handleLoadStart,
    handleReadyForDisplay,
    handleError,
    toggleMute,
  };
};
