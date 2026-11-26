import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, Dimensions, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { analytics } from '../services/analytics';
import { recordProductImpression } from './use-product-impressions';

// Home's nested ScrollViews need viewport geometry; a single bounded sampler is
// dormant without opt-in. No scroll positions or geometry are transmitted.
const observers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function observe(callback: () => void) {
  if (observers.size >= 100) return () => {};
  observers.add(callback);
  timer ||= setInterval(() => {
    if (AppState.currentState !== 'active' || (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
    observers.forEach(check => check());
  }, 700);
  return () => { observers.delete(callback); if (!observers.size && timer) { clearInterval(timer); timer = undefined; } };
}
export function useProductExposure(item: Parameters<typeof recordProductImpression>[0], screen: string, active = true) {
  const ref = useRef<View>(null), current = useRef(item);
  useLayoutEffect(() => { current.current = item; }, [item]);
  const preference = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot, analytics.getSnapshot);
  const allowed = preference.ready && preference.accepted && preference.config.enabled && active;
  useFocusEffect(useCallback(() => {
    if (!allowed) return;
    let since = 0, alive = true, done = false;
    const stop = observe(() => {
      if (done) return;
      try { ref.current?.measureInWindow((x, y, width, height) => {
        if (!alive) return;
        const window = Dimensions.get('window');
        const visible = width > 0 && height > 0 && (Math.max(0, Math.min(x + width, window.width) - Math.max(x, 0)) * Math.max(0, Math.min(y + height, window.height) - Math.max(y, 0))) / (width * height) >= .5;
        if (!visible) { since = 0; return; }
        if (since && Date.now() - since >= 600) { recordProductImpression(current.current, screen); done = true; }
        since ||= Date.now();
      }); } catch { /* Geometry failure must never affect shopping. */ }
    });
    return () => { alive = false; stop(); };
  }, [allowed, screen]));
  return ref;
}
