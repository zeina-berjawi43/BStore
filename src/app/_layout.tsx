import { Stack, router, useNavigationContainerRef, useRootNavigationState } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { installForegroundHandler, notificationDestination, syncPush } from '../services/pushService';
import { getSessionSnapshot, onSessionChanged, readTokens, subscribeSession } from '../services/tokenStorage';
import { cleanSessionNavigationState, guestRoutes, privateRoutes, publicRoutes } from '../services/sessionRoutes';

installForegroundHandler();


export default function RootLayout() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const [restoreError, setRestoreError] = useState(false);
  const navigation = useRootNavigationState();
  const navigationRef = useNavigationContainerRef();
  const navigationRevision = useRef(0);
  useEffect(() => {
    if (session.ready && navigationRef.isReady() && navigationRevision.current !== session.revision) {
      navigationRevision.current = session.revision;
      navigationRef.resetRoot(cleanSessionNavigationState());
    }
  }, [session.ready, session.revision, navigation?.key, navigationRef]);
  const handled = useRef<string | null>(null);
  const restore = () => {
    setRestoreError(false);
    void readTokens().catch(() => setRestoreError(true));
  };
  useEffect(() => { void readTokens().catch(() => setRestoreError(true)); }, []);
  useEffect(() => {
    if (!session.ready) return;
    const sync = () => { void syncPush(true).catch(() => { /* Settings exposes registration errors with retry. */ }); };
    sync();
    return onSessionChanged(sync);
  }, [session.ready]);
  useEffect(() => {
    if (!session.ready || Platform.OS === 'web' || Constants.appOwnership === 'expo' || !navigation?.key) return;
    let active = true;
    let processing = false;
    const handle = async (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current === id || processing) return;
      processing = true;
      const revision = getSessionSnapshot().revision;
      try {
        const destination = await notificationDestination(response.notification.request.content.data || {});
        if (!active || revision !== getSessionSnapshot().revision) return;
        await Notifications.clearLastNotificationResponseAsync();
        if (!active || revision !== getSessionSnapshot().revision) return;
        handled.current = id;
        if (destination) router.push(destination);
      } finally { processing = false; }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) void handle(last).catch(() => {});
    const tap = Notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => {}); });
    const rotation = Notifications.addPushTokenListener(() => { void syncPush().catch(() => {}); });
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void syncPush().catch(() => {});
        const pending = Notifications.getLastNotificationResponse();
        if (pending) void handle(pending).catch(() => {});
      }
    });
    return () => { active = false; tap.remove(); rotation.remove(); foreground.remove(); };
  }, [navigation?.key, session.ready, session.revision]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F3EC' }} edges={Platform.OS === 'android' ? ['top', 'bottom', 'left', 'right'] : []}>
      {!session.ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {restoreError ? <Pressable onPress={restore}><Text>Unable to restore your session. Tap to retry.</Text></Pressable> : <ActivityIndicator color="#E35B3F" />}
        </View>
      ) : <Stack
        // Remount all screens immediately; resetRoot also removes retained route history.
        key={session.revision}
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          ...(Platform.OS === 'android' ? { statusBarStyle: 'dark' as const } : {}),
        }}
      >
        {publicRoutes.map(name => <Stack.Screen key={name} name={name} />)}
        <Stack.Protected guard={session.authenticated}>
          {privateRoutes.map(name => <Stack.Screen key={name} name={name} />)}
        </Stack.Protected>
        {guestRoutes.map(name => <Stack.Screen key={name} name={name} />)}
      </Stack>}
    </SafeAreaView>
  );
}



