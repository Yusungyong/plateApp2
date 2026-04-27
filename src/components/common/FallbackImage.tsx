import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  ImageResizeMode,
  ImageStyle,
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ImageErrorEventData,
} from 'react-native';

type Props = {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  placeholderText?: string;
  onError?: (event: NativeSyntheticEvent<ImageErrorEventData>) => void;
  imageProps?: Omit<ImageProps, 'source' | 'style' | 'resizeMode' | 'onError'>;
};

const FallbackImage: React.FC<Props> = ({
  uri,
  style,
  resizeMode = 'cover',
  placeholderText = '이미지 없음',
  onError,
  imageProps,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  if (!uri || hasError) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri, cache: 'force-cache' }}
      style={style}
      resizeMode={resizeMode}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
      {...imageProps}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f4',
  },
  placeholderText: {
    color: '#7b8591',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FallbackImage;
