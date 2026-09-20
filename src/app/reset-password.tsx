import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {
  resetPassword,
  requestPasswordReset,
} from '../services/authService';

// ============================================================
// RESET PASSWORD SCREEN
// ============================================================

export default function ResetPassword() {
  const params = useLocalSearchParams<{
    phone?: string | string[];
  }>();

  const phone =
    typeof params.phone === 'string'
      ? params.phone.trim()
      : '';

  const [otp, setOtp] = useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleResend = async () => {
    if (!phone || loading || resending || resendSeconds > 0) return;
    setError('');
    setResendMessage('');
    try {
      setResending(true);
      await requestPasswordReset(phone);
      setOtp('');
      setResendSeconds(30);
      setResendMessage('A new code was requested. Please wait for the administrator to send it on WhatsApp.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to request a new code.');
    } finally {
      setResending(false);
    }
  };


  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  const handleResetPassword = async () => {
    if (loading) return;

    setError('');

    if (!phone) {
      setError(
        'Phone number is missing. Please start again.'
      );
      return;
    }

    const cleanOTP = otp.trim();

    if (!/^\d{6}$/.test(cleanOTP)) {
      setError(
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      setError(
        'Password must contain between 8 and 72 characters.'
      );
      return;
    }

    if (!confirmPassword) {
      setError(
        'Please confirm your new password.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await resetPassword(
        phone,
        cleanOTP,
        newPassword,
        confirmPassword
      );

      // Do not pass passwords or OTP through navigation.
      // The user logs in again with the new password.

      setOtp('');
      setNewPassword('');
      setConfirmPassword('');

      router.replace('/login');

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reset your password. Please try again.';

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.brand}>
              BStore
            </Text>

            <Text style={styles.headerTitle}>
              Reset Password
            </Text>
          </View>
        </View>

        {/* MAIN CARD */}

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="key-outline"
              size={30}
              color="#E35B3F"
            />
          </View>

          <Text style={styles.title}>
            Create a New Password
          </Text>

          <Text style={styles.description}>
            Enter the verification code provided
            by the administrator and choose your
            new password.
          </Text>

          {/* PHONE */}

          <View style={styles.phoneBox}>
            <Ionicons
              name="call-outline"
              size={17}
              color="#E35B3F"
            />

            <Text style={styles.phoneText}>
              {phone || 'Phone number missing'}
            </Text>
          </View>

          {/* OTP */}

          <Text style={styles.label}>
            Verification Code
          </Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(value) => {
              setOtp(
                value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              );

              setError('');
            }}
            placeholder="000000"
            placeholderTextColor="#A49B91"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!loading}
            textAlign="center"
          />

          <Pressable
            onPress={handleResend}
            disabled={loading || resending || resendSeconds > 0}
            accessibilityRole="button"
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              {resending ? 'Requesting...' : resendSeconds > 0
                ? `Resend Code (${resendSeconds}s)` : 'Resend Code'}
            </Text>
          </Pressable>
          {!!resendMessage && <Text style={styles.resendMessage}>{resendMessage}</Text>}

          {/* NEW PASSWORD */}

          <Text style={styles.label}>
            New Password
          </Text>

          <View style={styles.passwordContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color="#817B71"
            />

            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setError('');
              }}
              placeholder="Enter new password"
              placeholderTextColor="#A49B91"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() => {
                setShowNewPassword(
                  (current) => !current
                );
              }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={
                showNewPassword
                  ? 'Hide new password'
                  : 'Show new password'
              }
            >
              <Ionicons
                name={
                  showNewPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#817B71"
              />
            </Pressable>
          </View>

          {/* CONFIRM PASSWORD */}

          <Text style={styles.label}>
            Confirm New Password
          </Text>

          <View style={styles.passwordContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color="#817B71"
            />

            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError('');
              }}
              placeholder="Confirm new password"
              placeholderTextColor="#A49B91"
              secureTextEntry={
                !showConfirmPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
              onSubmitEditing={handleResetPassword}
              returnKeyType="done"
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() => {
                setShowConfirmPassword(
                  (current) => !current
                );
              }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword
                  ? 'Hide confirmation password'
                  : 'Show confirmation password'
              }
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#817B71"
              />
            </Pressable>
          </View>

          {/* PASSWORD REQUIREMENT */}

          <View style={styles.requirementBox}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#817B71"
            />

            <Text style={styles.requirementText}>
              Password must be between 8 and 72
              characters.
            </Text>
          </View>

          {/* ERROR */}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#C94C4C"
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* RESET BUTTON */}

          <Pressable
            style={[
              styles.resetButton,
              loading
                ? styles.disabledButton
                : null,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text style={styles.resetButtonText}>
                  Reset Password
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>

          {/* BACK TO LOGIN */}

          <Pressable
            style={styles.loginButton}
            onPress={() => {
              router.replace('/login');
            }}
            disabled={loading}
          >
            <Ionicons
              name="arrow-back-outline"
              size={17}
              color="#E35B3F"
            />

            <Text style={styles.loginText}>
              Back to Login
            </Text>
          </Pressable>
        </View>

        {/* SECURITY NOTE */}

        <View style={styles.securityBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color="#817B71"
          />

          <Text style={styles.securityText}>
            Never share your verification code
            or password with anyone.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  headerText: {
    flex: 1,
  },

  brand: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E35B3F',
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#171717',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 20,
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 10,
  },

  description: {
    fontSize: 13,
    color: '#817B71',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#FFF4EE',
    marginBottom: 23,
  },

  phoneText: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 9,
    marginTop: 9,
  },

  resendButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  resendText: {
    color: '#E35B3F',
    fontSize: 14,
    fontWeight: '800',
  },
  resendMessage: {
    color: '#817B71',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },

  otpInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#F8F2EA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    color: '#171717',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 7,
    marginBottom: 11,
  },

  passwordContainer: {
    height: 56,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    backgroundColor: '#F8F2EA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    marginBottom: 11,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 11,
    color: '#171717',
    fontSize: 14,
  },

  eyeButton: {
    width: 47,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  requirementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 5,
  },

  requirementText: {
    flex: 1,
    color: '#817B71',
    fontSize: 11,
    lineHeight: 17,
  },

  errorBox: {
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    padding: 12,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#C94C4C',
    fontWeight: '600',
    lineHeight: 18,
  },

  resetButton: {
    backgroundColor: '#E35B3F',
    borderRadius: 16,
    minHeight: 55,
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  disabledButton: {
    opacity: 0.55,
  },

  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  loginButton: {
    marginTop: 22,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  loginText: {
    color: '#E35B3F',
    fontSize: 14,
    fontWeight: '800',
  },

  securityBox: {
    marginTop: 22,
    backgroundColor: '#F0E8DC',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  securityText: {
    flex: 1,
    color: '#817B71',
    fontSize: 12,
    lineHeight: 19,
  },
});