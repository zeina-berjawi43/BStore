import { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// The artwork edge is #E7DED1. Contain preserves it on every window shape.
export function StartupScreen({ children }: { children?: ReactNode }) {
  return <View style={styles.container}>
    <StatusBar style="dark" />
    <Image source={require('../../assets/images/loading-screen.png')}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="contain" />
    {children}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E7DED1', alignItems: 'center', justifyContent: 'center' },
});
