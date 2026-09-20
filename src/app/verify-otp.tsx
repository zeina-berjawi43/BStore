import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import {
  verifyRegistrationOTP,
  resendRegistrationOTP,
} from '../services/authService';

export default function VerifyOTP() {
  const params = useLocalSearchParams<{
    phone?: string;
    mode?: string;
  }>();

  const phone =
    typeof params.phone === 'string'
      ? params.phone.trim()
      : '';

  const mode =
    typeof params.mode === 'string'
      ? params.mode
      : 'register';

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // This screen handles registration verification only.
  // Normal login uses phone + password without OTP.

  const isRegistration = mode === 'register';

  // =========================================================
  // RESEND COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds]);

  // =========================================================
  // VERIFY REGISTRATION OTP
  // =========================================================

  const handleVerify = async () => {
    if (loading || resending) return;

    setError('');
    setMessage('');

    if (!isRegistration) {
      setError(
        'This verification page is for registration only.'
      );
      return;
    }

    if (!phone) {
      setError(
        'Phone number is missing. Please register again.'
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

    try {
      setLoading(true);

      // The service saves the access token,
      // refresh token and user after verification.
      await verifyRegistrationOTP(phone, cleanOTP);

      setOtp('');
      setPassword('');

      // Registration verification logs the user in.
      router.replace('/');
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to verify the code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESEND REGISTRATION OTP
  // =========================================================

  const handleResend = async () => {
    if (loading || resending || seconds > 0) return;

    setError('');
    setMessage('');

    if (!isRegistration) {
      setError(
        'Please return to the login page.'
      );
      return;
    }

    if (!phone) {
      setError(
        'Phone number is missing. Please register again.'
      );
      return;
    }

    // Never pass a password through navigation params.
    // The user enters it again here when resending.
    if (!password) {
      setError(
        'Enter your password to request another code.'
      );
      return;
    }

    try {
      setResending(true);

      await resendRegistrationOTP(phone, password);

      setOtp('');
      setPassword('');
      setSeconds(30);

      setMessage(
        'A new code has been requested. Please wait for the administrator to send it to you.'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to request another code.'
      );
    } finally {
      setResending(false);
    }
  };

  const busy = loading || resending;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={busy}
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
            <Text style={styles.smallTitle}>
              BStore
            </Text>

            <Text style={styles.title}>
              Verify Phone
            </Text>

            <Text style={styles.subtitle}>
              Complete your account registration
            </Text>
          </View>
        </View>

        {/* VERIFICATION CARD */}

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="phone-portrait-outline"
              size={29}
              color="#E35B3F"
            />
          </View>

          <Text style={styles.cardTitle}>
            Verification Code
          </Text>

          <Text style={styles.description}>
            Enter the 6-digit code sent to you
            by the administrator for:
          </Text>

          <View style={styles.phoneBox}>
            <Ionicons
              name="call-outline"
              size={16}
              color="#E35B3F"
            />

            <Text style={styles.phone}>
              {phone || 'Phone number missing'}
            </Text>
          </View>

          {/* OTP */}

          <Text style={styles.label}>
            Verification Code
          </Text>

          <TextInput
            value={otp}
            onChangeText={(value) => {
              setOtp(
                value.replace(/\D/g, '').slice(0, 6)
              );
              setError('');
              setMessage('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#B8AFA5"
            editable={!busy}
            textAlign="center"
            autoComplete="one-time-code"
            style={[
              styles.otpInput,
              error ? styles.inputError : null,
            ]}
          />

          {/* ERROR */}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color="#C94C4C"
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* SUCCESS MESSAGE */}

          {message ? (
            <View style={styles.messageBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color="#26734D"
              />

              <Text style={styles.messageText}>
                {message}
              </Text>
            </View>
          ) : null}

          {/* VERIFY BUTTON */}

          <Pressable
            style={[
              styles.verifyButton,
              busy ? styles.disabledButton : null,
            ]}
            onPress={handleVerify}
            disabled={busy || !isRegistration}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text style={styles.verifyText}>
                  Verify
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>

          {/* RESEND SECTION */}

          {isRegistration ? (
            <View style={styles.resendSection}>
              <Text style={styles.resendTitle}>
                Didn't receive the code?
              </Text>

              <Text style={styles.resendDescription}>
                Enter your account password to
                request a new verification code.
              </Text>

              <Text style={styles.label}>
                Password
              </Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError('');
                    setMessage('');
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#B8AFA5"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  editable={!busy}
                  style={styles.passwordInput}
                />

                <Pressable
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowPassword((current) => !current)
                  }
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={21}
                    color="#817B71"
                  />
                </Pressable>
              </View>

              <Pressable
                style={styles.resendButton}
                onPress={handleResend}
                disabled={
                  busy ||
                  seconds > 0 ||
                  !phone
                }
              >
                {resending ? (
                  <ActivityIndicator
                    size="small"
                    color="#E35B3F"
                  />
                ) : (
                  <View style={styles.resendContent}>
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color={
                        seconds > 0
                          ? '#AFA79E'
                          : '#E35B3F'
                      }
                    />

                    <Text
                      style={[
                        styles.resendText,
                        seconds > 0
                          ? styles.resendDisabled
                          : null,
                      ]}
                    >
                      {seconds > 0
                        ? `Resend code in ${seconds}s`
                        : 'Resend Code'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.resendButton}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.resendText}>
                Return to Login
              </Text>
            </Pressable>
          )}

          {/* EXPIRATION NOTE */}

          <View style={styles.noteBox}>
            <Ionicons
              name="time-outline"
              size={16}
              color="#817B71"
            />

            <Text style={styles.note}>
              The verification code expires after
              90 minutes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#F7F3EC',
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  smallTitle: {
    color: '#E35B3F',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#171717',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#817B71',
    lineHeight: 18,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 19,
    alignItems: 'center',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 11,
    elevation: 3,
  },

  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#171717',
    textAlign: 'center',
  },

  description: {
    fontSize: 13,
    color: '#817B71',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 14,
  },

  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFF4EE',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    maxWidth: '100%',
  },

  phone: {
    fontSize: 14,
    color: '#171717',
    fontWeight: '800',
    flexShrink: 1,
  },

  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 8,
    marginTop: 5,
  },

  otpInput: {
    width: '100%',
    height: 57,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    backgroundColor: '#F8F2EA',
    color: '#171717',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 8,
  },

  inputError: {
    borderColor: '#C94C4C',
    backgroundColor: '#FFF7F3',
  },

  errorBox: {
    width: '100%',
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#FFF0EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  errorText: {
    flexShrink: 1,
    color: '#C94C4C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  messageBox: {
    width: '100%',
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#EDF8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  messageText: {
    flexShrink: 1,
    color: '#26734D',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  verifyButton: {
    width: '100%',
    minHeight: 54,
    marginTop: 17,
    backgroundColor: '#E35B3F',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  disabledButton: {
    opacity: 0.55,
  },

  verifyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  resendSection: {
    width: '100%',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E7DED1',
    paddingTop: 20,
  },

  resendTitle: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  resendDescription: {
    color: '#817B71',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 15,
  },

  passwordContainer: {
    width: '100%',
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    backgroundColor: '#F8F2EA',
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 15,
    fontSize: 14,
    color: '#171717',
  },

  eyeButton: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resendButton: {
    marginTop: 15,
    paddingVertical: 10,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  resendText: {
    color: '#E35B3F',
    fontSize: 14,
    fontWeight: '800',
  },

  resendDisabled: {
    color: '#AFA79E',
  },

  noteBox: {
    width: '100%',
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8F2EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  note: {
    flex: 1,
    fontSize: 11,
    color: '#817B71',
    textAlign: 'center',
    lineHeight: 16,
  },
});