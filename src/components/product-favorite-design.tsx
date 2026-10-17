import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

// Matches the existing Product Details favorite button; placement stays screen-specific.
export const productFavoriteDesign = StyleSheet.create({
  button: { width: 42, height: 42, borderRadius: 50, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E7DED1', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowColor: '#171717', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 3 },
}).button;

export function ProductFavoriteHeart({ selected }: { selected: boolean }) {
  return <Ionicons name={selected ? 'heart' : 'heart-outline'} size={selected ? 22 : 21}
    color={selected ? '#E35B3F' : '#171717'} />;
}
