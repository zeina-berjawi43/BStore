import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import { router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { useState } from 'react';

import {
  register,
} from '../services/authService';

// =========================================================
// REGISTER
// =========================================================

export default function Register() {
  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] =
    useState({
      name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      confirmPassword: '',
    });

  const [isRegistering, setIsRegistering] =
    useState(false);

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async () => {
    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPhone =
      phone.trim();

    const cleanAddress =
      address.trim();

    const newErrors = {
      name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      confirmPassword: '',
    };

    // ===================================================
    // NAME
    // ===================================================

    if (!cleanName) {
      newErrors.name =
        'Full name is required.';
    } else if (
      cleanName.length < 3
    ) {
      newErrors.name =
        'Please enter your full name.';
    }

    // ===================================================
    // EMAIL — OPTIONAL
    // ===================================================

    if (cleanEmail) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          cleanEmail
        )
      ) {
        newErrors.email =
          'Please enter a valid email address.';
      }
    }

    // ===================================================
    // PHONE
    // ===================================================

    if (!cleanPhone) {
      newErrors.phone =
        'Phone number is required.';
    } else {
      const phoneRegex =
        /^[0-9+\-\s()]{7,20}$/;

      if (
        !phoneRegex.test(
          cleanPhone
        )
      ) {
        newErrors.phone =
          'Please enter a valid phone number.';
      }
    }

    // ===================================================
    // ADDRESS
    // ===================================================

    if (!cleanAddress) {
      newErrors.address =
        'Address is required.';
    }

    // ===================================================
    // PASSWORD
    // ===================================================

    if (!password) {
      newErrors.password =
        'Password is required.';
    } else if (
      password.length < 6
    ) {
      newErrors.password =
        'Password must be at least 6 characters.';
    }

    // ===================================================
    // CONFIRM PASSWORD
    // ===================================================

    if (!confirmPassword) {
      newErrors.confirmPassword =
        'Please confirm your password.';
    } else if (
      password !== confirmPassword
    ) {
      newErrors.confirmPassword =
        'Passwords do not match.';
    }

    // ===================================================
    // SET ERRORS
    // ===================================================

    setErrors(newErrors);

    // ===================================================
    // STOP IF INVALID
    // ===================================================

    if (
      Object.values(newErrors).some(
        error =>
          error !== ''
      )
    ) {
      return;
    }

    // ===================================================
    // PREVENT DOUBLE REGISTER
    // ===================================================

    if (isRegistering) {
      return;
    }

    setIsRegistering(true);

    // ===================================================
    // SEND TO BACKEND
    // ===================================================

    try {
      const data =
        await register(
          cleanName,
          cleanPhone,
          password,
          cleanAddress,
          cleanEmail || undefined
        );

      console.log(
        'REGISTER SUCCESS:',
        data
      );

      // =================================================
      // CLEAR FORM
      // =================================================

      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setPassword('');
      setConfirmPassword('');

      setShowPassword(false);
      setShowConfirmPassword(false);

      setErrors({
        name: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: '',
      });

      console.log(
        'AUTO LOGIN COMPLETED'
      );

      // =================================================
      // GO HOME
      // =================================================

      router.replace('/');

    } catch (error: any) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      // =================================================
      // PHONE ALREADY EXISTS
      // =================================================

      if (
        error?.message ===
        'Phone number already exists'
      ) {
        setErrors({
          ...newErrors,

          phone:
            'An account with this phone number already exists.',
        });

        return;
      }

      // =================================================
      // EMAIL ALREADY EXISTS
      // =================================================

      if (
        error?.message ===
        'Email already exists'
      ) {
        setErrors({
          ...newErrors,

          email:
            'An account with this email already exists.',
        });

        return;
      }

      // =================================================
      // OTHER ERROR
      // =================================================

      Alert.alert(
        'Registration Error',
        error?.message ||
          'Something went wrong. Please try again.'
      );

    } finally {
      setIsRegistering(false);
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
            disabled={isRegistering}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Create Account
            </Text>

            <Text style={styles.subtitle}>
              Register to start shopping
            </Text>
          </View>
        </View>

        {/* FORM */}

        <View style={styles.formCard}>

          {/* FULL NAME */}

          <Text style={styles.label}>
            Full Name *
          </Text>

          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#888888"
            value={name}
            onChangeText={text => {
              setName(text);

              if (errors.name) {
                setErrors({
                  ...errors,
                  name: '',
                });
              }
            }}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isRegistering}
            style={[
              styles.input,
              errors.name &&
                styles.inputError,
            ]}
          />

          {errors.name ? (
            <Text style={styles.errorText}>
              {errors.name}
            </Text>
          ) : null}

          {/* EMAIL */}

          <View style={styles.labelRow}>
            <Text style={styles.label}>
              Email
            </Text>

            <Text style={styles.optionalText}>
              Optional
            </Text>
          </View>

          <TextInput
            placeholder="Email address (optional)"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={text => {
              setEmail(text);

              if (errors.email) {
                setErrors({
                  ...errors,
                  email: '',
                });
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isRegistering}
            style={[
              styles.input,
              errors.email &&
                styles.inputError,
            ]}
          />

          {errors.email ? (
            <Text style={styles.errorText}>
              {errors.email}
            </Text>
          ) : null}

          {/* PHONE */}

          <Text style={styles.label}>
            Phone Number *
          </Text>

          <TextInput
            placeholder="Phone Number"
            placeholderTextColor="#888888"
            value={phone}
            onChangeText={text => {
              setPhone(text);

              if (errors.phone) {
                setErrors({
                  ...errors,
                  phone: '',
                });
              }
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isRegistering}
            style={[
              styles.input,
              errors.phone &&
                styles.inputError,
            ]}
          />

          {errors.phone ? (
            <Text style={styles.errorText}>
              {errors.phone}
            </Text>
          ) : null}

          {/* ADDRESS */}

          <Text style={styles.label}>
            Address *
          </Text>

          <TextInput
            placeholder="Address"
            placeholderTextColor="#888888"
            value={address}
            onChangeText={text => {
              setAddress(text);

              if (errors.address) {
                setErrors({
                  ...errors,
                  address: '',
                });
              }
            }}
            multiline
            editable={!isRegistering}
            style={[
              styles.input,
              styles.addressInput,
              errors.address &&
                styles.inputError,
            ]}
          />

          {errors.address ? (
            <Text style={styles.errorText}>
              {errors.address}
            </Text>
          ) : null}

          {/* PASSWORD */}

          <Text style={styles.label}>
            Password *
          </Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888888"
              value={password}
              onChangeText={text => {
                setPassword(text);

                if (errors.password) {
                  setErrors({
                    ...errors,
                    password: '',
                  });
                }
              }}
              secureTextEntry={
                !showPassword
              }
              editable={!isRegistering}
              style={[
                styles.input,
                styles.passwordInput,
                errors.password &&
                  styles.inputError,
              ]}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() =>
                setShowPassword(
                  !showPassword
                )
              }
              disabled={isRegistering}
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

          {errors.password ? (
            <Text style={styles.errorText}>
              {errors.password}
            </Text>
          ) : null}

          {/* CONFIRM PASSWORD */}

          <Text style={styles.label}>
            Confirm Password *
          </Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#888888"
              value={confirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);

                if (
                  errors.confirmPassword
                ) {
                  setErrors({
                    ...errors,
                    confirmPassword: '',
                  });
                }
              }}
              secureTextEntry={
                !showConfirmPassword
              }
              editable={!isRegistering}
              style={[
                styles.input,
                styles.passwordInput,
                errors.confirmPassword &&
                  styles.inputError,
              ]}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              disabled={isRegistering}
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

          {errors.confirmPassword ? (
            <Text style={styles.errorText}>
              {errors.confirmPassword}
            </Text>
          ) : null}

          {/* REGISTER */}

          <Pressable
            style={[
              styles.registerButton,
              isRegistering &&
                styles.registerButtonDisabled,
            ]}
            onPress={
              handleRegister
            }
            disabled={
              isRegistering
            }
          >
            <Text style={styles.registerText}>
              {isRegistering
                ? 'Creating Account...'
                : 'Create Account'}
            </Text>

            {!isRegistering && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>

        {/* LOGIN */}

        <View style={styles.loginSection}>
          <Text style={styles.loginQuestion}>
            Already have an account?
          </Text>

          <Pressable
            style={styles.loginButton}
            onPress={() =>
              router.push('/login')
            }
            disabled={isRegistering}
          >
            <Text style={styles.loginText}>
              Login
            </Text>

            <Ionicons
              name="chevron-forward"
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

const styles = StyleSheet.create({
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

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 18,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  optionalText: {
    marginLeft: 7,
    marginBottom: 7,
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
  },

  input: {
    minHeight: 52,
    backgroundColor: '#F7F7F7',
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    color: '#000000',
  },

  inputError: {
    borderColor: '#E53935',
  },

  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: -11,
    marginBottom: 12,
    marginLeft: 4,
  },

  addressInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 15,
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

  registerButton: {
    marginTop: 5,
    backgroundColor: '#D4AF37',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  registerButtonDisabled: {
    opacity: 0.6,
  },

  registerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loginSection: {
    marginTop: 20,
    alignItems: 'center',
  },

  loginQuestion: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 8,
  },

  loginButton: {
    minHeight: 45,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  loginText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});