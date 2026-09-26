import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import {
  loginUser,
  PhoneVerificationRequiredError,
} from '../services/authService';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [phoneError, setPhoneError] =
    useState('');

  const [passwordError, setPasswordError] =
    useState('');

  const [generalError, setGeneralError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================================================
  // LOGIN WITH PHONE AND PASSWORD
  // =========================================================

  const handleLogin = async () => {
    if (loading) return;

    setPhoneError('');
    setPasswordError('');
    setGeneralError('');

    const cleanPhone = phone.trim();

    const phoneRegex =
      /^[0-9+\-\s()]{7,20}$/;

    let hasError = false;

    if (!cleanPhone) {
      setPhoneError(
        'Please enter your phone number.'
      );

      hasError = true;
    } else if (!phoneRegex.test(cleanPhone)) {
      setPhoneError(
        'Please enter a valid phone number.'
      );

      hasError = true;
    }

    if (!password) {
      setPasswordError(
        'Please enter your password.'
      );

      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);

      // loginUser saves the authentication data
      // using authService.
      await loginUser(cleanPhone, password);

      // No OTP is required for normal login.
      router.replace('/');

    } catch (error: any) {
      if (error instanceof PhoneVerificationRequiredError) {
        setPassword('');
        router.push({ pathname: '/verify-otp', params: { phone: cleanPhone, mode: 'register' } });
        return;
      }
      if (__DEV__) { console.log(
        'LOGIN ERROR:',
        error?.message
      ); }

      setGeneralError(
        error?.message ||
          'Unable to log in. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

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
            disabled={loading}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Login with your phone number and password
            </Text>
          </View>
        </View>

        {/* LOGIN CARD */}

        <View style={styles.card}>
          {/* PHONE */}

          <Text style={styles.label}>
            Phone Number
          </Text>

          <TextInput
            placeholder="Phone Number"
            placeholderTextColor="#9A9186"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setPhoneError('');
              setGeneralError('');
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="tel"
            editable={!loading}
            style={[
              styles.input,
              phoneError ? styles.inputError : null,
            ]}
          />

          {phoneError ? (
            <Text style={styles.errorText}>
              {phoneError}
            </Text>
          ) : null}

          {/* PASSWORD */}

          <Text style={styles.passwordLabel}>
            Password
          </Text>

          <View
            style={[
              styles.passwordContainer,
              passwordError
                ? styles.inputError
                : null,
            ]}
          >
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#9A9186"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
                setGeneralError('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              editable={!loading}
              style={styles.passwordInput}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <Pressable
              onPress={() =>
                setShowPassword((previous) => !previous)
              }
              disabled={loading}
              style={styles.eyeButton}
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

          {passwordError ? (
            <Text style={styles.errorText}>
              {passwordError}
            </Text>
          ) : null}

          {/* FORGOT PASSWORD */}

          <Pressable
            style={styles.forgotButton}
            onPress={() =>
              router.push('/forgot-password')
            }
            disabled={loading}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </Pressable>

          {/* ERROR */}

          {generalError ? (
            <Text style={styles.generalError}>
              {generalError}
            </Text>
          ) : null}

          {/* LOGIN BUTTON */}

          <Pressable
            style={[
              styles.loginButton,
              loading ? styles.disabledButton : null,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text style={styles.loginText}>
                  Login
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
        </View>

        {/* REGISTER */}

        <View style={styles.registerSection}>
          <Text style={styles.registerQuestion}>
            Don't have an account?
          </Text>

          <Pressable
            style={styles.registerButton}
            onPress={() =>
              router.push('/register')
            }
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Create Account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color="#E35B3F"
            />
          </Pressable>
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
    backgroundColor: '#F7F3EC',
    paddingTop: 18,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
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
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 29,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#817B71',
    lineHeight: 18,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 19,
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 11,
    elevation: 3,
  },

  label: {
    marginBottom: 8,
    marginTop: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#24221E',
  },

  passwordLabel: {
    marginTop: 15,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#24221E',
  },

  input: {
    height: 54,
    backgroundColor: '#F8F2EA',
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E6DED2',
    marginBottom: 7,
    color: '#171717',
    fontWeight: '500',
  },

  passwordContainer: {
    height: 54,
    backgroundColor: '#F8F2EA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E6DED2',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 16,
    paddingRight: 6,
    fontSize: 15,
    color: '#171717',
    fontWeight: '500',
  },

  eyeButton: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputError: {
    borderColor: '#D93025',
    backgroundColor: '#FFF7F3',
  },

  errorText: {
    color: '#D93025',
    fontSize: 12,
    marginBottom: 13,
    marginLeft: 4,
    fontWeight: '600',
  },

  generalError: {
    color: '#D93025',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: '600',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },

  forgotText: {
    color: '#E35B3F',
    fontSize: 13,
    fontWeight: '800',
  },

  loginButton: {
    marginTop: 20,
    backgroundColor: '#E35B3F',
    minHeight: 53,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#E35B3F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },

  disabledButton: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },

  loginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.1,
  },

  registerSection: {
    marginTop: 24,
    alignItems: 'center',
  },

  registerQuestion: {
    fontSize: 13,
    color: '#817B71',
    marginBottom: 9,
    fontWeight: '500',
  },

  registerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },

  registerText: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
  },
});
