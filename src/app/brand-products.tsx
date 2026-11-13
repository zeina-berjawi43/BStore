import { useLocalSearchParams } from 'expo-router';
import { CategoryProductsScreen } from './category-products';

// Reuses the existing product list (cards, pricing, guest rules, navigation),
// filtered by the existing Product -> Brand relationship.
export default function BrandProducts() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const name = typeof params.name === 'string' ? params.name : '';
  return <CategoryProductsScreen key={id} category="ALL" brand={{ id, name }} />;
}
