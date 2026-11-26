import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { ViewToken } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { analytics } from '../services/analytics';
import { getFinalPrice } from '../services/product-price';

type Item = { _id?: string; id?: string; price?: number; discountedPrice?: number; discount?: number };
export function recordProductImpression(item: Item, screen: string) {
  const productId = item._id || item.id;
  if (!productId) return;
  analytics.track('product_impression', { productId, screen, viewId: analytics.newId(), ...analytics.priceProperties(item.price == null ? undefined : getFinalPrice(item)) });
}
// Native FlatList viewability also works on Web. Fetches/re-renders do not count.
export function useProductImpressions(screen: string) {
  const current = useRef(screen);
  useLayoutEffect(() => { current.current = screen; }, [screen]);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
  const viewabilityConfig = useMemo(() => ({ minimumViewTime: 600, itemVisiblePercentThreshold: 50 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    if (!focused.current) return;
    viewableItems.forEach(token => { if (token.isViewable) recordProductImpression(token.item, current.current); });
  }, []);
  return { viewabilityConfig, onViewableItemsChanged };
}
