import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

// Existing Category/Department product-card (+) design.
export function AddToCartButton({ name, pending, unavailable, onPress, compact = false }: {
  name: string; pending: boolean; unavailable: boolean; onPress: () => void;
  compact?: boolean;
}) {
  return <Pressable style={({ pressed }) => [styles.button, compact && styles.compact, pressed && styles.active, unavailable && styles.disabled]}
    disabled={unavailable} hitSlop={5}
    accessibilityRole="button" accessibilityLabel={unavailable ? `${name} is out of stock` : `Add ${name} to cart`}
    accessibilityState={{ disabled: unavailable }}
    onPress={event => { event.stopPropagation(); if (!pending) onPress(); }}>
    <Ionicons name="add" size={compact ? 14 : 20} color="#FFFFFF" />
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' },
  compact: { width: 27, height: 27, borderRadius: 14 },
  disabled: { backgroundColor: '#B8B2A9' },
  active: { backgroundColor: '#E35B3F' },
});
