import { useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { shoppingState, type ShoppingProduct } from '../services/shopping-state';

export function QuantitySelector({ product, onAdjust, children }: {
  product: ShoppingProduct; onAdjust: (delta: number) => void; children: ReactNode;
}) {
  const state = useSyncExternalStore(shoppingState.subscribe, shoppingState.getSnapshot, shoppingState.getSnapshot);
  const quantity = state.cart.find(item => item.product._id === String(product._id || product.id))?.quantity || 0;
  if (!quantity) return <>{children}</>;
  return <View style={styles.row} accessibilityLabel={`Quantity for ${product.name}`}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${product.name} quantity`} style={styles.button}
      onPress={event => { event.stopPropagation(); onAdjust(-1); }}><Text style={styles.symbol}>−</Text></Pressable>
    <Text accessibilityLiveRegion="polite" style={styles.value}>{quantity}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${product.name} quantity`} disabled={product.availability === false}
      style={styles.button} onPress={event => { event.stopPropagation(); onAdjust(1); }}><Text style={styles.symbol}>+</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%', backgroundColor: '#171717', borderRadius: 12 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: '#FFFFFF', fontSize: 20 }, value: { color: '#FFFFFF', fontWeight: '700', minWidth: 18, textAlign: 'center' },
});
