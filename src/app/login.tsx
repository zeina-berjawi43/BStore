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
              size={22}
              color="#171717"
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
            placeholderTextColor="#9A9186"
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

            <View style={styles.infoIcon}>

              <Ionicons
                name="chatbubble-ellipses-outline"
                size={19}
                color="#E35B3F"
              />

            </View>

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

const styles =
  StyleSheet.create({

    /* =====================================================
       MAIN
    ===================================================== */

    container: {
      flex: 1,

      backgroundColor:
        '#F7F3EC',

      paddingTop: 18,
    },

    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 8,

      paddingBottom: 35,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 20,
    },

    backButton: {
      width: 46,
      height: 46,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems: 'center',

      justifyContent: 'center',

      marginRight: 12,

      shadowColor:
        '#171717',

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

      color:
        '#171717',

      letterSpacing: -0.8,
    },

    subtitle: {
      marginTop: 4,

      fontSize: 13,

      color:
        '#817B71',

      lineHeight: 18,

      fontWeight: '500',
    },


    /* =====================================================
       CARD
    ===================================================== */

    card: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      padding: 19,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.08,

      shadowRadius: 11,

      elevation: 3,
    },


    /* =====================================================
       FORM
    ===================================================== */

    label: {
      marginBottom: 8,

      marginTop: 1,

      fontSize: 14,

      fontWeight: '800',

      color:
        '#24221E',
    },

    input: {
      height: 54,

      backgroundColor:
        '#F8F2EA',

      borderRadius: 15,

      paddingHorizontal: 16,

      fontSize: 15,

      borderWidth: 1,

      borderColor:
        '#E6DED2',

      marginBottom: 7,

      color:
        '#171717',

      fontWeight: '500',
    },

    inputError: {
      borderColor:
        '#D93025',

      backgroundColor:
        '#FFF7F3',
    },

    errorText: {
      color:
        '#D93025',

      fontSize: 12,

      marginBottom: 13,

      marginLeft: 4,

      fontWeight: '600',
    },

    generalError: {
      color:
        '#D93025',

      fontSize: 12,

      marginTop: 10,

      marginBottom: 10,

      marginLeft: 4,

      fontWeight: '600',
    },


    /* =====================================================
       INFO BOX
    ===================================================== */

    infoBox: {
      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        '#FFF7F3',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      paddingVertical: 11,

      paddingHorizontal: 12,

      marginTop: 9,

      gap: 10,
    },

    infoIcon: {
      width: 34,

      height: 34,

      borderRadius: 11,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      alignItems: 'center',

      justifyContent: 'center',
    },

    infoText: {
      flex: 1,

      fontSize: 12,

      lineHeight: 18,

      color:
        '#777168',

      fontWeight: '500',
    },


    /* =====================================================
       LOGIN BUTTON
    ===================================================== */

    loginButton: {
      marginTop: 20,

      backgroundColor:
        '#E35B3F',

      minHeight: 53,

      borderRadius: 16,

      alignItems: 'center',

      justifyContent: 'center',

      flexDirection: 'row',

      gap: 8,

      shadowColor:
        '#E35B3F',

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
      color:
        '#FFFFFF',

      fontSize: 15,

      fontWeight: '900',

      letterSpacing: 0.1,
    },


    /* =====================================================
       REGISTER
    ===================================================== */

    registerSection: {
      marginTop: 24,

      alignItems: 'center',
    },

    registerQuestion: {
      fontSize: 13,

      color:
        '#817B71',

      marginBottom: 9,

      fontWeight: '500',
    },

    registerButton: {
      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      borderRadius: 16,

      paddingVertical: 12,

      paddingHorizontal: 20,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.06,

      shadowRadius: 7,

      elevation: 2,
    },

    registerText: {
      color:
        '#171717',

      fontSize: 14,

      fontWeight: '800',
    },

  });