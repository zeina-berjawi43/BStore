
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';

// ============================================================
// TYPES
// ============================================================

export type User = {
  id: string;
  _id?: string;
  name: string;
  email?: string | null;
  phone: string;
  address: string;
  role: 'user' | 'admin';
};

export type LoginResponse = {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type RegisterResponse = {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
};

// ============================================================
// REGISTER
// NAME + EMAIL OPTIONAL + PHONE + PASSWORD + ADDRESS
// AUTO LOGIN
// ============================================================

export const register = async (
  name: string,
  phone: string,
  password: string,
  address: string,
  email?: string
): Promise<RegisterResponse> => {
  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        name: name.trim(),
        email:
          email?.trim().toLowerCase() ||
          undefined,
        phone: phone.trim(),
        password,
        address: address.trim(),
      }),
    }
  );

  let data: any = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message || 'Registration failed'
    );
  }

  // ==========================================================
  // MAKE SURE TOKENS EXIST
  // ==========================================================

  if (
    !data.accessToken ||
    !data.refreshToken
  ) {
    throw new Error(
      'Registration succeeded but login tokens were not received'
    );
  }

  // ==========================================================
  // SAVE ACCESS TOKEN
  // ==========================================================

  await AsyncStorage.setItem(
    'accessToken',
    data.accessToken
  );

  // ==========================================================
  // SAVE REFRESH TOKEN
  // ==========================================================

  await AsyncStorage.setItem(
    'refreshToken',
    data.refreshToken
  );

  // ==========================================================
  // SAVE USER
  // ==========================================================

  if (data.user) {
    await AsyncStorage.setItem(
      'user',
      JSON.stringify(data.user)
    );
  }

  // ==========================================================
  // SAVE LOGIN STATUS
  // ==========================================================

  await AsyncStorage.setItem(
    'isLoggedIn',
    'true'
  );

  console.log(
    'REGISTER + AUTO LOGIN SUCCESS'
  );

  return data;
};

// ============================================================
// LOGIN
// PHONE + PASSWORD
// ============================================================

export const login = async (
  phone: string,
  password: string
): Promise<LoginResponse> => {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        phone: phone.trim(),
        password,
      }),
    }
  );

  let data: any = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message || 'Login failed'
    );
  }

  // ==========================================================
  // SAVE ACCESS TOKEN
  // ==========================================================

  await AsyncStorage.setItem(
    'accessToken',
    data.accessToken
  );

  // ==========================================================
  // SAVE REFRESH TOKEN
  // ==========================================================

  await AsyncStorage.setItem(
    'refreshToken',
    data.refreshToken
  );

  // ==========================================================
  // SAVE USER
  // ==========================================================

  if (data.user) {
    await AsyncStorage.setItem(
      'user',
      JSON.stringify(data.user)
    );
  }

  // ==========================================================
  // SAVE LOGIN STATUS
  // ==========================================================

  await AsyncStorage.setItem(
    'isLoggedIn',
    'true'
  );

  console.log(
    'LOGIN SUCCESS'
  );

  return data;
};

// ============================================================
// SAVE EXPO PUSH TOKEN
// ============================================================

export const saveExpoPushToken =
  async (
    expoPushToken: string
  ): Promise<void> => {

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      throw new Error(
        'No access token found'
      );
    }

    const response =
      await fetch(
        `${API_URL}/users/me/push-token`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            expoPushToken,
          }),
        }
      );

    let data: any = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to save Expo push token'
      );
    }

    console.log(
      'EXPO PUSH TOKEN SAVED TO BACKEND'
    );
  };

// ============================================================
// GET NOTIFICATION SETTING
// ============================================================

export const getNotificationSetting =
  async (): Promise<boolean> => {

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      throw new Error(
        'No access token found'
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
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to get notification setting'
      );
    }

    return (
      data.notificationsEnabled === true
    );
  };

// ============================================================
// UPDATE NOTIFICATION SETTING
// ============================================================

export const updateNotificationSetting =
  async (
    notificationsEnabled: boolean
  ): Promise<boolean> => {

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      throw new Error(
        'No access token found'
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

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            notificationsEnabled,
          }),
        }
      );

    let data: any = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to update notification setting'
      );
    }

    return (
      data.notificationsEnabled === true
    );
  };

// ============================================================
// GET ACCESS TOKEN
// ============================================================

export const getAccessToken =
  async (): Promise<string | null> => {

    return await AsyncStorage.getItem(
      'accessToken'
    );
  };

// ============================================================
// GET REFRESH TOKEN
// ============================================================

export const getRefreshToken =
  async (): Promise<string | null> => {

    return await AsyncStorage.getItem(
      'refreshToken'
    );
  };

// ============================================================
// GET SAVED USER
// ============================================================

export const getCurrentUser =
  async (): Promise<User | null> => {

    const savedUser =
      await AsyncStorage.getItem(
        'user'
      );

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(
        savedUser
      );
    } catch (error) {

      console.log(
        'INVALID SAVED USER DATA:',
        error
      );

      return null;
    }
  };

// ============================================================
// GET CURRENT USER FROM BACKEND
// ============================================================

export const fetchCurrentUser =
  async (): Promise<User | null> => {

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      return null;
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
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {

      if (
        response.status === 401
      ) {

        await logout();

        return null;
      }

      throw new Error(
        data.message ||
          'Failed to get current user'
      );
    }

    if (!data.user) {
      return null;
    }

    // ========================================================
    // UPDATE LOCAL USER
    // ========================================================

    await AsyncStorage.setItem(
      'user',
      JSON.stringify(
        data.user
      )
    );

    return data.user;
  };

// ============================================================
// CHECK LOGIN STATUS
// ============================================================

export const isLoggedIn =
  async (): Promise<boolean> => {

    const loggedIn =
      await AsyncStorage.getItem(
        'isLoggedIn'
      );

    return loggedIn === 'true';
  };

// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

export const refreshAccessToken =
  async (): Promise<string> => {

    const refreshToken =
      await getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        'No refresh token found'
      );
    }

    const response =
      await fetch(
        `${API_URL}/auth/refresh-token`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

    let data: any = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {

      await logout();

      throw new Error(
        data.message ||
          'Refresh token expired'
      );
    }

    if (!data.accessToken) {
      throw new Error(
        'New access token was not received'
      );
    }

    await AsyncStorage.setItem(
      'accessToken',
      data.accessToken
    );

    console.log(
      'NEW ACCESS TOKEN SAVED'
    );

    return data.accessToken;
  };

// ============================================================
// LOGOUT
// ============================================================

export const logout =
  async (): Promise<void> => {

    const refreshToken =
      await getRefreshToken();

    try {

      if (refreshToken) {

        const response =
          await fetch(
            `${API_URL}/auth/logout`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                refreshToken,
              }),
            }
          );

        let data: any = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {

          console.log(
            'BACKEND LOGOUT FAILED:',
            data.message
          );

        }
      }

    } catch (error) {

      console.log(
        'LOGOUT SERVER ERROR:',
        error
      );

    } finally {

      await AsyncStorage.multiRemove([
        'accessToken',
        'refreshToken',
        'user',
        'isLoggedIn',
        'loginAlert',
      ]);

    }
  };
