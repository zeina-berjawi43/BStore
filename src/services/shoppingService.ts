import { API_URL } from './authService';
import { request } from './request';

export class ShoppingError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function shoppingRequest(path: string, token: string, method = 'GET', productId?: string) {
  const response = await request(`${API_URL}${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(productId ? { body: JSON.stringify({ productId, ...(path === '/cart/add' ? { quantity: 1 } : {}) }) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ShoppingError(data?.message || 'Could not save your change. Please try again.', response.status);
  return data;
}

export async function getFavoriteIds(token: string): Promise<string[]> {
  const data = await shoppingRequest('/favorites', token);
  return (Array.isArray(data.favorites) ? data.favorites : [])
    .map((favorite: { product?: { _id?: string } | string }) => typeof favorite.product === 'string' ? favorite.product : favorite.product?._id)
    .filter((id: unknown): id is string => typeof id === 'string');
}

export async function addProductToCart(productId: string, token: string) {
  await shoppingRequest('/cart/add', token, 'POST', productId);
}

export async function setProductFavorite(productId: string, selected: boolean, token: string) {
  await shoppingRequest(selected ? '/favorites/add' : '/favorites/remove', token, selected ? 'POST' : 'DELETE', productId);
}
