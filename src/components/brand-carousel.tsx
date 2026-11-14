import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { HomeItem } from '../services/homeSectionsService';
import { HomeImage } from './home-image';

const SPEED = 26; // px per second: calm, readable
const RESUME_AFTER_MS = 2500;
// Circle diameter follows the screen width: about 3 circles on a phone, capped on tablets/desktop web.
export const BRAND_MIN_CIRCLE = 96;
export const BRAND_MAX_CIRCLE = 136;
// Logos without saved framing are contained in the inscribed square of the circle.
export const BRAND_LOGO_INSET = 0.7;

/** Responsive geometry. Every circle and gap is identical, so the loop width stays exact. */
export function brandMetrics(windowWidth: number) {
  const width = Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : 390;
  const circle = Math.min(BRAND_MAX_CIRCLE, Math.max(BRAND_MIN_CIRCLE, Math.round(width * 0.26)));
  const gap = Math.round(circle * 0.15);
  return { circle, gap, step: circle + gap };
}

/** Pure loop maths, exported for tests. */
export function brandLoop(count: number, viewport: number, step: number, gap: number) {
  const span = count * step; // width of one full copy
  // Loop only when one copy overflows the viewport; otherwise duplicates
  // would be visible side by side, so the row stays static instead.
  const loops = count > 1 && viewport > 0 && span - gap > viewport;
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

export function BrandCarouselSkeleton() {
  const { width } = useWindowDimensions();
  const { circle, gap, step } = brandMetrics(width);
  const count = Math.max(3, Math.ceil((width || 390) / step));
  return <View testID="brand-carousel-skeleton" accessibilityRole="progressbar" accessibilityLabel="Loading brands"
    pointerEvents="none" style={[styles.skeletonRow, { gap }]}>
    {Array.from({ length: count }, (_, index) => <View key={index}
      style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: '#EEE5D8' }} />)}
  </View>;
}

export const BrandCarousel = memo(function BrandCarousel({ brands, onOpen }: Props) {
  const [viewport, setViewport] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const { circle, gap, step } = brandMetrics(windowWidth);
  const { span, loops, copies } = brandLoop(brands.length, viewport, step, gap);
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
      contentContainerStyle={[styles.content, { gap }]}
      {...handlers}>
      {rows.map(({ key, brand, copy }) => <BrandItem key={key} brand={brand} onOpen={onOpen} size={circle}
        onPressIn={pause} onPressOut={release} hidden={copy !== primaryCopy} />)}
    </ScrollView>
  </View>;
});

const BrandItem = memo(function BrandItem({ brand, onOpen, onPressIn, onPressOut, hidden, size }: {
  brand: HomeItem; onOpen: (brand: HomeItem) => void; onPressIn: () => void; onPressOut: () => void; hidden: boolean; size: number;
}) {
  const logo = Math.round(size * BRAND_LOGO_INSET);
  // Image only: the name stays available to screen readers and touch accessibility.
  return <Pressable onPress={() => onOpen(brand)} onPressIn={onPressIn} onPressOut={onPressOut}
    accessibilityRole="button" accessibilityLabel={`Shop ${brand.name}`}
    // Loop copies are visual only; screen readers see each brand once.
    accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    aria-hidden={hidden || undefined} focusable={!hidden}
    style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}>
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <HomeImage uri={brand.image} cacheKey={brand.imageKey || brand.image} style={StyleSheet.absoluteFill}
        brand={{ logoSize: logo, imageFrame: brand.imageFrame }} />
    </View>
  </Pressable>;
});

const styles = StyleSheet.create({
  content: { paddingVertical: 2 },
  skeletonRow: { flexDirection: 'row', overflow: 'hidden', paddingVertical: 2 },
  pressed: { opacity: 0.75 },
  circle: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFE6DA', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center' },
});
