import { request } from './request';
import { readTokens, updateTokens, clearTokens, applyRefresh, acknowledgeLogout, saveSessionUser, readSessionUser, getSessionSnapshot } from './tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://mystore-backend-u6ey.onrender.com';

export class PhoneVerificationRequiredError extends Error {}

// ============================================================
// TYPES
// ============================================================

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
  phoneVerificationStatus?: string;
  phoneVerificationType?: string;
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

// ============================================================
// JWT EXPIRATION
// ============================================================

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const decodeBase64 = (input: string): string => {
  let output = '';
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '=') break;

    const value = BASE64_CHARS.indexOf(char);

    if (value === -1) continue;

    buffer = (buffer << 6) | value;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;

      output += String.fromCharCode(
        (buffer >> bitsCollected) & 0xff
      );
    }
  }

  return output;
};

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) return true;

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const payload = JSON.parse(
      decodeBase64(base64)
    );

    if (
      !payload ||
      typeof payload.exp !== 'number' ||
      typeof payload.sid !== 'string'
    ) {
      return true;
    }

    // Refresh 60 seconds before expiration.
    return payload.exp <= Date.now() / 1000 + 60;
  } catch {
    return true;
  }
};

// ============================================================
// LOCAL AUTH STORAGE
// ============================================================

const saveAuthData = async (
  data: AuthResponse,
  expectedRevision: number
): Promise<void> => {
  if (data.accessToken && data.refreshToken) {
    await updateTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user, undefined, expectedRevision);
  }
};
const clearLocalAccountData = async (expectedAccessToken?: string | null): Promise<void> => {
  const savedUser = await readSessionUser().catch(() => null);

  let userId: string | undefined;

  if (savedUser) {
    try {
      const user: User = JSON.parse(savedUser);
      userId = user._id || user.id;
    } catch {
      // Invalid saved user data.
    }
  }

  await clearTokens(expectedAccessToken);
  if (userId) {
    // Best-effort bookkeeping must never prevent secure logout.
    await AsyncStorage.removeItem(`pendingCheckout:${userId}`).catch(() => {});
  }
};

export const logoutLocal = clearLocalAccountData;

// ============================================================
// AUTH REQUEST HELPER
// ============================================================

