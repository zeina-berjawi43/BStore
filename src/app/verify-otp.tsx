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

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useEffect,
  useState,
} from 'react';

import {
  verifyLoginOTP,
  requestLoginOTP,
} from '../services/authService';

export default function VerifyOTP() {

  const params =
    useLocalSearchParams<{
      phone?: string;
      mode?: string;
    }>();

  const phone =
    typeof params.phone === 'string'
      ? params.phone
      : '';

  const mode =
    typeof params.mode === 'string'
      ? params.mode
      : 'login';

  const [otp, setOtp] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [seconds, setSeconds] =
    useState(0);

  // =========================================================
  // COUNTDOWN
  // =========================================================

  useEffect(() => {

    if (seconds <= 0) {
      return;
    }

    const timer =
      setInterval(() => {

        setSeconds(
          current =>
            current > 0
              ? current - 1
              : 0
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, [seconds]);

  // =========================================================
  // VERIFY
  // =========================================================

  const handleVerify =
    async () => {

      setError('');

      const cleanOTP =
        otp.trim();

      if (!cleanOTP) {

        setError(
          'Please enter the verification code.'
        );

        return;
      }

      if (
        !/^\d{6}$/.test(
          cleanOTP
        )
      ) {

        setError(
          'Verification code must contain 6 digits.'
        );

        return;
      }

      if (!phone) {

        setError(
          'Phone number is missing.'
        );

        return;
      }

      try {

        setLoading(true);

        const data =
          await verifyLoginOTP(
            phone,
            cleanOTP
          );

        console.log(
          'OTP VERIFIED:',
          data.user
        );

        // ===================================================
        // NO PUSH TOKEN FOR CUSTOMER
        // ===================================================

        router.replace('/');

      } catch (error: any) {

        console.log(
          'VERIFY OTP ERROR:',
          error
        );

        setError(
          error?.message ||
            'Incorrect verification code.'
        );

      } finally {

        setLoading(false);
      }
    };

  // =========================================================
  // RESEND
  // =========================================================

  const handleResend =
    async () => {

      if (
        resending ||
        seconds > 0
      ) {
        return;
      }

      if (!phone) {

        setError(
          'Phone number is missing.'
        );

        return;
      }

      try {

        setError('');
        setResending(true);

        await requestLoginOTP(
          phone
        );

        setOtp('');
        setSeconds(30);

      } catch (error: any) {

        console.log(
          'RESEND OTP ERROR:',
          error
        );

        setError(
          error?.message ||
            'Unable to resend verification code.'
        );

      } finally {

        setResending(false);
      }
    };

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =====================================================
            HEADER
        ===================================================== */}

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
              Enter the verification code
            </Text>

          </View>

        </View>

        {/* =====================================================
            VERIFICATION CARD
        ===================================================== */}

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
            Enter the 6-digit code sent for
            verification of:
          </Text>

          <View style={styles.phoneBox}>

            <Ionicons
              name="call-outline"
              size={16}
              color="#E35B3F"
            />

            <Text style={styles.phone}>
              {phone}
            </Text>

          </View>

          {/* ===================================================
              OTP INPUT
          =================================================== */}

          <TextInput
            value={otp}
            onChangeText={(text) => {

              const onlyNumbers =
                text.replace(
                  /[^0-9]/g,
                  ''
                );

              setOtp(
                onlyNumbers.slice(
                  0,
                  6
                )
              );

              if (error) {
                setError('');
              }

            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#B8AFA5"
            editable={!loading}
            textAlign="center"
            style={[
              styles.otpInput,
              error &&
                styles.otpInputError,
            ]}
          />

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

          {/* ===================================================
              VERIFY BUTTON
          =================================================== */}

          <Pressable
            style={[
              styles.verifyButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={
              handleVerify
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

          {/* ===================================================
              RESEND
          =================================================== */}

          <Pressable
            style={styles.resendButton}
            onPress={
              handleResend
            }
            disabled={
              resending ||
              seconds > 0 ||
              loading
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
                    seconds > 0 &&
                      styles.resendDisabled,
                  ]}
                >
                  {seconds > 0
                    ? `Resend code in ${seconds}s`
                    : 'Resend Code'}
                </Text>

              </View>

            )}

          </Pressable>

          {/* ===================================================
              NOTE
          =================================================== */}

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

const styles =
  StyleSheet.create({

    // =========================================================
    // PAGE
    // =========================================================

    container: {
      flex: 1,
      paddingTop:20,
      backgroundColor:
        '#F7F3EC',
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 45,
    },

    // =========================================================
    // HEADER
    // =========================================================

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
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
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 12,

      shadowColor:
        '#171717',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },

    headerText: {
      flex: 1,
    },

    smallTitle: {
      fontSize: 12,
      fontWeight: '700',
      color:
        '#817B71',
      marginBottom: 2,
      letterSpacing: 0.2,
    },

    title: {
      fontSize: 29,
      fontWeight: '900',
      color:
        '#171717',
      letterSpacing: -0.8,
      lineHeight: 34,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: '500',
      color:
        '#817B71',
    },

    // =========================================================
    // CARD
    // =========================================================

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 21,
      borderWidth: 1,
      borderColor:
        '#E7DED1',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 22,
      alignItems:
        'center',

      shadowColor:
        '#171717',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },

    // =========================================================
    // ICON
    // =========================================================

    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor:
        '#FFF7F3',
      borderWidth: 1,
      borderColor:
        '#F0CFC4',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 15,
    },

    cardTitle: {
      fontSize: 21,
      fontWeight: '900',
      color:
        '#171717',
      letterSpacing: -0.3,
    },

    description: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color:
        '#817B71',
      textAlign:
        'center',
      maxWidth: 280,
    },

    // =========================================================
    // PHONE
    // =========================================================

    phoneBox: {
      marginTop: 10,
      minHeight: 38,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor:
        '#FFF7F3',
      borderWidth: 1,
      borderColor:
        '#F0CFC4',
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
    },

    phone: {
      fontSize: 15,
      fontWeight: '800',
      color:
        '#24221E',
    },

    // =========================================================
    // OTP INPUT
    // =========================================================

    otpInput: {
      width: '100%',
      height: 58,
      marginTop: 20,
      backgroundColor:
        '#FFF7F3',
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#F0CFC4',
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: 8,
      color:
        '#171717',
      paddingLeft: 8,
    },

    otpInputError: {
      borderColor:
        '#C94C4C',
      backgroundColor:
        '#FFF4F2',
    },

    // =========================================================
    // ERROR
    // =========================================================

    errorBox: {
      width: '100%',
      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor:
        '#FFF1F1',
      borderWidth: 1,
      borderColor:
        '#F0CCCC',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
    },

    errorText: {
      flexShrink: 1,
      color:
        '#C94C4C',
      fontSize: 12,
      fontWeight: '600',
      textAlign:
        'center',
    },

    // =========================================================
    // VERIFY BUTTON
    // =========================================================

    verifyButton: {
      width: '100%',
      minHeight: 54,
      marginTop: 17,
      backgroundColor:
        '#E35B3F',
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,

      shadowColor:
        '#E35B3F',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.20,
      shadowRadius: 8,
      elevation: 3,
    },

    disabledButton: {
      opacity: 0.65,
    },

    verifyText: {
      color:
        '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    // =========================================================
    // RESEND
    // =========================================================

    resendButton: {
      marginTop: 17,
      paddingVertical: 7,
      minHeight: 34,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    resendContent: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 6,
    },

    resendText: {
      color:
        '#E35B3F',
      fontSize: 14,
      fontWeight: '800',
    },

    resendDisabled: {
      color:
        '#AFA79E',
    },

    // =========================================================
    // NOTE
    // =========================================================

    noteBox: {
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor:
        '#F8F2EA',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
    },

    note: {
      fontSize: 11,
      color:
        '#817B71',
      textAlign:
        'center',
      fontWeight: '500',
    },

  });

