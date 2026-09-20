import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  requestPasswordReset,
} from '../services/authService';

export default function ForgotPassword() {
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================================================
  // REQUEST PASSWORD RESET OTP
  // =========================================================

  const handleContinue = async () => {
    if (loading) return;

    setError('');

    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      setError('Please enter your phone number.');
      return;
    }

    const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);

      await requestPasswordReset(cleanPhone);

      // Only the phone number is passed through navigation.
      // Never put an OTP or password in route parameters.
      router.push({
        pathname: '/reset-password',
        params: {
          phone: cleanPhone,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to request a verification code. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.brand}>BStore</Text>

            <Text style={styles.headerTitle}>
              Forgot Password
            </Text>
          </View>
        </View>

        {/* MAIN CARD */}

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="lock-closed-outline"
              size={30}
              color="#E35B3F"
            />
          </View>

          <Text style={styles.title}>
            Reset Your Password
          </Text>

          <Text style={styles.description}>
            Enter the phone number linked to your BStore
            account. A verification code will be requested
            so you can set a new password.
          </Text>

          {/* PHONE */}

          <Text style={styles.label}>
            Phone Number
          </Text>

          <View
            style={[
              styles.inputContainer,
              error ? styles.inputError : null,
            ]}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color="#817B71"
            />

            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                setError('');
              }}
              placeholder="Enter your phone number"
              placeholderTextColor="#A49B91"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="tel"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
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

          {/* CONTINUE BUTTON */}

          <Pressable
            style={[
              styles.continueButton,
              loading ? styles.disabledButton : null,
            ]}
            onPress={handleContinue}
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
                <Text style={styles.continueText}>
                  Continue
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>

          {/* BACK TO LOGIN */}

          <Pressable
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
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

        {/* INFO */}

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#817B71"
          />

          <Text style={styles.infoText}>
            The administrator will provide the verification
            code. Do not share your code or password with
            anyone.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =========================================================
// STYLES
// =========================================================

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
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 9,
  },

  inputContainer: {
    height: 56,
    backgroundColor: '#F8F2EA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#171717',
    paddingLeft: 11,
  },

  inputError: {
    borderColor: '#C94C4C',
    backgroundColor: '#FFF7F3',
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

  continueButton: {
    backgroundColor: '#E35B3F',
    borderRadius: 16,
    minHeight: 55,
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
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
  },

  continueText: {
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

  infoBox: {
    marginTop: 22,
    backgroundColor: '#F0E8DC',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  infoText: {
    flex: 1,
    color: '#817B71',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '500',
  },
});