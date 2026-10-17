import { useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { shoppingState, type ShoppingProduct } from '../services/shopping-state';

export function QuantitySelector({ product, onAdjust, children, compact = false, variant = 'standard', grid = false }: {
  product: ShoppingProduct; onAdjust: (delta: number) => void; children: ReactNode; compact?: boolean; variant?: 'standard' | 'offer'; grid?: boolean;
}) {
  const readQuantity = () => shoppingState.getSnapshot().cart.find(item => item.product._id === String(product._id || product.id))?.quantity || 0;
  const quantity = useSyncExternalStore(shoppingState.subscribe, readQuantity, readQuantity);
  return <View testID={variant === 'offer' ? 'offer-cart-control' : 'quantity-slot'} style={[styles.slot, compact && styles.compact, grid && styles.grid]}>
    <View pointerEvents={quantity ? 'none' : 'auto'} accessibilityElementsHidden={!!quantity} importantForAccessibility={quantity ? 'no-hide-descendants' : 'auto'} style={[styles.original, !!quantity && styles.hidden]}>{children}</View>
    {!!quantity && <View style={[styles.row, variant === 'offer' && styles.offer]} accessibilityLabel={`Quantity for ${product.name}`}>
    <Pressable hitSlop={grid ? 5 : undefined} accessibilityRole="button" accessibilityLabel={`Decrease ${product.name} quantity`} style={[styles.button, grid && styles.gridButton]}
      onPress={event => { event.stopPropagation(); onAdjust(-1); }}><Text style={styles.symbol}>−</Text></Pressable>
    <Text accessibilityLiveRegion="polite" style={styles.value}>{quantity}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${product.name} quantity`} disabled={product.availability === false}
      style={[styles.button, grid && styles.gridButton]} onPress={event => { event.stopPropagation(); onAdjust(1); }}><Text style={styles.symbol}>+</Text></Pressable>
  </View>}</View>;
}
const styles = StyleSheet.create({
  slot: { width: '100%', minWidth: 0, minHeight: 44, maxWidth: '100%', flexShrink: 1 }, compact: { width: 110, alignSelf: 'flex-end' },
  grid: { width: 90, flexShrink: 0 }, gridButton: { minWidth: 34 },
  original: { width: '100%', minHeight: 44, justifyContent: 'center' }, hidden: { opacity: 0 },
  row: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%', backgroundColor: '#171717', borderRadius: 12 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  offer: { backgroundColor: '#E35B3F', borderRadius: 9, height: 44 },
  symbol: { color: '#FFFFFF', fontSize: 20 }, value: { color: '#FFFFFF', fontWeight: '700', minWidth: 18, textAlign: 'center' },
});
