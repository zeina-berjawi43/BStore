import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { analytics } from '../services/analytics';
import type { AnalyticsEventName } from '../services/analytics-core';

// Records a successful visible view once per focus, even when the content came from cache.
export function useAnalyticsView(name: AnalyticsEventName, ready: boolean, properties: Record<string, string | number>) {
  const current = useRef({ name, ready, properties });
  useLayoutEffect(() => { current.current = { name, ready, properties }; }, [name, ready, properties]);
  const focused = useRef(false), recorded = useRef(false), viewId = useRef('');
  const key = [name, properties.productId, properties.screen, properties.categoryId, properties.departmentId, properties.brandId].join(':');
  const previousKey = useRef(key);
  const record = useCallback(() => {
    const value = current.current;
    if (!focused.current || recorded.current || !value.ready) return;
    recorded.current = true;
    if (value.name === 'checkout_started') analytics.startCheckout(Number(value.properties.itemCount || 0));
    else analytics.track(value.name, { ...value.properties, viewId: viewId.current });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true; recorded.current = false; viewId.current = analytics.newId(); record();
    return () => { focused.current = false; };
  }, [record]));
  useEffect(() => {
    if (previousKey.current !== key) { previousKey.current = key; recorded.current = false; viewId.current = analytics.newId(); }
    record();
  }, [ready, record, key]);
}

export function useAnalyticsBlock(reason: string | null, stage: 'cart' | 'checkout') {
  const focused = useRef(false), last = useRef<string | null>(null), current = useRef(reason);
  useLayoutEffect(() => { current.current = reason; }, [reason]);
  const record = useCallback(() => {
    if (!focused.current) return;
    if (current.current && current.current !== last.current) analytics.blockCheckout(current.current, stage);
    last.current = current.current;
  }, [stage]);
  useFocusEffect(useCallback(() => {
    focused.current = true; last.current = null; record();
    return () => { focused.current = false; };
  }, [record]));
  useEffect(record, [reason, record]);
}
