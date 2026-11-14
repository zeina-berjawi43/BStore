import { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ProductImage } from './product-image';
import { validFrame, type ImageFrame } from '../services/image-frame';

type Source = { uri: string; cacheKey: string; displayKey: string; imageFrame?: ImageFrame };
type Props = { uri: string; cacheKey?: string; style: StyleProp<ViewStyle>;
  brand?: { logoSize: number; imageFrame?: ImageFrame } };

// Keep the previous image mounted until its replacement has actually displayed.
export function HomeImage({ uri, cacheKey = uri, style, brand }: Props) {
  // Crop edits reuse the image cache, but must not reuse obsolete display callbacks.
  const frame = brand?.imageFrame;
  const displayKey = brand && validFrame(frame) ? `${cacheKey}:${frame.zoom}:${frame.x}:${frame.y}` : cacheKey;
  const desired = useRef(displayKey);
  useLayoutEffect(() => { desired.current = displayKey; }, [displayKey]);
  const [displayed, setDisplayed] = useState<Source | null>(null);
  const [failed, setFailed] = useState('');
  const failedSource = useRef('');
  const sources = displayed ? [displayed] : [];
  if (uri && failed !== displayKey && displayed?.displayKey !== displayKey) sources.push({ uri, cacheKey, displayKey, imageFrame: frame });
  return <View style={[style, styles.surface, brand && styles.brandSurface]}>
    {!displayed && <View style={[styles.placeholder, brand && styles.brandPlaceholder]} accessibilityLabel="Image placeholder">
      {(!brand || failed === displayKey) && <Ionicons name={failed === displayKey ? 'image-outline' : 'images-outline'} size={28} color="#C9B9A6" />}
    </View>}
    {sources.map(source => {
      const props = {
        source: { uri: source.uri, cacheKey: source.cacheKey },
        cachePolicy: 'memory-disk' as const, transition: brand ? 150 : 180,
        onDisplay: () => { if (source.displayKey === desired.current && source.displayKey !== failedSource.current) setDisplayed(source); },
        onError: () => { if (source.displayKey === desired.current) { failedSource.current = source.displayKey; setFailed(source.displayKey); } },
      };
      const pending = brand && source.displayKey !== displayed?.displayKey ? { opacity: 0 } : undefined;
      return brand && validFrame(source.imageFrame)
        ? <ProductImage key={source.displayKey} {...props} imageFrame={source.imageFrame}
          style={[StyleSheet.absoluteFill, pending]} accessible={false} />
        : <Image key={source.displayKey} {...props}
          style={brand ? [styles.brandLogo, { width: brand.logoSize, height: brand.logoSize }, pending] : StyleSheet.absoluteFill}
          contentFit={brand ? 'contain' : 'cover'} accessible={brand ? false : undefined} />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: '#EEE5D8', overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  brandSurface: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  brandPlaceholder: { backgroundColor: '#EEE5D8' },
  brandLogo: { position: 'absolute' },
});
