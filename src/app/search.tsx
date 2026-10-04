import { useShopping } from '../hooks/use-shopping';

import { CartButton } from '../components/cart-button';

import { AddToCartButton } from '../components/add-to-cart-button';
import { getFinalPrice } from '../services/product-price';
import { ProductImage } from '../components/product-image';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { API_URL, getValidAccessToken } from '../services/authService';
import { CatalogProduct, fetchCatalog, peekPublicCatalog, readPublicCatalog } from '../services/catalogService';


const label = (value?: CatalogProduct['category']) => typeof value === 'string' ? value : value?.name || '';
const imageUrl = (value?: string) => {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  const relative = value.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${API_URL}/${relative.startsWith('uploads/') ? relative : `uploads/${relative}`}`;
};

export default function Search() {
  const shopping = useShopping();
  const [searchText, setSearchText] = useState('');
  const query = useDeferredValue(searchText.trim().toLowerCase());
  const [products, setProducts] = useState<CatalogProduct[]>(peekPublicCatalog);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const favoriteIds = new Set(shopping.favorites.map(p => String(p._id || p.id)));
  const favoritesReady = shopping.ready;
  const pending = new Set([...shopping.pendingCart].map(id => `cart:${id}`).concat([...shopping.pendingFavorites].map(id => `favorite:${id}`)));
  const { feedback } = shopping;
  const epoch = useRef(0);

  const load = useCallback(async (generation: number, force = false) => {
    setError('');
    setLoading(true);
    setRefreshing(force);

    let liveProductsLoaded = false;
    void readPublicCatalog().then(cached => {
      if (epoch.current === generation && !liveProductsLoaded && cached.length) {
        setProducts(current => current.length ? current : cached);
      }
    });
    try {
      const token = await getValidAccessToken();
      if (epoch.current !== generation) return;
      void shopping.refresh(force).catch(() => {});
      const data = await fetchCatalog(token, force);
      if (epoch.current !== generation) return;
      liveProductsLoaded = true;
      setProducts(data);
    } catch (err) {
      if (epoch.current === generation) setError(err instanceof Error ? err.message : 'Could not load products.');
    } finally {
      if (epoch.current === generation) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const generation = ++epoch.current;
    void load(generation);
    return () => { epoch.current++; };
  }, [load]));

  const results = useMemo(() => !query ? [] : products.filter(product =>
    `${product.name} ${label(product.category)} ${label(product.brand)}`.toLowerCase().includes(query)
  ), [products, query]);

  const changeProduct = (product: CatalogProduct, action: 'cart' | 'favorite') => action === 'cart' ? shopping.add(product) : shopping.toggle(product);

  return (
    <View style={styles.container}>
      {feedback}
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color="#171717" />
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <CartButton />
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={21} color="#E35B3F" />
        <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search products, categories or brands..."
          placeholderTextColor="#8B857D" style={styles.input} autoFocus autoCorrect={false} autoCapitalize="none"
          returnKeyType="search" accessibilityLabel="Search products" />
        {!!searchText && <Pressable onPress={() => setSearchText('')} hitSlop={10} accessibilityLabel="Clear search" accessibilityRole="button">
          <Ionicons name="close-circle" size={21} color="#8B857D" />
        </Pressable>}
      </View>

      {!!error && <Pressable onPress={() => void load(++epoch.current, true)} style={styles.errorBox} accessibilityRole="button">
        <Text style={styles.error}>{error} Tap to retry.</Text>
      </Pressable>}
      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>{query ? `${results.length} ${results.length === 1 ? 'product' : 'products'}` : ''}</Text>

      </View>
      <FlatList
        data={results} keyExtractor={item => item._id} numColumns={2}
        contentContainerStyle={styles.list} columnWrapperStyle={styles.row}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
        refreshing={refreshing} onRefresh={() => void load(++epoch.current, true)}
        extraData={{ favoriteIds, pending, favoritesReady }}
        ListEmptyComponent={<View style={styles.empty}>
          {loading && !refreshing && products.length === 0 ? <ActivityIndicator size="large" color="#E35B3F" /> : <Ionicons name="search-outline" size={38} color="#E35B3F" />}
          <Text style={styles.emptyTitle}>{!query ? "Find what you're looking for" : loading ? 'Loading products...' : error ? 'Products are unavailable' : 'No products found'}</Text>
          <Text style={styles.secondary}>{!query ? 'Search by product, category or brand' : loading ? 'Your results will appear here' : 'Try another search or pull down to refresh'}</Text>
        </View>}
        renderItem={({ item }) => {
          const uri = imageUrl(item.image);
          const available = item.availability !== false;
          const cartBusy = pending.has(`cart:${item._id}`);
          const favoriteBusy = pending.has(`favorite:${item._id}`);
          const favorite = favoriteIds.has(item._id);
          const hasPrice = item.price != null && Number.isFinite(Number(item.price));
          const price = Number(item.price);
          const finalPrice = getFinalPrice(item);
          const onSale = hasPrice && finalPrice < price;
          return (
            <View style={styles.card}>
              <Pressable onPress={() => router.push({ pathname: '/product-details', params: { id: item._id } })}
                accessibilityRole="button" accessibilityLabel={`View ${item.name}`}>
                <View style={styles.imageBox}>
                  {uri ? <ProductImage imageFrame={item.imageFrame} source={{ uri }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" recyclingKey={item._id} />
                    : <Ionicons name="cube-outline" size={38} color="#E35B3F" />}
                  {onSale && <View style={styles.discount}><Text style={styles.discountText}>-{Number(item.discount || 0)}%</Text></View>}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.secondary} numberOfLines={1}>{label(item.brand) || label(item.category)}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.favorite} disabled={favoriteBusy || !favoritesReady}
                onPress={() => void changeProduct(item, 'favorite')}
                accessibilityRole="button" accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`}
                accessibilityState={{ selected: favorite, disabled: favoriteBusy || !favoritesReady }}>
                <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? '#E35B3F' : '#777168'} />
              </Pressable>
              <View style={styles.addButtonContainer}>
                <View style={styles.priceGroup}>
                  {hasPrice ? <View style={styles.prices}>
                    <Text style={[styles.price, onSale && styles.salePrice]} numberOfLines={1} adjustsFontSizeToFit>${finalPrice.toFixed(2)}</Text>
                    {onSale && <Text style={styles.oldPrice} numberOfLines={1} adjustsFontSizeToFit>${price.toFixed(2)}</Text>}
                  </View> : <Text style={styles.secondary}>Open for price details</Text>}
                </View>
                <AddToCartButton name={item.name} pending={cartBusy} unavailable={!available}
                  onPress={() => void changeProduct(item, 'cart')} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EC', paddingTop: 38 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E6DED2' },
  title: { flex: 1, fontSize: 28, fontWeight: '900', color: '#171717' },
  searchBar: { marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#E7DED1', backgroundColor: '#FFFFFF', paddingHorizontal: 12, height: 56 },
  input: { flex: 1, fontSize: 14, color: '#171717', height: 54, paddingHorizontal: 10 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#171717' },
  list: { paddingHorizontal: 18, paddingBottom: 28, flexGrow: 1 },
  row: { gap: 12 },
  card: { flex: 1, maxWidth: '50%', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6DED2', marginBottom: 12, overflow: 'hidden' },
  imageBox: { height: 145, padding: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  image: { backgroundColor: '#FFFFFF',  width: '100%', height: '100%' },
  favorite: { position: 'absolute', top: 5, right: 5, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  discount: { position: 'absolute', top: 10, left: 8, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#E35B3F' },
  discountText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  info: { padding: 11, gap: 5 },
  name: { fontSize: 14, fontWeight: '800', color: '#171717', minHeight: 36 },
  secondary: { fontSize: 12, color: '#777168', lineHeight: 18 },
  prices: { alignItems: 'flex-start', gap: 2 },
  price: { flexShrink: 1, fontSize: 16, fontWeight: '900', color: '#171717' },
  salePrice: { color: '#E35B3F' },
  oldPrice: { flexShrink: 1, fontSize: 11, color: '#777168', textDecorationLine: 'line-through' },
  priceGroup: { flex: 1, minWidth: 0 },
  addButtonContainer: { margin: 10, marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  errorBox: { marginHorizontal: 18, marginTop: 10 },
  error: { color: '#A52B22', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 15, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#171717', textAlign: 'center' },
});