const authPost = async (
  path: string,
  body: Record<string, unknown>,
  token?: string
): Promise<AuthResponse> => {
  const response = await request(
    `${API_URL}/auth/${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      body: JSON.stringify(body),
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
    if (path === 'login' && response.status === 403 && data.requiresPhoneVerification === true) {
      throw new PhoneVerificationRequiredError(data.message || 'Please verify your phone number.');
    }
    throw new Error(
      data.message || 'Request failed.'
    );
  }

  return data;
};

// ============================================================
// REGISTRATION
// ============================================================

export const registerUser = async ({
  firstName,
  lastName,
  phone,
  address,
  password,
  confirmPassword,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> => {
  return authPost('register', {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.trim(),
    address: address.trim(),
    password,
    confirmPassword,
  });
};

// ============================================================
// LOGIN
// ============================================================

export const loginUser = async (
  phone: string,
  password: string
): Promise<AuthResponse> => {
  await readTokens();
  const revision = getSessionSnapshot().revision;
  const data = await authPost('login', {
    phone: phone.trim(),
    password,
  });

  await saveAuthData(data, revision);

  return data;
};

// ============================================================
// REGISTRATION OTP
// ============================================================

export const resendRegistrationOTP = async (
  phone: string,
  password: string
): Promise<AuthResponse> => {
  return authPost('resend-registration-otp', {
    phone: phone.trim(),
    password,
  });
};

export const verifyRegistrationOTP = async (
  phone: string,
  otp: string
): Promise<AuthResponse> => {
  await readTokens();
  const revision = getSessionSnapshot().revision;
  const data = await authPost(
    'verify-registration-otp',
    {
      phone: phone.trim(),
      otp: otp.trim(),
    }
  );

  await saveAuthData(data, revision);

  return data;
};

// Compatibility with older imports.
// requestLoginOTP now requires the registration password.
export const requestLoginOTP =
  resendRegistrationOTP;

export const verifyLoginOTP =
  verifyRegistrationOTP;

// ============================================================
// FORGOT PASSWORD
// ============================================================

export const requestPasswordReset = async (
  phone: string
): Promise<AuthResponse> => {
  return authPost('forgot-password', {
    phone: phone.trim(),
  });
};

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetPassword = async (
  phone: string,
  otp: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthResponse> => {
  return authPost('reset-password', {
    phone: phone.trim(),
    otp: otp.trim(),
    newPassword,
    confirmPassword,
  });
};

// ============================================================
// ACCESS TOKEN
// ============================================================

export const getAccessToken = async (
): Promise<string | null> => {
  return (await readTokens()).accessToken;
};

// ============================================================
// SAVED USER
// ============================================================

export const getSavedUser = async (
): Promise<User | null> => {
  try {
    const savedUser =
      await readSessionUser();

    if (!savedUser) return null;

    return JSON.parse(savedUser) as User;
  } catch (error) {
    if (__DEV__) { console.log(
      'GET SAVED USER ERROR:',
      error
    ); }

    return null;
  }
};

// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

export const refreshAccessToken = async (
): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

let refreshInFlight: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const credentials = await readTokens();
  const refreshToken = credentials.refreshToken;

  if (!refreshToken) {
    if (credentials.accessToken) await clearTokens(credentials.accessToken);
    return null;
  }

  const response = await request(
    `${API_URL}/auth/refresh-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    }
  );

  let data: AuthResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // Never restore an old session after logout or a different login.
  const currentRefreshToken = await (await readTokens()).refreshToken;
  if (currentRefreshToken !== refreshToken) {
    // A caller treating null as logout must not erase a replacement session.
    if (currentRefreshToken) throw new Error('Your session changed. Please try again.');
    return null;
  }

  if (!response.ok) {
    // Invalid/expired refresh tokens end the local session.
    // A server error does not automatically log the user out.
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403
    ) {
      return applyRefresh(refreshToken, null);
    }

    throw new Error(data?.message || 'Unable to refresh your session. Please try again.');
  }

  if (!data?.accessToken) {
    throw new Error('Invalid session response. Please try again.');
  }

  return applyRefresh(refreshToken, data.accessToken);
};

// ============================================================
// VALID ACCESS TOKEN
// ============================================================

export const getValidAccessToken = async (
): Promise<string | null> => {
  const revision = getSessionSnapshot().revision;
  const token = await getAccessToken();
  if (getSessionSnapshot().revision !== revision) throw new Error('Your session changed. Please try again.');

  if (token && !isTokenExpired(token)) {
    return token;
  }

  const refreshed = await refreshAccessToken();
  if (refreshed && getSessionSnapshot().revision !== revision) throw new Error('Your session changed. Please try again.');
  return refreshed;
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthResponse> => {
  const token = await getValidAccessToken();
  const revision = getSessionSnapshot().revision;

  if (!token) {
    throw new Error('Please log in again.');
  }

  const data = await authPost(
    'change-password',
    {
      currentPassword,
      newPassword,
      confirmPassword,
    },
    token
  );

  if (!data.accessToken || !data.refreshToken) {
    throw new Error('Password changed, but the server did not return a new session. Please log in again.');
  }

  // Replace revoked credentials with the new session before returning.
  await saveAuthData(data, revision);

  return data;
};

// ============================================================
// LOGOUT
// ============================================================

let pendingLogoutFlush: Promise<void> | null = null;
export const flushPendingLogouts = (): Promise<void> => {
  if (!pendingLogoutFlush) pendingLogoutFlush = (async () => {
    for (const refreshToken of (await readTokens()).pendingLogouts || []) {
      try {
        const response = await request(API_URL + '/auth/logout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }, 5000);
        if (response.ok || response.status === 400 || response.status === 401 || response.status === 403) {
          await acknowledgeLogout(refreshToken);
        }
      } catch { break; }
    }
  })().finally(() => { pendingLogoutFlush = null; });
  return pendingLogoutFlush;
};

export const logout = async (): Promise<void> => {
  await logoutLocal();
  await flushPendingLogouts();
};

// ============================================================
// FETCH CURRENT USER
// ============================================================

export const fetchCurrentUser = async (
): Promise<User> => {
  const accessToken =
    await getValidAccessToken();

  if (!accessToken) {
    throw new Error(
      'No access token found.'
    );
  }

  const response = await request(
    `${API_URL}/users/me`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  let data: {
    message?: string;
    user?: User;
  } = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    await logoutLocal(accessToken);

    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Unable to load account information.'
    );
  }

  if (!data.user) {
    throw new Error(
      'User information was not found.'
    );
  }

  await saveSessionUser(accessToken, data.user);

  return data.user;
};

// ============================================================
// GET NOTIFICATION SETTING
// ============================================================

export const getNotificationSetting = async (
): Promise<boolean> => {
  const accessToken =
    await getValidAccessToken();

  if (!accessToken) {
    throw new Error(
      'No access token found.'
    );
  }

  const response = await request(
    `${API_URL}/users/me/notification-setting`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  let data: {
    message?: string;
    notificationsEnabled?: boolean;
  } = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    await logoutLocal(accessToken);

    throw new Error('Session expired.');
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Unable to load notification settings.'
    );
  }

  const enabled = Boolean(
    data.notificationsEnabled
  );

  const currentUser = await getSavedUser();

  if (currentUser) {
    await saveSessionUser(accessToken, {
        ...currentUser,
        notificationsEnabled: enabled,
      });
  }

  return enabled;
};

