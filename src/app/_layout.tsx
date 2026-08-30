
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import {
  registerForPushNotificationsAsync,
} from '../../utils/notifications';

import {
  saveExpoPushToken,
  isLoggedIn,
} from '../services/authService';

export default function RootLayout() {
  // ==========================================================
  // REGISTER PUSH NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    const registerNotifications = async () => {
      try {
        const loggedIn = await isLoggedIn();

        if (!loggedIn) {
          return;
        }

        const token =
          await registerForPushNotificationsAsync();

        if (!token) {
          return;
        }

        await saveExpoPushToken(token);

        console.log(
          'PUSH TOKEN REGISTERED AND SAVED'
        );
      } catch (error) {
        console.log(
          'NOTIFICATION REGISTRATION ERROR:',
          error
        );
      }
    };

    registerNotifications();
  }, []);

  // ==========================================================
  // ROUTER
  // ==========================================================

  return (
    <Stack
      initialRouteName="loading"
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
