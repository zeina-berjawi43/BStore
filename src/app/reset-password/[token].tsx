
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { useState } from 'react';

// =========================================================
// BACKEND URL
// =========================================================

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';

// =========================================================
// COMPONENT
// =========================================================

export default function ResetPassword() {

  // =======================================================
  // GET TOKEN FROM URL
  // =======================================================

  const params =
    useLocalSearchParams<{
      token?: string;
    }>();

  const token =
    typeof params.token === 'string'
      ? params.token
      : Array.isArray(params.token)
        ? params.token[0]
        : '';

  // =======================================================
  // STATES
  // =======================================================

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [passwordError, setPasswordError] =
    useState('');

  const [confirmPasswordError, setConfirmPasswordError] =
    useState('');

  const [generalError, setGeneralError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =======================================================
  // RESET PASSWORD
  // =======================================================

  const handleResetPassword =
    async () => {

      setPasswordError('');
      setConfirmPasswordError('');
      setGeneralError('');
      setSuccessMessage('');

      const cleanPassword =
        password.trim();

      const cleanConfirmPassword =
        confirmPassword.trim();

      // ===================================================
      // TOKEN CHECK
      // ===================================================

      if (!token) {
        setGeneralError(
          'Invalid or missing password reset link.'
        );

        return;
      }

      // ===================================================
      // PASSWORD EMPTY
      // ===================================================

      if (!cleanPassword) {
        setPasswordError(
          'Please enter your new password.'
        );

        return;
      }

      // ===================================================
      // PASSWORD LENGTH
      // ===================================================

      if (cleanPassword.length < 6) {
        setPasswordError(
          'Password must be at least 6 characters.'
        );

        return;
      }

      // ===================================================
      // CONFIRM PASSWORD EMPTY
      // ===================================================

      if (!cleanConfirmPassword) {
        setConfirmPasswordError(
          'Please confirm your new password.'
        );

        return;
      }

      // ===================================================
      // PASSWORD MATCH
      // ===================================================

      if (
        cleanPassword !==
        cleanConfirmPassword
      ) {
        setConfirmPasswordError(
          'Passwords do not match.'
        );

        return;
      }

      // ===================================================
      // SEND REQUEST
      // ===================================================

      try {

        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/auth/reset-password/${encodeURIComponent(token)}`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },

              body: JSON.stringify({
                password:
                  cleanPassword,

                confirmPassword:
                  cleanConfirmPassword,
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

        console.log(
          'RESET PASSWORD STATUS:',
          response.status
        );

        console.log(
          'RESET PASSWORD RESPONSE:',
          data
        );

        // =================================================
        // BACKEND ERROR
        // =================================================

        if (!response.ok) {

          setGeneralError(
            data.message ||
              'Could not reset your password.'
          );

          return;
        }

        // =================================================
        // SUCCESS
        // =================================================

        setSuccessMessage(
          data.message ||
            'Password reset successfully.'
        );

        setPassword('');
        setConfirmPassword('');

        // =================================================
        // GO TO LOGIN
        // =================================================

        setTimeout(() => {
          router.replace('/login');
        }, 1500);

      } catch (error) {

        console.log(
          'RESET PASSWORD ERROR:',
          error
        );

        setGeneralError(
          'Cannot connect to the server. Please try again.'
        );

      } finally {

        setLoading(false);

      }
    };

  // =======================================================
  // UI
  // =======================================================

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace('/login')
            }
            disabled={loading}
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />

          </Pressable>

          <View style={styles.headerText}>

            <Text style={styles.title}>
              Reset Password
            </Text>

            <Text style={styles.subtitle}>
              Create a new password for your account
            </Text>

          </View>

        </View>

        {/* CARD */}

        <View style={styles.card}>

          {/* ICON */}

          <View style={styles.iconContainer}>

            <Ionicons
              name="lock-closed-outline"
              size={30}
              color="#D4AF37"
            />

          </View>

          <Text style={styles.cardTitle}>
            Create New Password
          </Text>

          <Text style={styles.description}>
            Your new password must be at least
            6 characters long.
          </Text>

          {/* NEW PASSWORD */}

          <Text style={styles.label}>
            New Password
          </Text>

          <View style={styles.passwordWrapper}>

            <TextInput
              placeholder="Enter new password"
              placeholderTextColor="#888888"
              value={password}
              onChangeText={(text) => {

                setPassword(text);

                if (passwordError) {
                  setPasswordError('');
                }

                if (generalError) {
                  setGeneralError('');
                }

              }}
              secureTextEntry={
                !showPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={[
                styles.input,
                styles.passwordInput,
                passwordError
                  ? styles.inputError
                  : null,
              ]}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() =>
                setShowPassword(
                  !showPassword
                )
              }
              disabled={loading}
            >

              <Ionicons
                name={
                  showPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={21}
                color="#777777"
              />

            </Pressable>

          </View>

          {passwordError ? (
            <Text style={styles.errorText}>
              {passwordError}
            </Text>
          ) : null}

          {/* CONFIRM PASSWORD */}

          <Text style={styles.label}>
            Confirm New Password
          </Text>

          <View style={styles.passwordWrapper}>

            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor="#888888"
              value={confirmPassword}
              onChangeText={(text) => {

                setConfirmPassword(text);

                if (confirmPasswordError) {
                  setConfirmPasswordError('');
                }

                if (generalError) {
                  setGeneralError('');
                }

              }}
              secureTextEntry={
                !showConfirmPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={[
                styles.input,
                styles.passwordInput,
                confirmPasswordError
                  ? styles.inputError
                  : null,
              ]}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              disabled={loading}
            >

              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={21}
                color="#777777"
              />

            </Pressable>

          </View>

          {confirmPasswordError ? (
            <Text style={styles.errorText}>
              {confirmPasswordError}
            </Text>
          ) : null}

          {/* GENERAL ERROR */}

          {generalError ? (
            <View style={styles.errorBox}>

              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#D93025"
              />

              <Text style={styles.generalError}>
                {generalError}
              </Text>

            </View>
          ) : null}

          {/* SUCCESS */}

          {successMessage ? (
            <View style={styles.successBox}>

              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#2E7D32"
              />

              <Text style={styles.successText}>
                {successMessage}
              </Text>

            </View>
          ) : null}

          {/* RESET BUTTON */}

          <Pressable
            style={[
              styles.resetButton,
              loading &&
                styles.resetButtonDisabled,
            ]}
            onPress={
              handleResetPassword
            }
            disabled={loading}
          >

            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text style={styles.resetText}>
                  Reset Password
                </Text>

                <Ionicons
                  name="checkmark"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}

          </Pressable>

        </View>

        {/* BACK TO LOGIN */}

        <View style={styles.loginSection}>

          <Text style={styles.loginQuestion}>
            Remember your password?
          </Text>

          <Pressable
            style={styles.loginButton}
            onPress={() =>
              router.replace('/login')
            }
            disabled={loading}
          >

            <Ionicons
              name="arrow-back"
              size={17}
              color="#D4AF37"
            />

            <Text style={styles.loginText}>
              Back to Login
            </Text>

          </Pressable>

        </View>

      </ScrollView>

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: '#F7F7F7',
      paddingTop: 20,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 40,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#000000',
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: '#888888',
    },

    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      padding: 20,
    },

    iconContainer: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#FFF9E6',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 15,
    },

    cardTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#000000',
      textAlign: 'center',
      marginBottom: 8,
    },

    description: {
      fontSize: 13,
      lineHeight: 20,
      color: '#777777',
      textAlign: 'center',
      marginBottom: 25,
    },

    label: {
      marginBottom: 7,
      fontSize: 14,
      fontWeight: '700',
      color: '#1A1A1A',
    },

    input: {
      height: 52,
      backgroundColor: '#F7F7F7',
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      marginBottom: 7,
      color: '#000000',
    },

    inputError: {
      borderColor: '#D93025',
    },

    passwordWrapper: {
      position: 'relative',
      marginBottom: 0,
    },

    passwordInput: {
      paddingRight: 50,
    },

    eyeButton: {
      position: 'absolute',
      right: 15,
      top: 0,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },

    errorText: {
      color: '#D93025',
      fontSize: 12,
      marginBottom: 18,
      marginLeft: 4,
      fontWeight: '500',
    },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FDECEC',
      borderRadius: 12,
      padding: 12,
      marginTop: 5,
      marginBottom: 12,
      gap: 8,
    },

    generalError: {
      flex: 1,
      color: '#D93025',
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },

    successBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#EAF6EC',
      borderRadius: 12,
      padding: 12,
      marginTop: 5,
      marginBottom: 12,
      gap: 8,
    },

    successText: {
      flex: 1,
      color: '#2E7D32',
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },

    resetButton: {
      marginTop: 12,
      backgroundColor: '#D4AF37',
      paddingVertical: 14,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      minHeight: 50,
    },

    resetButtonDisabled: {
      opacity: 0.7,
    },

    resetText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },

    loginSection: {
      marginTop: 25,
      alignItems: 'center',
    },

    loginQuestion: {
      fontSize: 13,
      color: '#888888',
      marginBottom: 8,
    },

    loginButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 22,
      paddingVertical: 11,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    loginText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },

  });