
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

  const [originalPhone, setOriginalPhone] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [phoneVerification, setPhoneVerification] =
    useState(false);

  const [otp, setOtp] =
    useState('');

  const [pendingPhone, setPendingPhone] =
    useState('');

  const [verifyingPhone, setVerifyingPhone] =
    useState(false);


  // =========================================================
  // LOAD USER
  // =========================================================

  const loadUser = async () => {

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

      setOriginalPhone(
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
  // SAVE PROFILE INFORMATION
  //
  // IMPORTANT:
  // Phone is NEVER sent here.
  //
  // Email:
  // - If entered -> send it.
  // - If empty -> do NOT send the email field at all.
  //
  // This keeps customer email optional.
  // =========================================================

  const saveProfileInformation =
    async (
      accessToken: string,
      firstName: string,
      lastName: string,
      trimmedEmail: string,
      trimmedAddress: string,
    ) => {

      const body: any = {
        firstName:
          firstName,

        lastName:
          lastName,

        address:
          trimmedAddress,
      };

      // =====================================================
      // EMAIL IS OPTIONAL
      //
      // Only send email when the customer actually entered one.
      // =====================================================

      if (trimmedEmail) {
        body.email =
          trimmedEmail;
      }

      console.log(
        'UPDATE USER REQUEST BODY:',
        body
      );

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
              JSON.stringify(body),
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

      return {
        response,
        data,
      };
    };


  // =========================================================
  // REQUEST PHONE CHANGE
  // =========================================================

  const requestPhoneChange =
    async (
      accessToken: string,
      newPhone: string,
    ) => {

      const response =
        await fetch(
          `${API_URL}/auth/request-change-phone`,
          {
            method: 'POST',

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
                newPhone,
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
        'REQUEST CHANGE PHONE RESPONSE:',
        data
      );

      return {
        response,
        data,
      };
    };


  // =========================================================
  // SAVE
  // =========================================================

  const saveChanges =
    async () => {

      const trimmedName =
        name.trim();

      const trimmedEmail =
        email.trim();

      const trimmedPhone =
        phone.trim();

      const trimmedAddress =
        address.trim();


      // =====================================================
      // VALIDATION
      // =====================================================

      if (!trimmedName) {

        Alert.alert(
          'Missing Information',
          'Please enter your name.'
        );

        return;
      }

      // EMAIL IS OPTIONAL.
      // NO VALIDATION HERE.

      if (!trimmedPhone) {

        Alert.alert(
          'Missing Information',
          'Please enter your phone number.'
        );

        return;
      }

      if (!trimmedAddress) {

        Alert.alert(
          'Missing Information',
          'Please enter your address.'
        );

        return;
      }

      if (
        saving ||
        verifyingPhone
      ) {
        return;
      }


      try {

        setSaving(true);

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


        // ===================================================
        // SPLIT FULL NAME
        // ===================================================

        const nameParts =
          trimmedName.split(/\s+/);

        const firstName =
          nameParts.shift() || '';

        const lastName =
          nameParts.join(' ');


        // ===================================================
        // CHECK WHETHER PHONE CHANGED
        // ===================================================

        const phoneChanged =
          trimmedPhone !==
          originalPhone;


        console.log(
          'ORIGINAL PHONE:',
          originalPhone
        );

        console.log(
          'NEW PHONE:',
          trimmedPhone
        );

        console.log(
          'PHONE CHANGED:',
          phoneChanged
        );


        // ===================================================
        // SAVE NORMAL PROFILE DATA FIRST
        //
        // Phone is intentionally excluded.
        //
        // If phone changed:
        // the old phone remains in the database.
        // ===================================================

        const {
          response:
            profileResponse,
          data:
            profileData,
        } =
          await saveProfileInformation(
            accessToken,
            firstName,
            lastName,
            trimmedEmail,
            trimmedAddress,
          );


        // ===================================================
        // AUTH ERROR
        // ===================================================

        if (
          profileResponse.status === 401
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


        // ===================================================
        // PROFILE UPDATE FAILED
        // ===================================================

        if (!profileResponse.ok) {

          console.log(
            'PROFILE UPDATE FAILED:',
            profileData
          );

          Alert.alert(
            'Update Failed',
            profileData.message ||
              'Could not update your account.'
          );

          return;
        }


        // ===================================================
        // SAVE UPDATED PROFILE USER LOCALLY
        // ===================================================

        const updatedProfileUser =
          profileData.user;

        if (updatedProfileUser) {

          await AsyncStorage.setItem(
            'user',
            JSON.stringify(
              updatedProfileUser
            )
          );

          const updatedFullName =
            updatedProfileUser.name ||
            [
              updatedProfileUser.firstName,
              updatedProfileUser.lastName,
            ]
              .filter(Boolean)
              .join(' ');

          setName(
            updatedFullName
          );

          setEmail(
            updatedProfileUser.email || ''
          );

          setAddress(
            updatedProfileUser.address || ''
          );

          // IMPORTANT:
          // Do not replace phone with a new value here.
          //
          // If phone changed, backend still has old phone.
          //
          setPhone(
            updatedProfileUser.phone ||
            originalPhone
          );
        }


        // ===================================================
        // PHONE DID NOT CHANGE
        //
        // Save is complete.
        // NO OTP required.
        // ===================================================

        if (!phoneChanged) {

          setPhone(
            originalPhone
          );

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

          return;
        }


        // ===================================================
        // PHONE CHANGED
        //
        // DO NOT SAVE NEW PHONE.
        //
        // Request OTP first.
        // ===================================================

        const {
          response:
            phoneResponse,
          data:
            phoneData,
        } =
          await requestPhoneChange(
            accessToken,
            trimmedPhone,
          );


        // ===================================================
        // AUTH ERROR
        // ===================================================

        if (
          phoneResponse.status === 401
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


        // ===================================================
        // PHONE OTP REQUEST FAILED
        // ===================================================

        if (!phoneResponse.ok) {

          // Keep old phone because it was NOT verified.

          setPhone(
            originalPhone
          );

          Alert.alert(
            'Phone Number Not Updated',
            phoneData.message ||
              'Could not start phone number verification.'
          );

          return;
        }


        // ===================================================
        // VERIFICATION REQUIRED
        // =====================================================

        setPendingPhone(
          trimmedPhone
        );

        setOtp('');

        setPhoneVerification(
          true
        );

        // Show pending phone in the UI.
        // It is NOT saved to user.phone yet.

        setPhone(
          trimmedPhone
        );

        Alert.alert(
          'Verification Required',
          'A verification code has been requested. Please enter the code to confirm your new phone number.'
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
  // VERIFY NEW PHONE
  // =========================================================

  const verifyPhoneChange =
    async () => {

      const cleanOTP =
        otp.trim();


      if (!cleanOTP) {

        Alert.alert(
          'Missing Code',
          'Please enter the verification code.'
        );

        return;
      }


      if (
        cleanOTP.length !== 6
      ) {

        Alert.alert(
          'Invalid Code',
          'Please enter the 6-digit verification code.'
        );

        return;
      }


      if (
        verifyingPhone ||
        saving
      ) {
        return;
      }


      try {

        setVerifyingPhone(true);

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
            `${API_URL}/auth/verify-change-phone`,
            {
              method: 'POST',

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
                  otp:
                    cleanOTP,
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
          'VERIFY CHANGE PHONE RESPONSE:',
          data
        );


        // ===================================================
        // AUTH ERROR
        // ===================================================

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


        // ===================================================
        // OTP FAILED
        // ===================================================

        if (!response.ok) {

          Alert.alert(
            'Verification Failed',
            data.message ||
              'Incorrect verification code.'
          );

          return;
        }


        // ===================================================
        // SAVE NEW ACCESS TOKEN
        //
        // The old token contained the old phone.
        // Backend returns a fresh token after verification.
        // ===================================================

        if (
          data.accessToken
        ) {

          await AsyncStorage.setItem(
            'accessToken',
            data.accessToken
          );
        }


        // ===================================================
        // SAVE UPDATED USER
        // ===================================================

        if (data.user) {

          await AsyncStorage.setItem(
            'user',
            JSON.stringify(
              data.user
            )
          );

          const fullName =
            data.user.name ||
            [
              data.user.firstName,
              data.user.lastName,
            ]
              .filter(Boolean)
              .join(' ');

          setName(
            fullName
          );

          setEmail(
            data.user.email || ''
          );

          setPhone(
            data.user.phone || ''
          );

          setAddress(
            data.user.address || ''
          );

          setOriginalPhone(
            data.user.phone || ''
          );
        }


        // ===================================================
        // CLEAR VERIFICATION STATE
        // ===================================================

        setPendingPhone('');

        setOtp('');

        setPhoneVerification(
          false
        );


        Alert.alert(
          'Success',
          'Your phone number has been updated successfully! 🎉',
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
          'VERIFY CHANGE PHONE ERROR:',
          error
        );

        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please try again.'
        );

      } finally {

        setVerifyingPhone(false);
      }
    };


  // =========================================================
  // CANCEL PHONE VERIFICATION
  // =========================================================

  const cancelPhoneVerification =
    () => {

      if (
        verifyingPhone ||
        saving
      ) {
        return;
      }

      Alert.alert(
        'Cancel Verification',
        'Your old phone number will remain active. The new phone number will not be saved.',
        [
          {
            text: 'Keep Verifying',
            style: 'cancel',
          },

          {
            text: 'Cancel',
            style: 'destructive',

            onPress: () => {

              setPhoneVerification(
                false
              );

              setOtp('');

              setPendingPhone('');

              setPhone(
                originalPhone
              );
            },
          },
        ]
      );
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
            disabled={
              saving ||
              verifyingPhone
            }
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
              editable={
                !saving &&
                !verifyingPhone &&
                !phoneVerification
              }
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
              placeholder="Email (Optional)"
              placeholderTextColor="#888888"
              value={email}
              onChangeText={
                setEmail
              }
              editable={
                !saving &&
                !verifyingPhone &&
                !phoneVerification
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.optionalText
              }
            >
              Optional
            </Text>

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
              editable={
                !saving &&
                !verifyingPhone &&
                !phoneVerification
              }
              style={
                styles.input
              }
            />


            {phoneVerification && (

              <View
                style={
                  styles.verificationNotice
                }
              >

                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#D4AF37"
                />


                <View
                  style={
                    styles.verificationNoticeText
                  }
                >

                  <Text
                    style={
                      styles.verificationTitle
                    }
                  >
                    Verification Required
                  </Text>


                  <Text
                    style={
                      styles.verificationDescription
                    }
                  >
                    Enter the 6-digit code for:
                  </Text>


                  <Text
                    style={
                      styles.pendingPhoneText
                    }
                  >
                    {pendingPhone}
                  </Text>

                </View>

              </View>
            )}

          </View>


          {/* OTP */}

          {phoneVerification && (

            <View
              style={
                styles.field
              }
            >

              <Text
                style={styles.label}
              >
                Verification Code
              </Text>


              <TextInput
                placeholder="Enter 6-digit code"
                placeholderTextColor="#888888"
                value={otp}
                onChangeText={
                  (value) =>
                    setOtp(
                      value.replace(
                        /\D/g,
                        ''
                      ).slice(0, 6)
                    )
                }
                keyboardType="number-pad"
                maxLength={6}
                editable={
                  !verifyingPhone
                }
                autoFocus
                style={[
                  styles.input,
                  styles.otpInput,
                ]}
              />


              <Text
                style={
                  styles.otpHint
                }
              >
                The verification code is valid for 90 minutes.
              </Text>

            </View>
          )}


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
              editable={
                !saving &&
                !verifyingPhone &&
                !phoneVerification
              }
              style={[
                styles.input,
                styles.addressInput,
              ]}
            />

          </View>

        </View>


        {/* SAVE / VERIFY */}

        {!phoneVerification ? (

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

        ) : (

          <Pressable
            style={[
              styles.saveButton,
              verifyingPhone &&
                styles.disabledButton,
            ]}
            onPress={
              verifyPhoneChange
            }
            disabled={
              verifyingPhone
            }
          >

            {verifyingPhone ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color="#FFFFFF"
              />

            )}


            <Text
              style={styles.saveText}
            >
              {verifyingPhone
                ? 'Verifying...'
                : 'Verify Phone Number'}
            </Text>

          </Pressable>

        )}


        {/* CANCEL */}

        <Pressable
          style={
            styles.cancelButton
          }
          onPress={
            phoneVerification
              ? cancelPhoneVerification
              : () =>
                  router.back()
          }
          disabled={
            saving ||
            verifyingPhone
          }
        >

          <Text
            style={styles.cancelText}
          >
            {phoneVerification
              ? 'Cancel Verification'
              : 'Cancel'}
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

    optionalText: {
      marginTop: 5,
      fontSize: 11,
      color:
        '#888888',
    },

    addressInput: {
      height: 85,
      paddingTop: 14,
      textAlignVertical:
        'top',
    },

    otpInput: {
      textAlign:
        'center',
      fontSize: 20,
      fontWeight:
        '700',
      letterSpacing:
        5,
    },

    otpHint: {
      marginTop: 7,
      fontSize: 11,
      color:
        '#888888',
    },

    verificationNotice: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        '#FFF9E8',
      borderWidth: 1,
      borderColor:
        '#E8D58A',
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    verificationNoticeText: {
      flex: 1,
      marginLeft: 10,
    },

    verificationTitle: {
      fontSize: 13,
      fontWeight:
        '800',
      color:
        '#1A1A1A',
    },

    verificationDescription: {
      marginTop: 3,
      fontSize: 12,
      color:
        '#666666',
    },

    pendingPhoneText: {
      marginTop: 4,
      fontSize: 14,
      fontWeight:
        '800',
      color:
        '#1A1A1A',
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
