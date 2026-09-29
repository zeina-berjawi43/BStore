import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Keep the existing showcase and fade/slide transition, adding a native drag gesture.
export function useOfferCarousel(count: number, index: number, setIndex: (update: (current: number) => number) => void) {
  const [fade] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  const dragging = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);
  const [interaction, setInteraction] = useState(0);
  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => {
      setFocused(false);
      clearTimer();
      fade.stopAnimation(); translate.stopAnimation();
      fade.setValue(1); translate.setValue(0);
      busy.current = false; dragging.current = false;
    };
  }, [clearTimer, fade, translate]));
  const advance = useCallback((direction: number) => {
    if (count <= 1 || busy.current) return;
    busy.current = true;
    clearTimer();
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translate, { toValue: -18 * direction, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) { busy.current = false; return; }
      setIndex(current => (current + direction + count) % count);
      translate.setValue(18 * direction);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  }, [clearTimer, count, fade, translate, setIndex]);
  useEffect(() => {
    clearTimer();
    if (focused && count > 1 && !dragging.current) {
      timer.current = setTimeout(() => advance(1), 3500);
    }
    return clearTimer;
  }, [advance, clearTimer, count, focused, index, interaction]);
  useEffect(() => {
    fade.stopAnimation(); translate.stopAnimation();
    fade.setValue(1); translate.setValue(0); busy.current = false;
  }, [count, fade, translate]);
  // PanResponder stores these event callbacks; it does not invoke them during render.
  // eslint-disable-next-line react-hooks/refs
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => count > 1 && !busy.current
      && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderGrant: () => { dragging.current = true; clearTimer(); },
    onPanResponderMove: (_, gesture) => translate.setValue(gesture.dx * 0.5),
    onPanResponderRelease: (_, gesture) => {
      dragging.current = false;
      if (Math.abs(gesture.dx) > 40 || Math.abs(gesture.vx) > 0.5) advance(gesture.dx < 0 ? 1 : -1);
      else Animated.spring(translate, { toValue: 0, useNativeDriver: true }).start();
      setInteraction(current => current + 1);
    },
    onPanResponderTerminate: () => {
      dragging.current = false;
      Animated.spring(translate, { toValue: 0, useNativeDriver: true }).start();
      setInteraction(current => current + 1);
    },
  }), [advance, clearTimer, count, translate]);
  return { fade, translate, panHandlers: panResponder.panHandlers };
}
