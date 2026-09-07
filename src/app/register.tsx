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

        {/* =====================================================
            HEADER
        ===================================================== */}

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
              Create Account
            </Text>

            <Text
              style={styles.subtitle}
            >
              Enter your information
            </Text>

          </View>

        </View>

        {/* =====================================================
            FORM CARD
        ===================================================== */}

        <View style={styles.card}>

          {/* FIRST NAME */}

          <Text style={styles.label}>
            First Name
          </Text>

          <TextInput
            placeholder="First Name"
            placeholderTextColor="#9A9186"
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
            style={[
              styles.input,
              error &&
                styles.inputError,
            ]}
          />

          {/* LAST NAME */}

          <Text style={styles.label}>
            Last Name
          </Text>

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#9A9186"
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
            style={[
              styles.input,
              error &&
                styles.inputError,
            ]}
          />

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

              if (error) {
                setError('');
              }

            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={[
              styles.input,
              error &&
                styles.inputError,
            ]}
          />

          {/* ADDRESS */}

          <Text style={styles.label}>
            Address
          </Text>

          <TextInput
            placeholder="Address"
            placeholderTextColor="#9A9186"
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
              error &&
                styles.inputError,
            ]}
          />

          {/* ERROR */}

          {error ? (

            <View
              style={
                styles.errorBox
              }
            >

              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#D93025"
              />

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

            </View>

          ) : null}

          {/* INFO */}

          <View
            style={styles.infoBox}
          >

            <View
              style={
                styles.infoIcon
              }
            >

              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#E35B3F"
              />

            </View>

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

        {/* =====================================================
            LOGIN
        ===================================================== */}

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

    // =======================================================
    // MAIN
    // =======================================================

    container: {
      flex: 1,

      backgroundColor:
        '#F7F3EC',

      paddingTop: 18,
    },

    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 8,

      paddingBottom: 40,
    },


    // =======================================================
    // HEADER
    // =======================================================

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

      marginRight: 13,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.08,

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
      marginTop: 5,

      fontSize: 13,

      color:
        '#817B71',

      lineHeight: 18,
    },


    // =======================================================
    // FORM CARD
    // =======================================================

    card: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      padding: 18,

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


    // =======================================================
    // FORM
    // =======================================================

    label: {
      marginBottom: 7,

      marginTop: 3,

      fontSize: 14,

      fontWeight: '800',

      color:
        '#24221E',
    },

    input: {
      minHeight: 52,

      backgroundColor:
        '#F8F2EA',

      borderRadius: 15,

      paddingHorizontal: 16,

      paddingVertical: 13,

      fontSize: 15,

      fontWeight: '600',

      borderWidth: 1,

      borderColor:
        '#E6DED2',

      marginBottom: 13,

      color:
        '#171717',
    },

    inputError: {
      borderColor:
        '#D93025',

      backgroundColor:
        '#FFF7F3',
    },

    addressInput: {
      height: 88,

      textAlignVertical:
        'top',
    },


    // =======================================================
    // ERROR
    // =======================================================

    errorBox: {
      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        '#FFF7F3',

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      paddingHorizontal: 12,

      paddingVertical: 10,

      marginBottom: 12,

      gap: 8,
    },

    errorText: {
      flex: 1,

      color:
        '#D93025',

      fontSize: 12,

      lineHeight: 17,

      fontWeight: '600',
    },


    // =======================================================
    // INFO
    // =======================================================

    infoBox: {
      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        '#FFF7F3',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      padding: 12,

      gap: 9,
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


    // =======================================================
    // CREATE ACCOUNT BUTTON
    // =======================================================

    registerButton: {
      marginTop: 18,

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

      shadowRadius: 7,

      elevation: 3,
    },

    disabledButton: {
      opacity: 0.6,

      shadowOpacity: 0,

      elevation: 0,
    },

    registerButtonText: {
      color:
        '#FFFFFF',

      fontSize: 15,

      fontWeight: '900',
    },


    // =======================================================
    // LOGIN SECTION
    // =======================================================

    loginSection: {
      marginTop: 20,

      alignItems: 'center',
    },

    loginQuestion: {
      fontSize: 13,

      color:
        '#817B71',

      marginBottom: 8,
    },

    loginButton: {
      minHeight: 50,

      paddingHorizontal: 24,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems: 'center',

      justifyContent: 'center',

      flexDirection: 'row',

      gap: 8,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.07,

      shadowRadius: 8,

      elevation: 2,
    },

    loginText: {
      color:
        '#171717',

      fontSize: 14,

      fontWeight: '900',
    },

  });