// ============================================================
// UPDATE NOTIFICATION SETTING
// ============================================================

export const updateNotificationSetting = async (
  enabled: boolean
): Promise<boolean> => {
  const accessToken =
    await getValidAccessToken();

  if (!accessToken) {
    throw new Error(
      'No access token found.'
    );
  }

  const response = await request(
    `${API_URL}/users/me/notification-setting`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        notificationsEnabled: enabled,
      }),
    }
  );

  let data: {
    message?: string;
    notificationsEnabled?: boolean;
  } = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    await logoutLocal(accessToken);

    throw new Error('Session expired.');
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Unable to update notification settings.'
    );
  }

  const savedValue = Boolean(
    data.notificationsEnabled
  );

  const currentUser = await getSavedUser();

  if (currentUser) {
    await saveSessionUser(accessToken, {
        ...currentUser,
        notificationsEnabled: savedValue,
      });
  }

  return savedValue;
};

// ============================================================
// CHECK LOGIN STATUS
// ============================================================

export const isLoggedIn = async (
): Promise<boolean> => {
  try {
    const accessToken =
      await getValidAccessToken();

    if (!accessToken) return false;

    const loggedIn =
      await AsyncStorage.getItem('isLoggedIn');

    return loggedIn === 'true';
  } catch (error) {
    if (__DEV__) { console.log(
      'IS LOGGED IN ERROR:',
      error
    ); }

    return false;
  }
};

// ============================================================
// CHECK ADMIN
// ============================================================

export const isAdmin = async (
): Promise<boolean> => {
  try {
    const user = await getSavedUser();

    return user?.role === 'admin';
  } catch (error) {
    if (__DEV__) { console.log(
      'IS ADMIN ERROR:',
      error
    ); }

    return false;
  }
};// ============================================================
// DELETE ACCOUNT
// ============================================================

export const deleteAccount = async (): Promise<void> => {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('Please log in again.');
  }

  const response = await request(`${API_URL}/users/me`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  let data: { message?: string } = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Unable to delete your account. Please try again.'
    );
  }

  // The server has confirmed account deletion.
  try {
    await logoutLocal(accessToken);
  } catch (error) {
    if (__DEV__) {
      console.error('Local cleanup failed:', error);
    }

    // Try to clear the session independently.
    try {
      await clearTokens(accessToken);
    } catch (tokenError) {
      if (__DEV__) {
        console.error('Token cleanup failed:', tokenError);
      }
    }

    throw new Error(
      'Your account was deleted, but some data could not be cleared from this device. Please clear BStore app data in your phone settings.'
    );
  }
};
// ============================================================
// API URL EXPORT
// ============================================================

export { API_URL };
