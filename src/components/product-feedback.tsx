import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// One floating success message, above bottom navigation and clear of screen headers.
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
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -25, duration: 250, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished && revision.current === current) setNotice(null); });
    }, 2200);
  }, [opacity, translateY]);
  const dismiss = useCallback(() => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation(); translateY.stopAnimation(); setNotice(null);
  }, [opacity, translateY]);
  useEffect(() => () => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation(); translateY.stopAnimation();
  }, [opacity, translateY]);
  const favorite = notice?.title.includes('Favorites');
  const feedback = notice ? <Animated.View accessibilityLiveRegion="polite"
    style={[styles.alert, { bottom: insets.bottom + 90, opacity, transform: [{ translateY }] }]}>
    <View style={styles.icon}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>
    <View style={styles.content}><Text style={styles.title}>{notice.title}</Text><Text style={styles.message} numberOfLines={2}>{notice.message}</Text></View>
    <Ionicons name={favorite ? 'heart-outline' : 'cart-outline'} size={21} color="#E35B3F" />
    <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={4} style={styles.close}><Ionicons name="close" size={20} color="#777168" /></Pressable>
  </Animated.View> : null;
  return { showAlert, feedback, dismiss };
}
const styles = StyleSheet.create({
  alert: { position: 'absolute', left: 18, right: 18, zIndex: 9999, minHeight: 67, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E9E1D6', shadowColor: '#171717', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.13, shadowRadius: 15, elevation: 10 },
  icon: { width: 41, height: 41, borderRadius: 21, backgroundColor: '#E35B3F', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '900', color: '#171717', marginBottom: 3 },
  message: { fontSize: 12, color: '#686158', lineHeight: 17 },
});
