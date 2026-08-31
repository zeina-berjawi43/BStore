
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
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useState,
} from 'react';

import {
  registerUser,
} from '../services/authService';

export default function Register() {

  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =========================================================
  // REGISTER
  // =========================================================

  const handleRegister =
    async () => {

      setError('');

      const cleanFirstName =
        firstName.trim();

      const cleanLastName =
        lastName.trim();

      const cleanPhone =
        phone.trim();

      const cleanAddress =
        address.trim();

      if (!cleanFirstName) {

        setError(
          'Please enter your first name.'
        );

        return;
      }

      if (!cleanLastName) {

        setError(
          'Please enter your last name.'
        );

        return;
      }

      if (!cleanPhone) {

        setError(
          'Please enter your phone number.'
        );

        return;
      }

      const phoneRegex =
        /^[0-9+\-\s()]{7,20}$/;

      if (
        !phoneRegex.test(
          cleanPhone
        )
      ) {

        setError(
          'Please enter a valid phone number.'
        );

        return;
      }

      if (!cleanAddress) {

        setError(
          'Please enter your address.'
        );

        return;
      }

      try {

        setLoading(true);

        await registerUser({

          firstName:
            cleanFirstName,

          lastName:
            cleanLastName,

          phone:
            cleanPhone,

          address:
            cleanAddress,
        });

        router.push({

          pathname:
            '/verify-otp',

          params: {

            phone:
              cleanPhone,

            mode:
              'register',
          },

        });

      } catch (error: any) {

        console.log(
          'REGISTER ERROR:',
          error
        );

        setError(
          error?.message ||
            'Registration failed. Please try again.'
        );

      } finally {

        setLoading(false);
      }
    };

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
              Create Account
            </Text>

            <Text
              style={styles.subtitle}
            >
              Enter your information
            </Text>

          </View>

        </View>

        {/* CARD */}

        <View style={styles.card}>

          {/* FIRST NAME */}

          <Text style={styles.label}>
            First Name
          </Text>

          <TextInput
            placeholder="First Name"
            placeholderTextColor="#888888"
            value={firstName}
            onChangeText={(text) => {

              setFirstName(text);

              if (error) {
                setError('');
              }

            }}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

          {/* LAST NAME */}

          <Text style={styles.label}>
            Last Name
          </Text>

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#888888"
            value={lastName}
            onChangeText={(text) => {

              setLastName(text);

              if (error) {
                setError('');
              }

            }}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

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

              if (error) {
                setError('');
              }

            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

          {/* ADDRESS */}

          <Text style={styles.label}>
            Address
          </Text>

          <TextInput
            placeholder="Address"
            placeholderTextColor="#888888"
            value={address}
            onChangeText={(text) => {

              setAddress(text);

              if (error) {
                setError('');
              }

            }}
            multiline
            textAlignVertical="top"
            editable={!loading}
            style={[
              styles.input,
              styles.addressInput,
            ]}
          />

          {error ? (

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

          ) : null}

          {/* INFO */}

          <View
            style={styles.infoBox}
          >

            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color="#D4AF37"
            />

            <Text
              style={styles.infoText}
            >
              After registration, your phone
              number will need to be verified.
            </Text>

          </View>

          {/* REGISTER */}

          <Pressable
            style={[
              styles.registerButton,
              loading &&
                styles.disabledButton,
            ]}
            onPress={
              handleRegister
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
                <Text
                  style={
                    styles.registerButtonText
                  }
                >
                  Create Account
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

        {/* LOGIN */}

        <View
          style={
            styles.loginSection
          }
        >

          <Text
            style={
              styles.loginQuestion
            }
          >
            Already have an account?
          </Text>

          <Pressable
            style={
              styles.loginButton
            }
            onPress={() =>
              router.push(
                '/login'
              )
            }
            disabled={loading}
          >

            <Text
              style={
                styles.loginText
              }
            >
              Login
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
      marginTop: 3,
      fontSize: 14,
      fontWeight: '700',
      color: '#1A1A1A',
    },

    input: {
      minHeight: 52,
      backgroundColor:
        '#F7F7F7',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 15,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      marginBottom: 13,
      color: '#000000',
    },

    addressInput: {
      height: 90,
      textAlignVertical:
        'top',
    },

    errorText: {
      color:
        '#D93025',
      fontSize: 12,
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
      gap: 9,
    },

    infoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color:
        '#555555',
    },

    registerButton: {
      marginTop: 18,
      backgroundColor:
        '#D4AF37',
      minHeight: 50,
      borderRadius: 25,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      gap: 8,
    },

    disabledButton: {
      opacity: 0.7,
    },

    registerButtonText: {
      color:
        '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    loginSection: {
      marginTop: 25,
      alignItems:
        'center',
    },

    loginQuestion: {
      fontSize: 13,
      color:
        '#888888',
      marginBottom: 8,
    },

    loginButton: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      borderRadius: 22,
      paddingVertical: 11,
      paddingHorizontal: 28,
    },

    loginText: {
      color:
        '#000000',
      fontSize: 14,
      fontWeight: '700',
    },

  });