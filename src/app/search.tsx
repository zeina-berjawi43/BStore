import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { API_URL, getValidAccessToken } from '../services/authService';
import { CatalogProduct, fetchCatalog, peekPublicCatalog, readPublicCatalog } from '../services/catalogService';
import { addProductToCart, getFavoriteIds, setProductFavorite, ShoppingError } from '../services/shoppingService';

const label = (value?: CatalogProduct['category']) => typeof value === 'string' ? value : value?.name || '';
const imageUrl = (value?: string) => {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  const relative = value.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${API_URL}/${relative.startsWith('uploads/') ? relative : `uploads/${relative}`}`;
};

export default function Search() {
  const [searchText, setSearchText] = useState('');
  const query = useDeferredValue(searchText.trim().toLowerCase());
  const [products, setProducts] = useState<CatalogProduct[]>(peekPublicCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const pendingRef = useRef(new Set<string>());
  const epoch = useRef(0);

  const load = useCallback(async (generation: number, force = false) => {
    setError('');
    setLoading(true);
    setFavoritesReady(false);
    setFavoriteIds(new Set());
    let liveProductsLoaded = false;
    void readPublicCatalog().then(cached => {
      if (epoch.current === generation && !liveProductsLoaded) setProducts(cached);
    });
    try {
      const token = await getValidAccessToken();
      if (epoch.current !== generation) return;
      if (!token) {
        setFavoriteIds(new Set());
        setFavoritesReady(true);
      } else {
        // Favorites never delay product results.
        void getFavoriteIds(token).then(ids => {
          if (epoch.current === generation) {
            setFavoriteIds(new Set(ids));
            setFavoritesReady(true);
          }
        }).catch(() => {
          if (epoch.current === generation) setNotice('Could not load favorites. Pull down to retry.');
        });
      }
      const data = await fetchCatalog(token, force);
      if (epoch.current !== generation) return;
      liveProductsLoaded = true;
      setProducts(data);
    } catch (err) {
      if (epoch.current === generation) setError(err instanceof Error ? err.message : 'Could not load products.');
    } finally {
      if (epoch.current === generation) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const generation = ++epoch.current;
    setNotice('');
    void load(generation);
    return () => { epoch.current++; };
  }, [load]));

  const results = useMemo(() => !query ? [] : products.filter(product =>
    `${product.name} ${label(product.category)} ${label(product.brand)}`.toLowerCase().includes(query)
  ), [products, query]);

  const changeProduct = async (product: CatalogProduct, action: 'cart' | 'favorite') => {
    const key = `${action}:${product._id}`;
    if (pendingRef.current.has(key)) return;
    if (action === 'cart' && product.availability === false) return;
    pendingRef.current.add(key);
    setPending(new Set(pendingRef.current));
    const generation = epoch.current;
    const selected = favoriteIds.has(product._id);
    setNotice('');
    try {
      const token = await getValidAccessToken();
      if (epoch.current !== generation) return;
      if (!token) {
        router.push('/login');
        return;
      }
      if (action === 'cart') {
        await addProductToCart(product._id, token);
      } else {
        await setProductFavorite(product._id, !selected, token);
      }
      if (epoch.current !== generation) return;
      if (action === 'favorite') {
        setFavoriteIds(current => {
          const updated = new Set(current);
          if (selected) updated.delete(product._id); else updated.add(product._id);
          return updated;
        });
      }
      setNotice(action === 'cart' ? `${product.name} added to cart` : selected ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      if (epoch.current !== generation) return;
      if (err instanceof ShoppingError && err.status === 401) {
        router.push('/login');
      } else {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      pendingRef.current.delete(key);
      setPending(new Set(pendingRef.current));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color="#171717" />
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <Pressable style={styles.back} onPress={() => router.push('/cart')} accessibilityLabel="Open cart" accessibilityRole="button">
          <Ionicons name="cart-outline" size={24} color="#E35B3F" />
        </Pressable>
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
      {!!notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}
      {!!error && <Pressable onPress={() => void load(++epoch.current, true)} style={styles.errorBox} accessibilityRole="button">
        <Text style={styles.error}>{error} Tap to retry.</Text>
      </Pressable>}
      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>{query ? `${results.length} ${results.length === 1 ? 'product' : 'products'}` : 'Find your favorites'}</Text>
        {loading && <ActivityIndicator size="small" color="#E35B3F" />}
      </View>
      <FlatList
        data={results} keyExtractor={item => item._id} numColumns={2}
        contentContainerStyle={styles.list} columnWrapperStyle={styles.row}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
        refreshing={loading} onRefresh={() => void load(++epoch.current, true)}
        extraData={{ favoriteIds, pending, favoritesReady }}
        ListEmptyComponent={<View style={styles.empty}>
          <Ionicons name="search-outline" size={38} color="#E35B3F" />
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
          const discounted = item.discountedPrice != null ? Number(item.discountedPrice) : price * (1 - Number(item.discount || 0) / 100);
          const finalPrice = Number.isFinite(discounted) ? discounted : price;
          const onSale = hasPrice && finalPrice < price;
          return (
            <View style={styles.card}>
              <Pressable onPress={() => router.push({ pathname: '/product-details', params: { id: item._id } })}
                accessibilityRole="button" accessibilityLabel={`View ${item.name}`}>
                <View style={styles.imageBox}>
                  {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" recyclingKey={item._id} />
                    : <Ionicons name="cube-outline" size={38} color="#E35B3F" />}
                  {onSale && <View style={styles.discount}><Text style={styles.discountText}>-{Number(item.discount || 0)}%</Text></View>}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.secondary} numberOfLines={1}>{label(item.brand) || label(item.category)}</Text>
                  {hasPrice ? <View style={styles.prices}>
                    <Text style={styles.price}>${finalPrice.toFixed(2)}</Text>
                    {onSale && <Text style={styles.oldPrice}>${price.toFixed(2)}</Text>}
                  </View> : <Text style={styles.secondary}>Open for price details</Text>}
                </View>
              </Pressable>
              <Pressable style={styles.favorite} disabled={favoriteBusy || !favoritesReady}
                onPress={() => void changeProduct(item, 'favorite')}
                accessibilityRole="button" accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`}
                accessibilityState={{ selected: favorite, disabled: favoriteBusy || !favoritesReady }}>
                {favoriteBusy ? <ActivityIndicator size="small" color="#E35B3F" /> : <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? '#E35B3F' : '#777168'} />}
              </Pressable>
              <Pressable style={[styles.addButton, (!available || cartBusy) && styles.disabled]} disabled={!available || cartBusy}
                onPress={() => void changeProduct(item, 'cart')} accessibilityRole="button" accessibilityLabel={`Add ${item.name} to cart`}>
                {cartBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <>
                  <Ionicons name={available ? 'cart-outline' : 'close-circle-outline'} size={17} color="#FFFFFF" />
                  <Text style={styles.addText}>{available ? 'Add to Cart' : 'Out of stock'}</Text>
                </>}
              </Pressable>
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
  imageBox: { height: 142, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFAF7' },
  image: { width: '100%', height: '100%' },
  favorite: { position: 'absolute', top: 5, right: 5, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  discount: { position: 'absolute', top: 10, left: 8, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#E35B3F' },
  discountText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  info: { padding: 11, gap: 5 },
  name: { fontSize: 14, fontWeight: '800', color: '#171717', minHeight: 36 },
  secondary: { fontSize: 12, color: '#777168', lineHeight: 18 },
  prices: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  price: { fontSize: 16, fontWeight: '900', color: '#171717' },
  oldPrice: { fontSize: 11, color: '#9C968D', textDecorationLine: 'line-through' },
  addButton: { margin: 10, marginTop: 'auto', minHeight: 40, borderRadius: 11, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E35B3F' },
  addText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  notice: { marginHorizontal: 18, marginTop: 12, color: '#27653F', fontSize: 13, fontWeight: '600' },
  errorBox: { marginHorizontal: 18, marginTop: 10 },
  error: { color: '#A52B22', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 15, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#171717', textAlign: 'center' },
});
