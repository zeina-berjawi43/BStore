import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

// Compact version of the existing Product Details favorite button; placement stays screen-specific.
export const productFavoriteDesign = StyleSheet.create({
  button: { width: 32, height: 32, borderRadius: 50, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowColor: '#171717', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08,
    shadowRadius: 6, elevation: 2 },
}).button;

export function ProductFavoriteHeart({ selected, small = false }: { selected: boolean; small?: boolean }) {
  return <Ionicons name={selected ? 'heart' : 'heart-outline'} size={small ? (selected ? 14 : 13) : (selected ? 17 : 16)}
    color={selected ? '#E35B3F' : '#171717'} />;
}
