import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { AppState, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Shared by Home and Offers. Native scrolling owns drag, velocity and snapping.
export function useOfferCarousel(count: number, width: number, onIndexChange: (index: number) => void) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const onChange = useRef(onIndexChange);
  useLayoutEffect(() => { onChange.current = onIndexChange; }, [onIndexChange]);
  const auto = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const state = useRef({ focused: false, active: AppState.currentState === 'active', dragging: false, touching: false, moving: false, x: width });
  const clearTimers = useCallback(() => {
    if (auto.current) clearTimeout(auto.current);
    if (settle.current) clearTimeout(settle.current);
    auto.current = null; settle.current = null;
  }, []);
  const restart = useCallback(() => {
    if (auto.current) clearTimeout(auto.current);
    auto.current = null;
    const s = state.current;
    if (count < 2 || !s.focused || !s.active || s.dragging || s.touching || s.moving) return;
    auto.current = setTimeout(() => {
      auto.current = null;
      state.current.moving = true;
      scrollRef.current?.scrollTo({ x: width * (Math.round(state.current.x / width) + 1), animated: true });
    }, 3500);
  }, [count, width]);
  const finish = useCallback(() => {
    const s = state.current;
    if (s.dragging || !s.focused || !s.active) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = null;
    const page = Math.max(0, Math.min(count + 1, Math.round(s.x / width)));
    if (Math.abs(s.x - page * width) > 1) return;
    s.moving = false;
    const next = count > 1 ? (page - 1 + count) % count : 0;
    if (count > 1 && (page === 0 || page === count + 1)) {
      s.x = (next + 1) * width;
      scrollRef.current?.scrollTo({ x: s.x, animated: false });
    }
    setIndex(next); onChange.current(next); restart();
  }, [count, restart, width]);
  useLayoutEffect(() => {
    state.current.x = count > 1 ? width : 0;
    state.current.moving = false;
    scrollRef.current?.scrollTo({ x: state.current.x, animated: false });
    onChange.current(0); // Pages remounts when dimensions or item identities change.
    restart();
  }, [count, restart, width]);
  useFocusEffect(useCallback(() => {
    state.current.focused = true;
    restart();
    const subscription = AppState.addEventListener('change', status => {
      state.current.active = status === 'active';
      clearTimers();
      if (state.current.active) {
        state.current.dragging = false; state.current.touching = false; state.current.moving = false;
        state.current.x = count > 1 ? Math.max(width, Math.min(count * width, state.current.x)) : 0;
        scrollRef.current?.scrollTo({ x: state.current.x, animated: false });
        restart();
      }
    });
    return () => {
      state.current.focused = false;
      state.current.dragging = false; state.current.touching = false; state.current.moving = false;
      state.current.x = count > 1 ? Math.max(width, Math.min(count * width, state.current.x)) : 0;
      scrollRef.current?.scrollTo({ x: state.current.x, animated: false });
      clearTimers(); subscription.remove();
    };
  }, [clearTimers, count, restart, width]));
  const scheduleFinish = () => {
    if (!state.current.focused || !state.current.active) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(finish, 160);
  };
  const releaseTouch = () => {
    const s = state.current;
    s.touching = false;
    if (!s.dragging && s.moving && s.focused && s.active) {
      // A tap can interrupt an automatic animation without producing a drag-end.
      const page = Math.max(0, Math.min(count + 1, Math.round(s.x / width)));
      scrollRef.current?.scrollTo({ x: page * width, animated: true });
      scheduleFinish();
    } else restart();
  };
  return { index, scrollRef, handlers: {
    onTouchStart: () => { state.current.touching = true; clearTimers(); },
    onTouchEnd: releaseTouch,
    onTouchCancel: releaseTouch,
    onScrollBeginDrag: () => { clearTimers(); state.current.dragging = true; state.current.moving = true; },
    onScrollEndDrag: () => { state.current.dragging = false; scheduleFinish(); },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      state.current.x = event.nativeEvent.contentOffset.x;
      if (!state.current.dragging) scheduleFinish();
    },
    onMomentumScrollEnd: finish,
  } };
}
