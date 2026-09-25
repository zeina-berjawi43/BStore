import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL, getValidAccessToken, getSavedUser, getNotificationSetting, flushPendingLogouts } from './authService';
import { readTokens } from './tokenStorage';
import { request } from './request';

export type PushState = 'ready' | 'needs-permission' | 'denied' | 'disabled' | 'unsupported' | 'signed-out';
let queue: Promise<unknown> = Promise.resolve();

export function syncPush(requestPermission = false, enable = false): Promise<PushState> {
  const result = queue.then(() => register(requestPermission, enable));
  queue = result.catch(() => undefined);
  return result;
}

async function register(ask: boolean, enable: boolean): Promise<PushState> {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return 'unsupported';
  await flushPendingLogouts();
  const accessToken = await getValidAccessToken();
  if (!accessToken) return 'signed-out';
  const session = (await readTokens()).refreshToken;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BStore notifications', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const enabled = enable || await getNotificationSetting();
  let permission = await Notifications.getPermissionsAsync();
  if (enabled && ask && !permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  if (!enabled || !granted) {
    const response = await request(`${API_URL}/push/device`, { method: 'DELETE', headers });
    if (!response.ok) throw new Error('Could not update this device. Please try again.');
    return enabled ? (permission.canAskAgain ? 'needs-permission' : 'denied') : 'disabled';
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Notification setup is missing. Please contact BStore.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if ((await readTokens()).refreshToken !== session) return 'signed-out';
  const response = await request(`${API_URL}/push/device`, { method: 'PUT', headers, body: JSON.stringify({ token }) });
  if (!response.ok) throw new Error('Could not register notifications. Please try again.');
  if ((await readTokens()).refreshToken !== session) {
    await request(`${API_URL}/push/device`, { method: 'DELETE', headers });
    return 'signed-out';
  }
  return 'ready';
}

export async function notificationDestination(data: Record<string, unknown>) {
  if (!await getValidAccessToken()) return null;
  const user = await getSavedUser();
  if (!user || String(user._id || user.id) !== data.userId) return null;
  if (data.type === 'offer') return { pathname: '/' as const };
  if (data.type === 'order' && typeof data.orderId === 'string' && /^[a-f0-9]{24}$/i.test(data.orderId)) {
    return { pathname: '/order-details' as const, params: { orderId: data.orderId } };
  }
  return null;
}

export function installForegroundHandler() {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return;
  Notifications.setNotificationHandler({ handleNotification: async notification => {
    const user = await getSavedUser();
    const tokens = await readTokens();
    const show = !!tokens.refreshToken && user?.notificationsEnabled !== false
      && String(user?._id || user?.id) === notification.request.content.data?.userId;
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  } });
}
