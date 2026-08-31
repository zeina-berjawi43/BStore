
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useCallback,
  useState,
} from 'react';

import {
  API_URL,
  getValidAccessToken,
} from '../services/authService';

export default function EditAccount() {

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  // =========================================================
  // LOAD USER
  // =========================================================

  const loadUser =
    async () => {

      try {

        setLoading(true);

        const accessToken =
          await getValidAccessToken();

        if (!accessToken) {

          await AsyncStorage.multiRemove([
            'accessToken',
            'refreshToken',
            'user',
            'isLoggedIn',
          ]);

          router.replace('/login');

          return;
        }

        const response =
          await fetch(
            `${API_URL}/users/me`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,

                Accept:
                  'application/json',
              },
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
          'GET USER RESPONSE:',
          data
        );

        if (
          response.status === 401
        ) {

          await AsyncStorage.multiRemove([
            'accessToken',
            'refreshToken',
            'user',
            'isLoggedIn',
          ]);

          router.replace('/login');

          return;
        }

        if (!response.ok) {

          throw new Error(
            data.message ||
              'Unable to load account information.'
          );
        }

        const user =
          data.user;

        if (!user) {

          throw new Error(
            'User information was not found.'
          );
        }

        const fullName =
          user.name ||
          [
            user.firstName,
            user.lastName,
          ]
            .filter(Boolean)
            .join(' ');

        setName(
          fullName
        );

        setEmail(
          user.email || ''
        );

        setPhone(
          user.phone || ''
        );

        setAddress(
          user.address || ''
        );

        await AsyncStorage.setItem(
          'user',
          JSON.stringify(user)
        );

      } catch (error: any) {

        console.log(
          'LOAD ACCOUNT ERROR:',
          error
        );

        Alert.alert(
          'Connection Error',
          error?.message ||
            'Could not load your account information.'
        );

      } finally {

        setLoading(false);
      }
    };

  // =========================================================
  // FOCUS
  // =========================================================

  useFocusEffect(
    useCallback(() => {

      loadUser();

    }, [])
  );

  // =========================================================
  // SAVE
  // =========================================================

  const saveChanges =
    async () => {

      if (!name.trim()) {

        Alert.alert(
          'Missing Information',
          'Please enter your name.'
        );

        return;
      }

      if (!phone.trim()) {

        Alert.alert(
          'Missing Information',
          'Please enter your phone number.'
        );

        return;
      }

      if (!address.trim()) {

        Alert.alert(
          'Missing Information',
          'Please enter your address.'
        );

        return;
      }

      if (saving) {
        return;
      }

      try {

        setSaving(true);

        const accessToken =
          await getValidAccessToken();

        if (!accessToken) {

          router.replace('/login');

          return;
        }

        const response =
          await fetch(
            `${API_URL}/users/me`,
            {
              method: 'PUT',

              headers: {
                Authorization:
                  `Bearer ${accessToken}`,

                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },

              body:
                JSON.stringify({

                  name:
                    name.trim(),

                  phone:
                    phone.trim(),

                  address:
                    address.trim(),

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
          'UPDATE USER RESPONSE:',
          data
        );

        if (
          response.status === 401
        ) {

          await AsyncStorage.multiRemove([
            'accessToken',
            'refreshToken',
            'user',
            'isLoggedIn',
          ]);

          router.replace('/login');

          return;
        }

        if (!response.ok) {

          Alert.alert(
            'Update Failed',
            data.message ||
              'Could not update your account.'
          );

          return;
        }

        const updatedUser =
          data.user;

        if (updatedUser) {

          await AsyncStorage.setItem(
            'user',
            JSON.stringify(
              updatedUser
            )
          );

          const fullName =
            updatedUser.name ||
            [
              updatedUser.firstName,
              updatedUser.lastName,
            ]
              .filter(Boolean)
              .join(' ');

          setName(
            fullName
          );

          setEmail(
            updatedUser.email || ''
          );

          setPhone(
            updatedUser.phone || ''
          );

          setAddress(
            updatedUser.address || ''
          );
        }

        Alert.alert(
          'Success',
          'Account updated successfully! 🎉',
          [
            {
              text: 'OK',
              onPress: () =>
                router.back(),
            },
          ]
        );

      } catch (error) {

        console.log(
          'SAVE ACCOUNT ERROR:',
          error
        );

        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please try again.'
        );

      } finally {

        setSaving(false);
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <ActivityIndicator
          size="large"
          color="#D4AF37"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading account...
        </Text>

      </View>
    );
  }

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
            disabled={saving}
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
              Edit Account
            </Text>

            <Text
              style={styles.subtitle}
            >
              Update your personal information
            </Text>

          </View>

        </View>

        {/* SECTION */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Personal Information
        </Text>

        <View style={styles.card}>

          {/* NAME */}

          <View
            style={styles.field}
          >

            <Text
              style={styles.label}
            >
              Full Name
            </Text>

            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#888888"
              value={name}
              onChangeText={
                setName
              }
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
              style={
                styles.input
              }
            />

          </View>

          {/* EMAIL */}

          <View
            style={styles.field}
          >

            <Text
              style={styles.label}
            >
              Email
            </Text>

            <TextInput
              value={email}
              editable={false}
              autoCapitalize="none"
              style={[
                styles.input,
                styles.disabledInput,
              ]}
            />

          </View>

          {/* PHONE */}

          <View
            style={styles.field}
          >

            <Text
              style={styles.label}
            >
              Phone Number
            </Text>

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#888888"
              value={phone}
              onChangeText={
                setPhone
              }
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              style={
                styles.input
              }
            />

          </View>

          {/* ADDRESS */}

          <View
            style={[
              styles.field,
              styles.lastField,
            ]}
          >

            <Text
              style={styles.label}
            >
              Address
            </Text>

            <TextInput
              placeholder="Address"
              placeholderTextColor="#888888"
              value={address}
              onChangeText={
                setAddress
              }
              multiline
              editable={!saving}
              style={[
                styles.input,
                styles.addressInput,
              ]}
            />

          </View>

        </View>

        {/* SAVE */}

        <Pressable
          style={[
            styles.saveButton,
            saving &&
              styles.disabledButton,
          ]}
          onPress={
            saveChanges
          }
          disabled={
            saving
          }
        >

          {saving ? (

            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />

          ) : (

            <Ionicons
              name="checkmark-circle-outline"
              size={21}
              color="#FFFFFF"
            />

          )}

          <Text
            style={styles.saveText}
          >
            {saving
              ? 'Saving...'
              : 'Save Changes'}
          </Text>

        </Pressable>

        {/* CANCEL */}

        <Pressable
          style={
            styles.cancelButton
          }
          onPress={() =>
            router.back()
          }
          disabled={saving}
        >

          <Text
            style={styles.cancelText}
          >
            Cancel
          </Text>

        </Pressable>

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

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F7F7F7',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color:
        '#1A1A1A',
      fontWeight:
        '600',
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
      marginBottom: 8,
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
      fontWeight:
        '800',
      color:
        '#000000',
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color:
        '#888888',
    },

    sectionTitle: {
      marginTop: 25,
      marginBottom: 10,
      fontSize: 15,
      fontWeight:
        '700',
      color:
        '#1A1A1A',
    },

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      padding: 15,
    },

    field: {
      marginBottom: 18,
    },

    lastField: {
      marginBottom: 0,
    },

    label: {
      marginBottom: 7,
      fontSize: 13,
      fontWeight:
        '700',
      color:
        '#1A1A1A',
    },

    input: {
      minHeight: 50,
      backgroundColor:
        '#F7F7F7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 14,
      color:
        '#1A1A1A',
    },

    disabledInput: {
      backgroundColor:
        '#EEEEEE',
      color:
        '#888888',
    },

    addressInput: {
      height: 85,
      paddingTop: 14,
      textAlignVertical:
        'top',
    },

    saveButton: {
      marginTop: 20,
      height: 52,
      borderRadius: 26,
      backgroundColor:
        '#D4AF37',
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

    saveText: {
      color:
        '#FFFFFF',
      fontSize: 15,
      fontWeight:
        '700',
    },

    cancelButton: {
      marginTop: 12,
      height: 50,
      borderRadius: 25,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    cancelText: {
      color:
        '#1A1A1A',
      fontSize: 15,
      fontWeight:
        '600',
    },

  });