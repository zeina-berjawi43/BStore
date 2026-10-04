import { Alert, Platform } from 'react-native';

export function confirmShoppingClear(resource: 'Cart' | 'Favorites', clear: () => Promise<void>) {
  const title = `Clear ${resource}?`;
  const message = resource === 'Cart' ? 'Remove all products from your cart?' : 'Remove all saved favorites?';
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n${message}`)) void clear();
  } else {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' },
      { text: `Clear ${resource}`, style: 'destructive', onPress: () => void clear() }]);
  }
}
