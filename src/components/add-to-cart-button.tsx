import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { QuantitySelector } from './quantity-selector';
import type { ShoppingProduct } from '../services/shopping-state';

// Existing Category/Department product-card (+) design.
export function AddToCartButton({ name, unavailable, onPress, compact = false, product, onAdjust }: {
  name: string; pending: boolean; unavailable: boolean; onPress: () => void;
  compact?: boolean;
  product?: ShoppingProduct; onAdjust?: (delta: number) => void;
}) {
  const button = <Pressable style={({ pressed }) => [styles.button, compact && styles.compact, pressed && styles.active, unavailable && styles.disabled]}
    disabled={unavailable} hitSlop={5}
    accessibilityRole="button" accessibilityLabel={unavailable ? `${name} is out of stock` : `Add ${name} to cart`}
    accessibilityState={{ disabled: unavailable }}
    onPress={event => { event.stopPropagation(); onPress(); }}>
    <Ionicons name="add" size={compact ? 14 : 20} color="#FFFFFF" />
  </Pressable>;
  return product && onAdjust ? <QuantitySelector compact product={product} onAdjust={onAdjust}>{button}</QuantitySelector> : button;
}
const styles = StyleSheet.create({
  button: { alignSelf: 'flex-end', width: 44, height: 44, borderRadius: 12, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' },
  compact: { borderRadius: 14 },
  disabled: { backgroundColor: '#B8B2A9' },
  active: { backgroundColor: '#E35B3F' },
});
