import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

// Existing Category/Department product-card (+) design.
export function AddToCartButton({ name, pending, unavailable, onPress }: {
  name: string; pending: boolean; unavailable: boolean; onPress: () => void;
}) {
  return <Pressable style={({ pressed }) => [styles.button, (pressed || pending) && styles.active, unavailable && styles.disabled]}
    disabled={pending || unavailable} hitSlop={5}
    accessibilityRole="button" accessibilityLabel={unavailable ? `${name} is out of stock` : `Add ${name} to cart`}
    accessibilityState={{ disabled: pending || unavailable, busy: pending }}
    onPress={event => { event.stopPropagation(); onPress(); }}>
    <Ionicons name={pending ? "checkmark" : "add"} size={20} color="#FFFFFF" />
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' },
  disabled: { backgroundColor: '#B8B2A9' },
  active: { backgroundColor: '#E35B3F' },
});
