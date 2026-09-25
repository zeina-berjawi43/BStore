import { Stack, router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { installForegroundHandler, notificationDestination, syncPush } from '../services/pushService';
import { onSessionChanged } from '../services/tokenStorage';

installForegroundHandler();


export default function RootLayout() {
  const navigation = useRootNavigationState();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const sync = () => { void syncPush(true).catch(() => { /* Settings exposes registration errors with retry. */ }); };
    sync();
    return onSessionChanged(sync);
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web' || Constants.appOwnership === 'expo' || !navigation?.key) return;
    const handle = async (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const destination = await notificationDestination(response.notification.request.content.data || {});
      await Notifications.clearLastNotificationResponseAsync();
      if (destination) router.push(destination);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) void handle(last).catch(() => {});
    const tap = Notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => {}); });
    const rotation = Notifications.addPushTokenListener(() => { void syncPush().catch(() => {}); });
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') void syncPush().catch(() => {});
    });
    return () => { tap.remove(); rotation.remove(); foreground.remove(); };
  }, [navigation?.key]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F3EC' }} edges={Platform.OS === 'android' ? ['top', 'bottom', 'left', 'right'] : []}>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          ...(Platform.OS === 'android' ? { statusBarStyle: 'dark' as const } : {}),
        }}
      />
    </SafeAreaView>
  );
}



