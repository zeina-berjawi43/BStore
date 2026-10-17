import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { Stack, router, useNavigationContainerRef, useRootNavigationState, usePathname } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { StartupScreen } from '../components/startup-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dismissNotificationShade, installForegroundHandler, notificationDestination, syncPush } from '../services/pushService';
import { getSessionSnapshot, onSessionChanged, readTokens, subscribeSession } from '../services/tokenStorage';
import { orderNotificationState } from '../services/navigation';
import { rememberLoginDestination, takeLoginDestination } from '../services/login-intent';
import { cleanSessionNavigationState, guestRoutes, privateRoutes, publicRoutes } from '../services/sessionRoutes';

export const unstable_settings = { initialRouteName: 'index' };

installForegroundHandler();
// Hold the centered logo briefly, then reveal the ready React loading screen.
void SplashScreen.preventAutoHideAsync().catch(() => {});
const splashStartedAt = Date.now();


export default function RootLayout() {
  const pathname = usePathname();
  const initialOrder = useRef<string | null>(null);
  const initialProtected = useRef<string | null>(null);
  const webOrderEntry = useRef<'home' | 'orders' | null>(null);
  const [initialLinkReady, setInitialLinkReady] = useState(false);
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then(url => {
      if (!active || !url) return;
      const link = Linking.parse(url);
      const orderId = link.queryParams?.orderId;
      // Custom-scheme links such as bstore://order-details use the hostname.
      const route = link.path || link.hostname;
      if (route && privateRoutes.some(name => name === route) && route !== 'order-details') initialProtected.current = `/${route}`;
      if (route === 'order-details' && typeof orderId === 'string' && /^[a-f0-9]{24}$/i.test(orderId)) {
        initialOrder.current = orderId;
      }
    }).catch(() => {}).finally(() => { if (active) setInitialLinkReady(true); });
    return () => { active = false; };
  }, []);
  const fullWindow = pathname === '/' || pathname === '/loading';
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const [restoreError, setRestoreError] = useState(false);
  const [startupPainted, setStartupPainted] = useState(false);
  const [startupArtworkReady, setStartupArtworkReady] = useState(false);
  useEffect(() => {
    if (!startupArtworkReady) return;
    let active = true;
    const timer = setTimeout(() => {
      // Keep matching React artwork mounted until native removal finishes.
      void SplashScreen.hideAsync().catch(() => {}).then(() => {
        if (active) setStartupPainted(true);
      });
    }, Math.max(0, 700 - (Date.now() - splashStartedAt)));
    return () => { active = false; clearTimeout(timer); };
  }, [startupArtworkReady]);
  const startupReady = () => setStartupArtworkReady(true);
  const navigation = useRootNavigationState();
  const navigationRef = useNavigationContainerRef();
  const navigationRevision = useRef(0);
  const wasAuthenticated = useRef(false);
  const webLoginEntry = useRef<{ destination: string; home: boolean } | null>(null);
  useEffect(() => {
    if (session.ready && initialLinkReady && navigationRef.isReady() && navigationRevision.current !== session.revision) {
      navigationRevision.current = session.revision;
      if (initialProtected.current) rememberLoginDestination(initialProtected.current);
      if (session.authenticated) takeLoginDestination();
      if (Platform.OS === 'web' && session.authenticated && !initialOrder.current && guestRoutes.some(route => pathname === `/${route}`)) {
        webLoginEntry.current = { destination: '/', home: false };
      }
      const login = !session.authenticated && initialProtected.current;
      if (!session.authenticated) webLoginEntry.current = null;
      if (!session.authenticated && wasAuthenticated.current) takeLoginDestination();
      wasAuthenticated.current = session.authenticated;
      initialProtected.current = null;
      navigationRef.resetRoot(login ? { index: 1, routes: [{ name: 'index' }, { name: 'login', params: { returnTo: login } }] } : cleanSessionNavigationState());
    }
  }, [session.ready, session.revision, session.authenticated, initialLinkReady, navigation?.key, navigationRef, pathname]);
  useEffect(() => {
    const entry = webLoginEntry.current;
    if (!entry || !session.authenticated || !navigationRef.isReady()) return;
    if (!entry.home) { entry.home = true; router.replace('/'); }
    else if (pathname === '/') {
      webLoginEntry.current = null;
      if (entry.destination !== '/') router.push(entry.destination as never);
    }
  }, [session.authenticated, session.revision, pathname, navigation?.key, navigationRef]);
  useEffect(() => {
    if (!session.ready || !initialLinkReady || !startupPainted || !navigationRef.isReady() || !initialProtected.current) return;
    if (session.authenticated) { initialProtected.current = null; return; }
    const destination = initialProtected.current;
    initialProtected.current = null;
    rememberLoginDestination(destination);
    router.replace({ pathname: '/login', params: { returnTo: destination } });
  }, [session.ready, session.authenticated, initialLinkReady, startupPainted, navigation?.key, navigationRef]);
  useEffect(() => {
    if (!session.ready || !initialLinkReady || !startupPainted || !navigationRef.isReady() || !navigation?.key || !initialOrder.current) return;
    if (!session.authenticated) {
      if (pathname === '/' || pathname === '/order-details') router.replace('/login');
      return;
    }
    const orderId = initialOrder.current;
    // Browser Back reads browser history, so create real entries one route at a time.
    if (Platform.OS === 'web') {
      if (!webOrderEntry.current) {
        webOrderEntry.current = 'home';
        router.replace('/');
      } else if (webOrderEntry.current === 'home' && pathname === '/') {
        webOrderEntry.current = 'orders';
        router.push('/orders');
      } else if (webOrderEntry.current === 'orders' && pathname === '/orders') {
        initialOrder.current = null;
        webOrderEntry.current = null;
        router.push({ pathname: '/order-details', params: { orderId } });
      }
      return;
    }
    initialOrder.current = null;
    navigationRef.resetRoot(orderNotificationState(orderId));
  }, [session.ready, session.authenticated, session.revision, initialLinkReady, startupPainted, navigation?.key, navigationRef, pathname]);
  const handled = useRef<string | null>(null);
  const pendingNotification = useRef<Notifications.NotificationResponse | null>(null);
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
    if (!session.ready || !initialLinkReady || !startupPainted || !navigationRef.isReady() || Platform.OS === 'web' || Constants.appOwnership === 'expo' || !navigation?.key) return;
    let active = true;
    let processing = false;
    const handle = async (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current === id || processing) return;
      processing = true;
      // This API affects only this app's presented notifications, not history or schedules.
      void dismissNotificationShade(id);
      const revision = getSessionSnapshot().revision;
      try {
        const data = response.notification.request.content.data || {};
        if (!getSessionSnapshot().authenticated) {
          pendingNotification.current = response;
          router.replace('/login');
          return;
        }
        const destination = await notificationDestination(data);
        if (!active || revision !== getSessionSnapshot().revision) return;
        if (!getSessionSnapshot().authenticated) {
          pendingNotification.current = response;
          router.replace('/login');
          return;
        }
        await Notifications.clearLastNotificationResponseAsync();
        if (!active || revision !== getSessionSnapshot().revision) return;
        handled.current = id;
        pendingNotification.current = null;
        if (destination?.pathname === '/order-details') {
          navigationRef.resetRoot(orderNotificationState(destination.params.orderId));
        } else if (destination) router.dismissTo('/');
      } finally { processing = false; }
    };
    const last = pendingNotification.current || Notifications.getLastNotificationResponse();
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
  }, [navigation?.key, navigationRef, session.ready, session.revision, initialLinkReady, startupPainted]);
  return (
    <SafeAreaView style={{ flex: 1, ...(Platform.OS === 'web' ? { width: '100%', maxWidth: ['/login','/register','/verify-otp','/reset-password'].includes(pathname) ? 560 : ['/cart','/favorites','/checkout'].includes(pathname) ? 880 : 1120, alignSelf: 'center' as const } : {}), backgroundColor: fullWindow || !session.ready || !initialLinkReady || !startupPainted ? '#FFFFFF' : '#F7F3EC' }} edges={Platform.OS === 'android' && session.ready && startupPainted ? ['top', 'bottom', 'left', 'right'] : []}>
      {Platform.OS === 'android' && <StatusBar style="dark" />}
      {!session.ready || !initialLinkReady || !startupPainted ? (
        <StartupScreen onReady={startupReady}>
          {restoreError && <View style={{ position: 'absolute', bottom: '20%', padding: 24 }}>
            <Pressable onPress={restore}><Text>Unable to restore your session. Tap to retry.</Text></Pressable>
          </View>}
        </StartupScreen>
      ) : <Stack
        // Remount all screens immediately; resetRoot also removes retained route history.
        key={session.revision}
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: fullWindow ? '#FFFFFF' : '#E7DED1' },
          ...(Platform.OS === 'android' ? { statusBarStyle: 'dark' as const } : {}),
        }}
      >
        {publicRoutes.map(name => <Stack.Screen key={name} name={name} />)}
        <Stack.Protected guard={session.authenticated}>
          {privateRoutes.map(name => <Stack.Screen key={name} name={name} />)}
        </Stack.Protected>
        <Stack.Protected guard={!session.authenticated}>
          {guestRoutes.map(name => <Stack.Screen key={name} name={name} />)}
        </Stack.Protected>
      </Stack>}
    </SafeAreaView>
  );
}
