import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';

// =========================================================
// TYPES
// =========================================================

export type User = {
  _id?: string;
  id?: string;

  name?: string;

  firstName?: string;
  lastName?: string;

  email?: string | null;

  phone?: string;

  address?: string;

  role?: string;

  phoneVerified?: boolean;

  notificationsEnabled?: boolean;
};

export type AuthResponse = {
  message: string;

  user?: User;

  accessToken?: string;

  refreshToken?: string;

  requiresPhoneVerification?: boolean;

  verificationStatus?: string;

  phoneVerificationStatus?: string;

  phoneVerificationType?: string;
};

// =========================================================
// SAVE AUTH DATA
// =========================================================

const saveAuthData = async (
  data: AuthResponse
) => {

  if (data.accessToken) {
    await AsyncStorage.setItem(
      'accessToken',
      data.accessToken
    );
  }

  if (data.refreshToken) {
    await AsyncStorage.setItem(
      'refreshToken',
      data.refreshToken
    );
  }

  if (data.user) {
    await AsyncStorage.setItem(
      'user',
      JSON.stringify(data.user)
    );
  }

  if (
    data.accessToken &&
    data.user
  ) {
    await AsyncStorage.setItem(
      'isLoggedIn',
      'true'
    );
  }
};

// =========================================================
// REGISTER CUSTOMER
// =========================================================

export const registerUser = async ({
  firstName,
  lastName,
  phone,
  address,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}) => {

  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        Accept:
          'application/json',
      },

      body: JSON.stringify({
        firstName:
          firstName.trim(),

        lastName:
          lastName.trim(),

        phone:
          phone.trim(),

        address:
          address.trim(),
      }),
    }
  );

  let data: AuthResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Invalid server response.'
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Registration failed.'
    );
  }

  return data;
};

// =========================================================
// REQUEST LOGIN OTP
// =========================================================

export const requestLoginOTP =
  async (
    phone: string
  ) => {

    const response =
      await fetch(
        `${API_URL}/auth/request-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body: JSON.stringify({
            phone:
              phone.trim(),
          }),
        }
      );

    let data: AuthResponse;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        'Invalid server response.'
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Unable to request verification code.'
      );
    }

    return data;
  };

// =========================================================
// VERIFY CUSTOMER OTP
// =========================================================

export const verifyLoginOTP =
  async (
    phone: string,
    otp: string
  ) => {

    const response =
      await fetch(
        `${API_URL}/auth/verify-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body: JSON.stringify({
            phone:
              phone.trim(),

            otp:
              otp.trim(),
          }),
        }
      );

    let data: AuthResponse;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        'Invalid server response.'
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          'OTP verification failed.'
      );
    }

    await saveAuthData(data);

    return data;
  };

// =========================================================
// GET ACCESS TOKEN
// =========================================================

export const getAccessToken =
  async () => {

    return await AsyncStorage.getItem(
      'accessToken'
    );
  };

// =========================================================
// GET SAVED USER
// =========================================================

export const getSavedUser =
  async (): Promise<User | null> => {

    try {

      const savedUser =
        await AsyncStorage.getItem(
          'user'
        );

      if (!savedUser) {
        return null;
      }

      return JSON.parse(
        savedUser
      );

    } catch (error) {

      console.log(
        'GET SAVED USER ERROR:',
        error
      );

      return null;
    }
  };

// =========================================================
// REFRESH ACCESS TOKEN
// =========================================================

export const refreshAccessToken =
  async () => {

    const refreshToken =
      await AsyncStorage.getItem(
        'refreshToken'
      );

    if (!refreshToken) {
      return null;
    }

    const response =
      await fetch(
        `${API_URL}/auth/refresh-token`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

    let data: any = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {

      await logoutLocal();

      return null;
    }

    if (
      data.accessToken
    ) {

      await AsyncStorage.setItem(
        'accessToken',
        data.accessToken
      );

      return data.accessToken;
    }

    return null;
  };

// =========================================================
// GET VALID ACCESS TOKEN
// =========================================================

export const getValidAccessToken =
  async () => {

    const token =
      await getAccessToken();

    if (token) {
      return token;
    }

    return await refreshAccessToken();
  };

// =========================================================
// LOGOUT SERVER
// =========================================================

export const logout =
  async () => {

    const refreshToken =
      await AsyncStorage.getItem(
        'refreshToken'
      );

    try {

      if (refreshToken) {

        await fetch(
          `${API_URL}/auth/logout`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body: JSON.stringify({
              refreshToken,
            }),
          }
        );
      }

    } catch (error) {

      console.log(
        'LOGOUT SERVER ERROR:',
        error
      );

    } finally {

      await logoutLocal();
    }
  };

// =========================================================
// LOGOUT LOCAL
// =========================================================

export const logoutLocal =
  async () => {

    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'user',
      'isLoggedIn',
    ]);
  };

// =========================================================
// FETCH CURRENT USER
// =========================================================

