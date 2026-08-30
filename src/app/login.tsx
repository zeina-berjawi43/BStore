
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
  login,
  saveExpoPushToken,
} from '../services/authService';

import {
  registerForPushNotificationsAsync,
} from '../../utils/notifications';

export default function Login() {

  const [phone, setPhone] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [phoneError, setPhoneError] =
    useState('');

  const [passwordError, setPasswordError] =
    useState('');

  const [generalError, setGeneralError] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {

    setPhoneError('');
    setPasswordError('');
    setGeneralError('');

    const cleanPhone =
      phone.trim();

    const cleanPassword =
      password.trim();


    // ===================================================
    // PHONE EMPTY
    // ===================================================

    if (!cleanPhone) {

      setPhoneError(
        'Please enter your phone number.'
      );

      return;
    }


    // ===================================================
    // PHONE FORMAT
    // ===================================================

    const phoneRegex =
      /^[0-9+\-\s()]{7,20}$/;

    if (!phoneRegex.test(cleanPhone)) {

      setPhoneError(
        'Please enter a valid phone number.'
      );

      return;
    }


    // ===================================================
    // PASSWORD EMPTY
    // ===================================================

    if (!cleanPassword) {

      setPasswordError(
        'Please enter your password.'
      );

      return;
    }


    // ===================================================
    // START LOGIN
    // ===================================================

    try {

      setLoading(true);

      const data =
        await login(
          cleanPhone,
          cleanPassword
        );


      console.log(
        'LOGIN USER:',
        data.user
      );

      console.log(
        'LOGIN COMPLETED SUCCESSFULLY'
      );


      // =================================================
      // REGISTER PUSH NOTIFICATIONS
      // =================================================

      try {

        const expoPushToken =
          await registerForPushNotificationsAsync();

        if (expoPushToken) {

          await saveExpoPushToken(
            expoPushToken
          );

        }

      } catch (notificationError) {

        console.log(
          'NOTIFICATION SETUP ERROR:',
          notificationError
        );

      }


      // =================================================
      // GO HOME
      // =================================================

      router.replace('/');

    } catch (error: any) {

      console.log(
        'LOGIN ERROR:',
        error
      );


      if (
        error?.message ===
        'Invalid phone number or password'
      ) {

        setPasswordError(
          'Incorrect phone number or password.'
        );

      } else {

        setGeneralError(
          error?.message ||
          'Cannot connect to the server. Please try again.'
        );

      }

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // UI
  // =====================================================

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
              router.back()
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
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Login to your account
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
            placeholderTextColor="#888888"
            value={phone}
            onChangeText={(text) => {

              setPhone(text);

              if (phoneError) {
                setPhoneError('');
              }

              if (generalError) {
                setGeneralError('');
              }

            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={[
              styles.input,
              phoneError
                ? styles.inputError
                : null,
            ]}
          />

          {phoneError ? (

            <Text style={styles.errorText}>
              {phoneError}
            </Text>

          ) : null}


          {/* PASSWORD */}

          <Text style={styles.label}>
            Password
          </Text>


          <View style={styles.passwordWrapper}>

            <TextInput
              placeholder="Password"
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


          {/* =================================================
              FORGOT PASSWORD
          ================================================= */}

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


          {/* GENERAL ERROR */}

          {generalError ? (

            <Text style={styles.generalError}>
              {generalError}
            </Text>

          ) : null}


          {/* LOGIN BUTTON */}

          <Pressable
            style={[
              styles.loginButton,
              loading
                ? styles.loginButtonDisabled
                : null,
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


        {/* CREATE ACCOUNT */}

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
              color="#D4AF37"
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
      padding: 18,
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

    errorText: {
      color: '#D93025',
      fontSize: 12,
      marginBottom: 14,
      marginLeft: 4,
      fontWeight: '500',
    },

    generalError: {
      color: '#D93025',
      fontSize: 12,
      marginTop: 4,
      marginBottom: 10,
      marginLeft: 4,
      fontWeight: '500',
    },

    passwordWrapper: {
      position: 'relative',
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

    /* =====================================================
       FORGOT PASSWORD
    ===================================================== */

    forgotButton: {
      alignSelf: 'flex-end',
      marginTop: 1,
      marginBottom: 4,
      paddingVertical: 4,
    },

    forgotText: {
      color: '#D4AF37',
      fontSize: 13,
      fontWeight: '700',
    },

    loginButton: {
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

    loginButtonDisabled: {
      opacity: 0.7,
    },

    loginText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },

    registerSection: {
      marginTop: 25,
      alignItems: 'center',
    },

    registerQuestion: {
      fontSize: 13,
      color: '#888888',
      marginBottom: 8,
    },

    registerButton: {
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

    registerText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },

  });
