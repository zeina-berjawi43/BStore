import { useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, type ScrollView } from 'react-native';

// Touch-only web enhancement. Desktop retains the browser's normal reload command.
export function useWebPullRefresh(scroll: RefObject<ScrollView | null>, enabled: boolean, refresh: () => Promise<void>) {
  const [distance, setDistance] = useState(0);
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const node = (scroll.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();
    if (!node) return;
    let start: { x: number; y: number } | null = null, pulled = 0;
    const begin = (event: TouchEvent) => {
      start = null; pulled = 0; setDistance(0);
      if (node.scrollTop <= 0 && event.touches.length === 1) start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) { start = null; pulled = 0; setDistance(0); return; }
      if (!start) return;
      const dy = event.touches[0].clientY - start.y, dx = Math.abs(event.touches[0].clientX - start.x);
      if (node.scrollTop > 0 || dy < 0 || dx > Math.max(12, dy)) { start = null; pulled = 0; setDistance(0); return; }
      if (dy > 10) { event.preventDefault(); pulled = Math.min(100, dy); setDistance(pulled); }
    };
    const end = () => { const run = pulled >= 70; start = null; pulled = 0; setDistance(0); if (run) void latest.current(); };
    const cancel = () => { start = null; pulled = 0; setDistance(0); };
    node.addEventListener('touchstart', begin, { passive: true });
    node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end); node.addEventListener('touchcancel', cancel);
    return () => { node.removeEventListener('touchstart', begin); node.removeEventListener('touchmove', move); node.removeEventListener('touchend', end); node.removeEventListener('touchcancel', cancel); };
  }, [scroll, enabled]);
  return distance;
}
