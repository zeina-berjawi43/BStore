import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect, useSyncExternalStore } from 'react';
import { shoppingState } from '../services/shopping-state';

export function CartButton() {
  const { cartCount } = useSyncExternalStore(shoppingState.subscribe, shoppingState.getSnapshot, shoppingState.getSnapshot);
  useEffect(() => { void shoppingState.refresh().catch(() => {}); }, []);
  return <Pressable onPress={() => router.push('/cart')} accessibilityRole="button" accessibilityLabel={`Open cart, ${cartCount} items`}
    style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="cart-outline" size={25} color="#E35B3F" />
    {cartCount > 0 && <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#E35B3F', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{cartCount > 99 ? '99+' : cartCount}</Text>
    </View>}
  </Pressable>;
}
