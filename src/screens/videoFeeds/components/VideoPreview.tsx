// src/screens/videoFeeds/components/VideoPreview.tsx
import React, { memo, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';

const PORTRAIT_ASPECT_RATIO = 9 / 14;
type VideoPlayerRef = React.ElementRef<typeof Video>;

interface VideoPreviewProps {
  uri: string;
  muted: boolean;
  ready: boolean;
  loading: boolean;
  isPicking: boolean;
  onPress: () => void;
  onToggleMute: () => void;
  onLoadStart: () => void;
  onReadyForDisplay: () => void;
  onError: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  uri,
  muted,
  ready,
  loading: _loading,
  isPicking,
  onPress,
  onToggleMute,
  onLoadStart,
  onReadyForDisplay,
  onError,
}) => {
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<VideoPlayerRef | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handlePress = () => {
    if (!uri) {
      onPress();
      return;
    }
    setShowControls(true);
    hideControlsAfterDelay();
  };

  const handlePlayPause = () => {
    setPaused(!paused);
    setShowControls(true);
    if (!paused) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      hideControlsAfterDelay();
    }
  };

  const handleProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
  };

  const handleLoad = (data: { duration: number }) => {
    setDuration(data.duration);
  };

  const handleSeek = (value: number) => {
    videoRef.current?.seek(value);
    setCurrentTime(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!uri) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.placeholder]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="film-outline" size={32} color="#9aa0ab" />
        <Text style={styles.placeholderTitle}>동영상 추가</Text>
        <Text style={styles.placeholderText}>탭해서 앨범에서 선택</Text>
        {isPicking && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1f2431" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Video
        ref={videoRef}
        key={uri}
        source={{ uri }}
        style={[styles.video, !ready && styles.videoHidden]}
        paused={paused}
        repeat
        muted={muted}
        onLoadStart={onLoadStart}
        onLoad={handleLoad}
        onReadyForDisplay={onReadyForDisplay}
        onError={onError}
        onProgress={handleProgress}
        progressUpdateInterval={100}
      />
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {showControls && ready && (
        <>
          {/* 재생/일시정지 버튼 */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={paused ? 'play' : 'pause'}
              size={40}
              color="#fff"
            />
          </TouchableOpacity>

          {/* 하단 컨트롤 바 */}
          <View style={styles.controlsBar}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Slider
              style={styles.progressBar}
              value={currentTime}
              minimumValue={0}
              maximumValue={duration}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#fff"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>

            <TouchableOpacity
              style={styles.muteButton}
              onPress={onToggleMute}
              activeOpacity={0.8}
            >
              <Ionicons
                name={muted ? 'volume-mute-outline' : 'volume-high-outline'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

export default memo(VideoPreview);

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1f2431',
    width: '100%',
    aspectRatio: PORTRAIT_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#f5f6f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7dbe5',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoHidden: {
    opacity: 0,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  placeholderTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#2b2f36',
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 12,
    color: '#8a909b',
  },
  playPauseButton: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 40,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  muteButton: {
    paddingHorizontal: 8,
  },
});
