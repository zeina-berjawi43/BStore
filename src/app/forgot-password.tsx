
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

// =========================================================
// BACKEND URL
// =========================================================

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';

// =========================================================
// COMPONENT
// =========================================================

export default function ForgotPassword() {
  const [email, setEmail] =
    useState('');

  const [emailError, setEmailError] =
    useState('');

  const [generalError, setGeneralError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =======================================================
  // SEND RESET EMAIL
  // =======================================================

  const handleForgotPassword =
    async () => {

      setEmailError('');
      setGeneralError('');
      setSuccessMessage('');

      const cleanEmail =
        email.trim().toLowerCase();

      // ===================================================
      // EMAIL EMPTY
      // ===================================================

      if (!cleanEmail) {
        setEmailError(
          'Please enter your email address.'
        );

        return;
      }

      // ===================================================
      // EMAIL FORMAT
      // ===================================================

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        setEmailError(
          'Please enter a valid email address.'
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
            `${API_URL}/auth/forgot-password`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },

              body: JSON.stringify({
                email: cleanEmail,
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
          'FORGOT PASSWORD RESPONSE:',
          data
        );

        // =================================================
        // BACKEND ERROR
        // =================================================

        if (!response.ok) {
          setGeneralError(
            data.message ||
              'Could not send password reset email.'
          );

          return;
        }

        // =================================================
        // SUCCESS
        // =================================================

        setSuccessMessage(
          data.message ||
            'If an account exists with this email, a password reset link has been sent.'
        );

        setEmail('');

      } catch (error) {

        console.log(
          'FORGOT PASSWORD ERROR:',
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
              Forgot Password
            </Text>

            <Text style={styles.subtitle}>
              Reset your BStore account password
            </Text>

          </View>

        </View>


        {/* CARD */}

        <View style={styles.card}>

          {/* ICON */}

          <View style={styles.iconContainer}>

            <Ionicons
              name="lock-open-outline"
              size={30}
              color="#D4AF37"
            />

          </View>


          <Text style={styles.cardTitle}>
            Reset Your Password
          </Text>


          <Text style={styles.description}>
            Enter the email address associated
            with your account and we'll send you
            a password reset link.
          </Text>


          {/* EMAIL */}

          <Text style={styles.label}>
            Email Address
          </Text>


          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={(text) => {

              setEmail(text);

              if (emailError) {
                setEmailError('');
              }

              if (generalError) {
                setGeneralError('');
              }

              if (successMessage) {
                setSuccessMessage('');
              }

            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={[
              styles.input,
              emailError
                ? styles.inputError
                : null,
            ]}
          />


          {/* EMAIL ERROR */}

          {emailError ? (

            <Text style={styles.errorText}>
              {emailError}
            </Text>

          ) : null}


          {/* GENERAL ERROR */}

          {generalError ? (

            <Text style={styles.generalError}>
              {generalError}
            </Text>

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


          {/* SEND BUTTON */}

          <Pressable
            style={[
              styles.sendButton,
              loading &&
                styles.sendButtonDisabled,
            ]}
            onPress={
              handleForgotPassword
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
                <Text style={styles.sendText}>
                  Send Reset Link
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

    sendButton: {
      marginTop: 10,
      backgroundColor: '#D4AF37',
      paddingVertical: 14,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      minHeight: 50,
    },

    sendButtonDisabled: {
      opacity: 0.7,
    },

    sendText: {
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
