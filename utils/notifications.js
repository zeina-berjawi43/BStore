import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";


// ============================================================
// NOTIFICATION HANDLER
// ============================================================

Notifications.setNotificationHandler({

  handleNotification:
    async () => ({

      shouldShowAlert:
        true,

      shouldPlaySound:
        true,

      shouldSetBadge:
        false,

    }),

});


// ============================================================
// REGISTER FOR PUSH NOTIFICATIONS
// ============================================================

export async function registerForPushNotificationsAsync() {

  try {

    // ========================================================
    // CHECK PHYSICAL DEVICE
    // ========================================================

    if (!Device.isDevice) {

      console.log(
        "Push notifications require a physical device."
      );

      return null;

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
      existingStatus !==
      "granted"
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
      finalStatus !==
      "granted"
    ) {

      console.log(
        "Notification permission was not granted."
      );

      return null;

    }


    // ========================================================
    // GET PROJECT ID
    // ========================================================

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;


    if (!projectId) {

      console.log(
        "EAS Project ID is missing."
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
      "Expo Push Token:",
      token
    );


    return token;


  } catch (error) {

    console.log(
      "REGISTER PUSH NOTIFICATION ERROR:",
      error
    );

    return null;

  }

}
