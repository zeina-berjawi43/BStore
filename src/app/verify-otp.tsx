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
              Verify Phone
            </Text>

            <Text style={styles.subtitle}>
              Enter the verification code
            </Text>

          </View>

        </View>

        <View style={styles.card}>

          <View style={styles.iconCircle}>

            <Ionicons
              name="phone-portrait-outline"
              size={30}
              color="#D4AF37"
            />

          </View>

          <Text style={styles.cardTitle}>
            Verification Code
          </Text>

          <Text style={styles.description}>
            Enter the 6-digit code sent for
            verification of:
          </Text>

          <Text style={styles.phone}>
            {phone}
          </Text>

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
            placeholderTextColor="#BBBBBB"
            editable={!loading}
            textAlign="center"
            style={[
              styles.otpInput,
              error &&
                styles.otpInputError,
            ]}
          />

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

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
                color="#D4AF37"
              />

            ) : (

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

            )}

          </Pressable>

          <Text style={styles.note}>
            The verification code expires after
            90 minutes.
          </Text>

        </View>

      </ScrollView>

    </View>
  );
}

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
      flexDirection:
        'row',
      alignItems:
        'center',
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
      alignItems:
        'center',
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
      color:
        '#000000',
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color:
        '#888888',
    },

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      padding: 20,
      alignItems:
        'center',
    },

    iconCircle: {
      width: 65,
      height: 65,
      borderRadius: 33,
      backgroundColor:
        '#FFFBEF',
      borderWidth: 1,
      borderColor:
        '#E8D89B',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 15,
    },

    cardTitle: {
      fontSize: 21,
      fontWeight: '800',
      color:
        '#000000',
    },

    description: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color:
        '#888888',
      textAlign:
        'center',
    },

    phone: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '700',
      color:
        '#1A1A1A',
    },

    otpInput: {
      width: '100%',
      height: 58,
      marginTop: 22,
      backgroundColor:
        '#F7F7F7',
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 8,
      color:
        '#000000',
    },

    otpInputError: {
      borderColor:
        '#D93025',
    },

    errorText: {
      width: '100%',
      color:
        '#D93025',
      fontSize: 12,
      marginTop: 8,
      textAlign:
        'center',
      fontWeight: '500',
    },

    verifyButton: {
      width: '100%',
      minHeight: 50,
      marginTop: 18,
      backgroundColor:
        '#D4AF37',
      borderRadius: 25,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
    },

    disabledButton: {
      opacity: 0.7,
    },

    verifyText: {
      color:
        '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    resendButton: {
      marginTop: 18,
      paddingVertical: 7,
    },

    resendText: {
      color:
        '#D4AF37',
      fontSize: 14,
      fontWeight: '700',
    },

    resendDisabled: {
      color:
        '#AAAAAA',
    },

    note: {
      marginTop: 12,
      fontSize: 11,
      color:
        '#999999',
      textAlign:
        'center',
    },

  });