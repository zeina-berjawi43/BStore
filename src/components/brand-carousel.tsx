import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import type { HomeItem } from '../services/homeSectionsService';

// Fixed geometry keeps every circle, gap and label identical and lets the
// loop width be computed exactly (no measuring, no drift between copies).
export const BRAND_CIRCLE = 76;
export const BRAND_ITEM_WIDTH = 88;
export const BRAND_GAP = 14;
const STEP = BRAND_ITEM_WIDTH + BRAND_GAP;
const SPEED = 26; // px per second: calm, readable
const RESUME_AFTER_MS = 2500;

/** Pure loop maths, exported for tests. */
export function brandLoop(count: number, viewport: number) {
  const span = count * STEP; // width of one full copy
  // Loop only when one copy overflows the viewport; otherwise duplicates
  // would be visible side by side, so the row stays static instead.
  const loops = count > 1 && viewport > 0 && span - BRAND_GAP > viewport;
  return { span, loops, copies: loops ? 3 : 1 };
}

/** Keeps the offset inside the middle copy; identical content makes the shift invisible. */
export function wrapOffset(x: number, span: number) {
  if (span <= 0) return x;
  while (x >= 2 * span) x -= span;
  while (x < span) x += span;
  return x;
}

type Props = { brands: HomeItem[]; onOpen: (brand: HomeItem) => void };

export const BrandCarousel = memo(function BrandCarousel({ brands, onOpen }: Props) {
  const [viewport, setViewport] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { span, loops, copies } = brandLoop(brands.length, viewport);
  const motion = loops && !reducedMotion;

  const state = useRef({ x: 0, focused: false, active: AppState.currentState === 'active', visible: true,
    touching: false, touchedAt: 0, dragging: false, momentum: false, resumeAt: 0, frame: 0 as number, last: 0, lastSet: NaN });

  // Every programmatic position goes through here so scroll events can tell
  // our own frames apart from user movement.
  const moveTo = useCallback((x: number) => {
    const s = state.current;
    s.x = x; s.lastSet = x;
    scrollRef.current?.scrollTo({ x, animated: false });
  }, []);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { alive = false; sub.remove(); };
  }, []);

  const stop = useCallback(() => {
    const s = state.current;
    if (s.frame) cancelAnimationFrame(s.frame);
    s.frame = 0;
  }, []);

  const start = useCallback(() => {
    const s = state.current;
    if (s.frame || !motion || !s.focused || !s.active || !s.visible) return;
    s.last = 0;
    const tick = () => {
      s.frame = requestAnimationFrame(tick);
      const time = performance.now();
      const dt = s.last ? Math.min(time - s.last, 64) : 0; // clamp after stalls: no sudden leaps
      s.last = time;
      // Failsafe: a lost touch-end event must not freeze the carousel forever.
      if (s.touching && time - s.touchedAt > 10_000) s.touching = false;
      if (s.touching || s.dragging || s.momentum || time < s.resumeAt || !dt) return;
      moveTo(wrapOffset(s.x + (SPEED * dt) / 1000, span));
    };
    s.frame = requestAnimationFrame(tick);
  }, [motion, span, moveTo]);

  // Position on the middle copy whenever the geometry changes.
  useEffect(() => {
    const s = state.current;
    moveTo(loops ? wrapOffset(s.x || span, span) : 0);
  }, [loops, span, moveTo]);

  // Run only while Home is focused, the app is active and (web) the tab is visible.
  useFocusEffect(useCallback(() => {
    const s = state.current;
    s.focused = true; start();
    return () => { s.focused = false; stop(); };
  }, [start, stop]));

  useEffect(() => {
    const s = state.current;
    const app = AppState.addEventListener('change', next => {
      s.active = next === 'active';
      if (s.active) start(); else stop();
    });
    const doc = Platform.OS === 'web' && typeof document !== 'undefined' ? document : null;
    const onVisibility = () => { s.visible = doc?.visibilityState !== 'hidden'; if (s.visible) start(); else stop(); };
    doc?.addEventListener('visibilitychange', onVisibility);
    return () => { app.remove(); doc?.removeEventListener('visibilitychange', onVisibility); stop(); };
  }, [start, stop]);

  const pause = useCallback(() => { state.current.touching = true; state.current.touchedAt = performance.now(); }, []);
  const release = useCallback(() => {
    const s = state.current;
    s.touching = false;
    s.resumeAt = performance.now() + RESUME_AFTER_MS;
  }, []);
  // Called once movement has fully stopped (never mid-fling, which a jump would cancel).
  const settle = useCallback((event?: NativeSyntheticEvent<NativeScrollEvent>) => {
    const s = state.current;
    if (event) s.x = event.nativeEvent.contentOffset.x;
    if (s.dragging || s.momentum) return;
    if (loops) {
      const wrapped = wrapOffset(s.x, span);
      if (wrapped !== s.x) moveTo(wrapped);
    }
    s.resumeAt = performance.now() + RESUME_AFTER_MS;
  }, [loops, span, moveTo]);

  const handlers = {
    onTouchStart: pause,
    onTouchEnd: release,
    onTouchCancel: release,
    onScrollBeginDrag: () => { const s = state.current; s.dragging = true; s.touching = true; s.touchedAt = performance.now(); },
    // No offset jump here: a fling may still start. The resumed frame loop (or the
    // momentum end) moves back into the middle copy, which looks identical.
    onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const s = state.current; s.dragging = false; s.touching = false;
      s.x = event.nativeEvent.contentOffset.x; s.resumeAt = performance.now() + RESUME_AFTER_MS;
    },
    onMomentumScrollBegin: () => { state.current.momentum = true; },
    onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => { state.current.momentum = false; settle(event); },
    // Our own frames are ignored (reading back rounded web offsets would stall
    // sub-pixel motion). Anything else is user movement - including the trailing
    // events of a swipe, inertia and web wheel/trackpad scrolling - so the tracked
    // offset stays exact and auto-scroll waits for the idle interval again.
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const s = state.current;
      const offset = event.nativeEvent.contentOffset.x;
      const user = s.dragging || s.momentum || s.touching || !(Math.abs(offset - s.lastSet) <= 4);
      if (!user) return;
      s.x = offset;
      if (!s.touching) s.resumeAt = performance.now() + RESUME_AFTER_MS;
    },
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setViewport(current => current === width ? current : width);
  };

  const rows: { key: string; brand: HomeItem; copy: number }[] = [];
  for (let copy = 0; copy < copies; copy++) for (const brand of brands) rows.push({ key: `${copy}:${brand.id}`, brand, copy });
  const primaryCopy = copies === 3 ? 1 : 0;

  return <View onLayout={onLayout} testID="brand-carousel">
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}
      // Native horizontal scrolling owns the gesture; vertical page scrolling is unaffected.
      directionalLockEnabled nestedScrollEnabled scrollEventThrottle={32} decelerationRate="normal"
      contentContainerStyle={styles.content}
      {...handlers}>
      {rows.map(({ key, brand, copy }) => <BrandItem key={key} brand={brand} onOpen={onOpen}
        onPressIn={pause} onPressOut={release} hidden={copy !== primaryCopy} />)}
    </ScrollView>
  </View>;
});

