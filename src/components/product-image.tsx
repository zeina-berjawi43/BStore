import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { frameGeometry, ImageFrame, validFrame } from '../services/image-frame';

type Props = ImageProps & {
  imageFrame?: ImageFrame | null;
  resizeMode?: 'contain' | 'cover';
  presentation?: 'card' | 'original';
};

// One renderer for all product surfaces; older products retain their exact slot/fit.
export function ProductImage({ imageFrame, resizeMode, presentation, ...props }: Props) {
  const contentFit = props.contentFit || resizeMode || 'contain';
  if (presentation === 'original' || !validFrame(imageFrame)) return <Image {...props} contentFit={contentFit} />;
  const source = props.source as { uri?: string } | undefined;
  return <FramedImage key={source?.uri} {...props} imageFrame={imageFrame} />;
}

function FramedImage({ imageFrame, style, onLoad, onError, ...props }: Props & { imageFrame: ImageFrame }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const geometry = size && box.width && box.height
    ? frameGeometry(size.width, size.height, box.width, box.height, imageFrame) : null;
  return <View style={[style, { overflow: 'hidden' }]} onLayout={event => setBox(event.nativeEvent.layout)}>
    <Image {...props} contentFit="fill"
      style={geometry ? { position: 'absolute', width: geometry.width, height: geometry.height, left: geometry.left, top: geometry.top } : [StyleSheet.absoluteFill, { opacity: 0 }]}
      // Hide the temporary unmeasured image rather than flashing the wrong crop.
      onLoad={event => { setSize(event.source); onLoad?.(event); }}
      onError={event => { setSize(null); onError?.(event); }} />
  </View>;
}
