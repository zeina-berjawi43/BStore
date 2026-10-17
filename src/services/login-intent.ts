import { router } from 'expo-router';
import { getSessionSnapshot } from './tokenStorage';
import { privateRoutes } from './sessionRoutes';

let destination: string | null = null;
export function rememberLoginDestination(value: unknown) {
  if (typeof value === 'string' && privateRoutes.some(route => value === `/${route}`)) destination = value;
}
export function takeLoginDestination() { const value = destination; destination = null; return value; }
export function openProtected(path: string) {
  if (getSessionSnapshot().authenticated) router.push(path as never);
  else { rememberLoginDestination(path); router.push({ pathname: '/login', params: { returnTo: path } }); }
}
