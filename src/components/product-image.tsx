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
  if (presentation === 'original' || !validFrame(imageFrame)) return <Image {...props} style={[props.style, { backgroundColor: '#FFFFFF' }]} contentFit={contentFit} />;
  const source = props.source as { uri?: string } | undefined;
  return <FramedImage key={source?.uri} {...props} imageFrame={imageFrame} />;
}

function FramedImage({ imageFrame, style, onLoad, onError, ...props }: Props & { imageFrame: ImageFrame }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // Match the Admin's square framing canvas, then contain that canvas in the slot.
  // Applying cover directly to each rectangular slot changed both scale and travel.
  const side = Math.min(box.width, box.height);
  const geometry = size && side > 0
    ? frameGeometry(size.width, size.height, side, side, imageFrame) : null;
  return <View style={[style, { overflow: 'hidden', backgroundColor: '#FFFFFF' }]} onLayout={event => setBox(event.nativeEvent.layout)}>
    <View style={{ position: 'absolute', width: side, height: side,
      left: (box.width - side) / 2, top: (box.height - side) / 2, overflow: 'hidden' }}>
    <Image {...props} contentFit="fill"
      style={geometry ? { position: 'absolute', width: geometry.width, height: geometry.height, left: geometry.left, top: geometry.top } : [StyleSheet.absoluteFill, { opacity: 0 }]}
      // Hide the temporary unmeasured image rather than flashing the wrong crop.
      onLoad={event => { setSize(event.source); onLoad?.(event); }}
      onError={event => { setSize(null); onError?.(event); }} />
    </View>
  </View>;
}
