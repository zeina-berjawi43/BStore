import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A dismissible notice whose noninteractive content lets touches reach the screen.
export function useProductFeedback() {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<{ message: string; title: string } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-40));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const showAlert = useCallback((message: string, title = 'Added to Cart') => {
    const current = ++revision.current;
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation(); translateY.stopAnimation();
    setNotice({ message, title });
    AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
    opacity.setValue(0); translateY.setValue(-40);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    timer.current = setTimeout(() => {
      if (revision.current !== current) return;
      timer.current = null;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(translateY, { toValue: -25, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(({ finished }) => { if (finished && revision.current === current) setNotice(null); });
    }, 2200);
    return current;
  }, [opacity, translateY]);
  // Confirmation updates an existing notice; it never resurrects a dismissed
  // or expired action after a slow network response.
  const updateAlert = useCallback((current: number, message: string, title: string) => {
    if (revision.current !== current || timer.current === null) return;
    setNotice({ message, title });
    AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
  }, []);
  const dismiss = useCallback(() => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    opacity.stopAnimation(); translateY.stopAnimation(); setNotice(null);
  }, [opacity, translateY]);
  useEffect(() => () => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation(); translateY.stopAnimation();
  }, [opacity, translateY]);
  const feedback = notice ? <View style={[StyleSheet.absoluteFill, { zIndex: 9999, pointerEvents: 'box-none' }]}><Animated.View accessibilityLiveRegion="polite"
    style={[styles.alert, { top: insets.top + 8, opacity, transform: [{ translateY }], pointerEvents: 'box-none' }]}>
    <View style={[styles.icon, { pointerEvents: 'none' }]}><Ionicons name={notice.title === 'Updating cart' ? 'time-outline' : 'checkmark'} size={20} color="#FFFFFF" /></View>
    <View style={[styles.content, { pointerEvents: 'none' }]}><Text style={styles.title}>{notice.title}</Text><Text style={styles.message} numberOfLines={2}>{notice.message}</Text></View>
    <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={4} style={styles.close}><Ionicons name="close" size={20} color="#777168" /></Pressable>
  </Animated.View></View> : null;
  return { showAlert, updateAlert, feedback, dismiss };
}
const styles = StyleSheet.create({
  alert: { position: 'absolute', left: 18, right: 18, zIndex: 9999, minHeight: 67, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent', ...(Platform.OS === 'web' ? { boxShadow: '0px 7px 15px rgba(23, 23, 23, 0.13)' } : { shadowColor: '#171717', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.13, shadowRadius: 15, elevation: 10 }) },
  icon: { width: 41, height: 41, borderRadius: 21, backgroundColor: '#E35B3F', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '900', color: '#171717', marginBottom: 3 },
  message: { fontSize: 12, color: '#686158', lineHeight: 17 },
});
