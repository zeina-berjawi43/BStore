import { useCallback, useEffect, useRef, useState } from 'react';
import { readHomeSection, refreshHomeSection, type HomeItem, type HomeSection } from '../services/homeSectionsService';

export function useHomeSection(section: HomeSection) {
  const [items, setItems] = useState<HomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const revision = useRef(0);
  const fresh = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    const operations = revision;
    mounted.current = true;
    void readHomeSection(section).then(cached => {
      if (!mounted.current) return;
      if (!fresh.current && cached !== null) { setItems(cached); setLoading(false); }
      setHydrated(true);
    });
    return () => { mounted.current = false; operations.current++; };
  }, [section]);
  const refresh = useCallback(async (_showLoading = true) => {
    const operation = ++revision.current;
    try {
      const next = await refreshHomeSection(section);
      if (!mounted.current || operation !== revision.current) return;
      fresh.current = true;
      setItems(next);
      setError('');
    } catch {
      if (mounted.current && operation === revision.current) setError('Unable to load this section. Please try again.');
    } finally {
      if (mounted.current && operation === revision.current) setLoading(false);
    }
  }, [section]);
  return { items, loading, error, hydrated, refresh };
}
