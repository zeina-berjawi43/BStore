import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCheckoutAttempt(
  userId: string,
  address: string,
  items: { productId: string; quantity: number }[]
) {
  const storageKey = `pendingCheckout:${userId}`;
  const signature = JSON.stringify({
    address: address.trim(),
    items: items.map(item => [item.productId, item.quantity])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  });
  const saved = await AsyncStorage.getItem(storageKey);
  let attempt: { signature: string; key: string } | null = null;
  try { attempt = saved ? JSON.parse(saved) : null; } catch { /* Replace corrupt local data. */ }
  if (attempt?.signature !== signature || typeof attempt?.key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(attempt.key)) {
    attempt = { signature, key: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` };
    // Save before sending: retries after a lost response reuse the same request ID.
    await AsyncStorage.setItem(storageKey, JSON.stringify(attempt));
  }
  return { storageKey, key: attempt.key };
}
