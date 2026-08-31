import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// ============================================================
// NOTIFICATION HANDLER
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============================================================
// REGISTER FOR PUSH NOTIFICATIONS
// ============================================================

export async function registerForPushNotificationsAsync() {
  try {
    // ========================================================
    // PHYSICAL DEVICE ONLY
    // ========================================================

    if (!Device.isDevice) {
      console.log(
        'PUSH: Push notifications require a physical device.'
      );

      return null;
    }

    // ========================================================
    // ANDROID CHANNEL
    // ========================================================

    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync(
        'default',
        {
          name: 'default',
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        }
      );
    }

    // ========================================================
    // CHECK PERMISSION
    // ========================================================

    const {
      status: existingStatus,
    } =
      await Notifications.getPermissionsAsync();

    let finalStatus =
      existingStatus;

    // ========================================================
    // REQUEST PERMISSION
    // ========================================================

    if (
      existingStatus !== 'granted'
    ) {
      const {
        status,
      } =
        await Notifications.requestPermissionsAsync();

      finalStatus =
        status;
    }

    // ========================================================
    // PERMISSION NOT GRANTED
    // ========================================================

    if (
      finalStatus !== 'granted'
    ) {
      console.log(
        'PUSH: Notification permission was not granted.'
      );

      return null;
    }

    // ========================================================
    // GET EAS PROJECT ID
    // ========================================================

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log(
        'PUSH: EAS Project ID is missing.'
      );

      return null;
    }

    // ========================================================
    // GET EXPO PUSH TOKEN
    // ========================================================

    const token =
      (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

    // ========================================================
    // LOG TOKEN
    // ========================================================

    console.log(
      'PUSH: Expo Push Token:',
      token
    );

    return token;

  } catch (error) {

    console.log(
      'PUSH: REGISTER ERROR:',
      error
    );

    return null;
  }
}