export const fetchCurrentUser =
  async (): Promise<User> => {

    const accessToken =
      await getValidAccessToken();

    if (!accessToken) {
      throw new Error(
        'No access token found.'
      );
    }

    const response =
      await fetch(
        `${API_URL}/users/me`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              'application/json',
          },
        }
      );

    let data: any = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    console.log(
      'FETCH CURRENT USER RESPONSE:',
      data
    );

    // =======================================================
    // SESSION EXPIRED
    // =======================================================

    if (
      response.status === 401
    ) {

      await logoutLocal();

      throw new Error(
        'Session expired'
      );
    }

    // =======================================================
    // OTHER ERRORS
    // =======================================================

    if (!response.ok) {

      throw new Error(
        data.message ||
          'Unable to load account information.'
      );
    }

    // =======================================================
    // USER NOT FOUND
    // =======================================================

    if (!data.user) {

      throw new Error(
        'User information was not found.'
      );
    }

    // =======================================================
    // SAVE UPDATED USER LOCALLY
    // =======================================================

    await AsyncStorage.setItem(
      'user',
      JSON.stringify(
        data.user
      )
    );

    return data.user;
  };

// =========================================================
// GET NOTIFICATION SETTING
// =========================================================

export const getNotificationSetting =
  async (): Promise<boolean> => {

    const accessToken =
      await getValidAccessToken();

    if (!accessToken) {

      throw new Error(
        'No access token found.'
      );
    }

    const response =
      await fetch(
        `${API_URL}/users/me/notification-setting`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              'application/json',
          },
        }
      );

    let data: any = {};

    try {

      data =
        await response.json();

    } catch {

      data = {};

    }

    // =======================================================
    // SESSION EXPIRED
    // =======================================================

    if (
      response.status === 401 ||
      response.status === 403
    ) {

      await logoutLocal();

      throw new Error(
        'Session expired.'
      );
    }

    // =======================================================
    // API ERROR
    // =======================================================

    if (!response.ok) {

      throw new Error(
        data.message ||
          'Unable to load notification settings.'
      );
    }

    // =======================================================
    // GET SAVED VALUE
    // =======================================================

    const enabled =
      Boolean(
        data.notificationsEnabled
      );

    // =======================================================
    // KEEP LOCAL USER UPDATED
    // =======================================================

    const currentUser =
      await getSavedUser();

    if (currentUser) {

      const updatedUser = {
        ...currentUser,

        notificationsEnabled:
          enabled,
      };

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(
          updatedUser
        )
      );
    }

    return enabled;
  };

// =========================================================
// UPDATE NOTIFICATION SETTING
// =========================================================

export const updateNotificationSetting =
  async (
    enabled: boolean
  ): Promise<boolean> => {

    const accessToken =
      await getValidAccessToken();

    if (!accessToken) {

      throw new Error(
        'No access token found.'
      );
    }

    const response =
      await fetch(
        `${API_URL}/users/me/notification-setting`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            notificationsEnabled:
              enabled,
          }),
        }
      );

    let data: any = {};

    try {

      data =
        await response.json();

    } catch {

      data = {};

    }

    // =======================================================
    // SESSION EXPIRED
    // =======================================================

    if (
      response.status === 401 ||
      response.status === 403
    ) {

      await logoutLocal();

      throw new Error(
        'Session expired.'
      );
    }

    // =======================================================
    // API ERROR
    // =======================================================

    if (!response.ok) {

      throw new Error(
        data.message ||
          'Unable to update notification settings.'
      );
    }

    // =======================================================
    // GET SAVED VALUE
    // =======================================================

    const savedValue =
      Boolean(
        data.notificationsEnabled
      );

    // =======================================================
    // UPDATE LOCAL USER
    // =======================================================

    const currentUser =
      await getSavedUser();

    if (currentUser) {

      const updatedUser = {
        ...currentUser,

        notificationsEnabled:
          savedValue,
      };

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(
          updatedUser
        )
      );

    } else {

      await AsyncStorage.setItem(
        'user',
        JSON.stringify({
          notificationsEnabled:
            savedValue,
        })
      );
    }

    return savedValue;
  };

// =========================================================
// CHECK IF USER IS LOGGED IN
// =========================================================

export const isLoggedIn =
  async (): Promise<boolean> => {

    try {

      const accessToken =
        await getValidAccessToken();

      if (!accessToken) {
        return false;
      }

      const loggedIn =
        await AsyncStorage.getItem(
          'isLoggedIn'
        );

      return loggedIn === 'true';

    } catch (error) {

      console.log(
        'IS LOGGED IN ERROR:',
        error
      );

      return false;
    }
  };

// =========================================================
// CHECK IF CURRENT USER IS ADMIN
// =========================================================

export const isAdmin =
  async (): Promise<boolean> => {

    try {

      const user =
        await getSavedUser();

      return user?.role === 'admin';

    } catch (error) {

      console.log(
        'IS ADMIN ERROR:',
        error
      );

      return false;
    }
  };

// =========================================================
// API URL EXPORT
// =========================================================

export {
  API_URL
};