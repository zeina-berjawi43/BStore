import { ReactNode, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// The loading artwork edge is #E7DED1. Contain preserves the full artwork.
export function StartupScreen({ children, onReady }: { children?: ReactNode; onReady?: () => void }) {
  const layoutReady = useRef(false), imageReady = useRef(false), reported = useRef(false);
  const reportReady = () => {
    if (layoutReady.current && imageReady.current && !reported.current) {
      reported.current = true;
      onReady?.();
    }
  };
  return <View style={styles.container} onLayout={() => { layoutReady.current = true; reportReady(); }}>
    <StatusBar style="dark" />
    <Image source={require('../../assets/images/loading-screen.png')}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="contain"
      onLoad={() => { imageReady.current = true; reportReady(); }} />
    {children}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E7DED1', alignItems: 'center', justifyContent: 'center' },
});
