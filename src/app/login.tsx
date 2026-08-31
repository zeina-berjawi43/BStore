
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
  requestLoginOTP,
} from '../services/authService';

export default function Login() {

  const [phone, setPhone] =
    useState('');

  const [phoneError, setPhoneError] =
    useState('');

  const [generalError, setGeneralError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async () => {

    setPhoneError('');
    setGeneralError('');

    const cleanPhone =
      phone.trim();

    // =======================================================
    // EMPTY
    // =======================================================

    if (!cleanPhone) {

      setPhoneError(
        'Please enter your phone number.'
      );

      return;
    }

    // =======================================================
    // FORMAT
    // =======================================================

    const phoneRegex =
      /^[0-9+\-\s()]{7,20}$/;

    if (
      !phoneRegex.test(
        cleanPhone
      )
    ) {

      setPhoneError(
        'Please enter a valid phone number.'
      );

      return;
    }

    // =======================================================
    // REQUEST OTP
    // =======================================================

    try {

      setLoading(true);

      await requestLoginOTP(
        cleanPhone
      );

      // Save phone temporarily
      // for verify-otp page.

      router.push({
        pathname:
          '/verify-otp',

        params: {
          phone:
            cleanPhone,

          mode:
            'login',
        },
      });

    } catch (error: any) {

      console.log(
        'REQUEST LOGIN OTP ERROR:',
        error
      );

      setGeneralError(
        error?.message ||
          'Cannot connect to the server. Please try again.'
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
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <Pressable
            style={
              styles.backButton
            }
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

          <View
            style={
              styles.headerText
            }
          >

            <Text
              style={styles.title}
            >
              Welcome Back
            </Text>

            <Text
              style={styles.subtitle}
            >
              Login with your phone number
            </Text>

          </View>

        </View>

        {/* CARD */}

        <View style={styles.card}>

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

            <Text
              style={
                styles.errorText
              }
            >
              {phoneError}
            </Text>

          ) : null}

          <View
            style={
              styles.infoBox
            }
          >

            <Ionicons
              name="chatbubble-ellipses-outline"
              size={21}
              color="#D4AF37"
            />

            <Text
              style={
                styles.infoText
              }
            >
              A verification code will be
              sent to your phone.
            </Text>

          </View>

          {generalError ? (

            <Text
              style={
                styles.generalError
              }
            >
              {generalError}
            </Text>

          ) : null}

          {/* LOGIN */}

          <Pressable
            style={[
              styles.loginButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={
              handleLogin
            }
            disabled={
              loading
            }
          >

            {loading ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <>
                <Text
                  style={
                    styles.loginText
                  }
                >
                  Continue
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

        <View
          style={
            styles.registerSection
          }
        >

          <Text
            style={
              styles.registerQuestion
            }
          >
            Don't have an account?
          </Text>

          <Pressable
            style={
              styles.registerButton
            }
            onPress={() =>
              router.push(
                '/register'
              )
            }
            disabled={loading}
          >

            <Text
              style={
                styles.registerText
              }
            >
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
      backgroundColor:
        '#F7F7F7',
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
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      alignItems: 'center',
      justifyContent:
        'center',
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
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
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
      backgroundColor:
        '#F7F7F7',
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      marginBottom: 7,
      color: '#000000',
    },

    inputError: {
      borderColor:
        '#D93025',
    },

    errorText: {
      color:
        '#D93025',
      fontSize: 12,
      marginBottom: 14,
      marginLeft: 4,
      fontWeight: '500',
    },

    generalError: {
      color:
        '#D93025',
      fontSize: 12,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 4,
      fontWeight: '500',
    },

    infoBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#FFFBEF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#E8D89B',
      padding: 12,
      marginTop: 8,
      gap: 9,
    },

    infoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color:
        '#555555',
    },

    loginButton: {
      marginTop: 18,
      backgroundColor:
        '#D4AF37',
      paddingVertical: 14,
      borderRadius: 25,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      gap: 8,
      minHeight: 50,
    },

    disabledButton: {
      opacity: 0.7,
    },

    loginText: {
      color:
        '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },

    registerSection: {
      marginTop: 25,
      alignItems:
        'center',
    },

    registerQuestion: {
      fontSize: 13,
      color:
        '#888888',
      marginBottom: 8,
    },

    registerButton: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      borderRadius: 22,
      paddingVertical: 11,
      paddingHorizontal: 18,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
    },

    registerText: {
      color:
        '#000000',
      fontSize: 14,
      fontWeight: '700',
    },

  });