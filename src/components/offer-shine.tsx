import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

// One faint band for the whole carousel; images and gestures remain unobstructed.
export function OfferShine() {
  const [progress] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => { active = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (!focused || !foreground || reducedMotion || !width) return;
    progress.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(3500), Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); progress.setValue(0); };
  }, [focused, foreground, reducedMotion, width, progress]);
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {!reducedMotion && focused && foreground && <Animated.View style={[styles.band, {
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-100, width + 100] }) }, { skewX: '-18deg' }],
    }]} />}
  </View>;
}
const styles = StyleSheet.create({ band: { position: 'absolute', top: -20, bottom: -20, width: 36, backgroundColor: 'rgba(255,255,255,0.18)' } });
