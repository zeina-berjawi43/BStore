import { useCallback, useRef, useState } from 'react';

// The synchronous lock closes the gap before React renders a disabled button.
export function useProductPending() {
  const locks = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const begin = useCallback((id: string) => {
    if (locks.current.has(id)) return false;
    locks.current.add(id);
    setPending(new Set(locks.current));
    return true;
  }, []);
  const end = useCallback((id: string) => {
    locks.current.delete(id);
    setPending(new Set(locks.current));
  }, []);
  const hasPending = useCallback(() => locks.current.size > 0, []);
  return { pending, begin, end, locks, hasPending };
}
