import { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

// Keep the previous image mounted until its replacement has actually displayed.
export function HomeImage({ uri, cacheKey = uri, style }: { uri: string; cacheKey?: string; style: StyleProp<ViewStyle> }) {
  const desired = useRef(cacheKey);
  useLayoutEffect(() => { desired.current = cacheKey; }, [cacheKey]);
  const [displayed, setDisplayed] = useState<{ uri: string; cacheKey: string } | null>(null);
  const [failed, setFailed] = useState('');
  const sources = displayed ? [displayed] : [];
  if (uri && failed !== cacheKey && displayed?.cacheKey !== cacheKey) sources.push({ uri, cacheKey });
  return <View style={[style, styles.surface]}>
    {!displayed && <View style={styles.placeholder} accessibilityLabel="Image placeholder">
      <Ionicons name={failed === cacheKey ? 'image-outline' : 'images-outline'} size={28} color="#C9B9A6" />
    </View>}
    {sources.map(source =>
      <Image key={source.cacheKey} source={source} style={StyleSheet.absoluteFill}
        contentFit="cover" cachePolicy="memory-disk" transition={180}
        onDisplay={() => { if (source.cacheKey === desired.current) setDisplayed(source); }}
        onError={() => { if (source.cacheKey === desired.current) setFailed(source.cacheKey); }} />)}
  </View>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: '#EEE5D8', overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
