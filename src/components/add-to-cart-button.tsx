import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { QuantitySelector } from './quantity-selector';
import type { ShoppingProduct } from '../services/shopping-state';

// Existing Category/Department product-card (+) design.
export function AddToCartButton({ name, unavailable, onPress, product, onAdjust }: {
  name: string; pending: boolean; unavailable: boolean; onPress: () => void;
  compact?: boolean;
  product?: ShoppingProduct; onAdjust?: (delta: number) => void;
}) {
  const button = <Pressable style={({ pressed }) => [styles.button, pressed && styles.active, unavailable && styles.disabled]}
    disabled={unavailable} hitSlop={7}
    accessibilityRole="button" accessibilityLabel={unavailable ? `${name} is out of stock` : `Add ${name} to cart`}
    accessibilityState={{ disabled: unavailable }}
    onPress={event => { event.stopPropagation(); onPress(); }}>
    <Ionicons name="add" size={18} color="#FFFFFF" />
  </Pressable>;
  return product && onAdjust ? <QuantitySelector compact grid product={product} onAdjust={onAdjust}>{button}</QuantitySelector> : button;
}
const styles = StyleSheet.create({
  button: { alignSelf: 'flex-end', width: 30, height: 30, borderRadius: 9, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' },
  disabled: { backgroundColor: '#B8B2A9' },
  active: { backgroundColor: '#E35B3F' },
});
