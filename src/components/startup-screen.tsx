import { ReactNode, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Matches the native splash; the dedicated asset has no uneven blank padding.
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
    <Image source={require('../../assets/images/startup-logo.png')}
      style={styles.logo} resizeMode="contain"
      onLoad={() => { imageReady.current = true; reportReady(); }} />
    {children}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 140, height: 140 * 723 / 748 },
});
