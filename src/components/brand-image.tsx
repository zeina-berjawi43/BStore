import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { brandFrameGeometry, type ContainedBrandFrame } from '../services/brand-image-frame';

// Only Brand v2 uses contained-logo geometry. Product and legacy crops keep
// their existing renderer, frame interpretation and loading callbacks.
export function BrandImage({ imageFrame, style, onLoad, onError, ...props }: ImageProps & { imageFrame: ContainedBrandFrame }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const side = Math.min(box.width, box.height);
  const g = size && side > 0 ? brandFrameGeometry(size.width, size.height, side, side, imageFrame) : null;
  return <View style={[style, { overflow: 'hidden', backgroundColor: '#FFFFFF' }]}
    onLayout={event => setBox(event.nativeEvent.layout)}>
    <View style={{ position: 'absolute', width: side, height: side, left: (box.width - side) / 2, top: (box.height - side) / 2, overflow: 'hidden' }}>
      <Image {...props} contentFit="fill"
        style={g ? { position: 'absolute', width: g.width, height: g.height, left: g.left, top: g.top } : [StyleSheet.absoluteFill, { opacity: 0 }]}
        onLoad={event => { setSize(event.source); onLoad?.(event); }}
        onError={event => { setSize(null); onError?.(event); }} />
    </View>
  </View>;
}