const BrandItem = memo(function BrandItem({ brand, onOpen, onPressIn, onPressOut, hidden }: {
  brand: HomeItem; onOpen: (brand: HomeItem) => void; onPressIn: () => void; onPressOut: () => void; hidden: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [brand.imageKey, brand.image]);
  const initial = brand.name.trim().charAt(0).toUpperCase();
  return <Pressable onPress={() => onOpen(brand)} onPressIn={onPressIn} onPressOut={onPressOut}
    accessibilityRole="button" accessibilityLabel={`Shop ${brand.name}`}
    // Loop copies are visual only; screen readers see each brand once.
    accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    aria-hidden={hidden || undefined} focusable={!hidden}
    style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
    <View style={styles.circle}>
      {brand.image && !failed ? <Image source={{ uri: brand.image, cacheKey: brand.imageKey || brand.image }}
        recyclingKey={brand.imageKey || brand.image} style={styles.logo} contentFit="contain"
        cachePolicy="memory-disk" transition={150} accessible={false} onError={() => setFailed(true)} />
        : <Text style={styles.initial}>{initial}</Text>}
    </View>
    <Text style={styles.name} numberOfLines={1}>{brand.name}</Text>
  </Pressable>;
});

const styles = StyleSheet.create({
  content: { paddingVertical: 2, gap: BRAND_GAP },
  item: { width: BRAND_ITEM_WIDTH, alignItems: 'center' },
  pressed: { opacity: 0.75 },
  circle: { width: BRAND_CIRCLE, height: BRAND_CIRCLE, borderRadius: BRAND_CIRCLE / 2, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EFE6DA', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  // Inscribed square (~0.7 x diameter): any logo shape is contained, never stretched or clipped.
  logo: { width: Math.round(BRAND_CIRCLE * 0.7), height: Math.round(BRAND_CIRCLE * 0.7) },
  initial: { fontSize: 26, fontWeight: '900', color: '#E35B3F' },
  name: { marginTop: 7, width: '100%', textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#171717' },
});
