import { useCallback, useEffect, useRef } from 'react';

// Prevent delayed alert/loading callbacks from updating an unmounted screen.
export function useTimeouts() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  return useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);
}
