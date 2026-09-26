import { updateTokens, saveSessionUser } from '../services/tokenStorage';
import { request } from '../services/request';
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
  logoutLocal,
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

        await logoutLocal(accessToken);

        router.replace('/login');

        return;
      }

      const response =
        await request(
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

      if (__DEV__) { console.log(
        'GET USER RESPONSE:',
        data
      ); }

      if (
        response.status === 401
      ) {

        await logoutLocal(accessToken);

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

      await saveSessionUser(accessToken, user);

    } catch (error: any) {

      if (__DEV__) { console.log(
        'LOAD ACCOUNT ERROR:',
        error
      ); }

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

      if (trimmedEmail) {
        body.email =
          trimmedEmail;
      }

      if (__DEV__) { console.log(
        'UPDATE USER REQUEST BODY:',
        body
      ); }

      const response =
        await request(
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

      if (__DEV__) { console.log(
        'UPDATE USER RESPONSE:',
        data
      ); }

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
        await request(
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

      if (__DEV__) { console.log(
        'REQUEST CHANGE PHONE RESPONSE:',
        data
      ); }

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

          await logoutLocal(accessToken);

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


        if (__DEV__) { console.log(
          'ORIGINAL PHONE:',
          originalPhone
        ); }

        if (__DEV__) { console.log(
          'NEW PHONE:',
          trimmedPhone
        ); }

        if (__DEV__) { console.log(
          'PHONE CHANGED:',
          phoneChanged
        ); }


        // ===================================================
        // SAVE NORMAL PROFILE DATA FIRST
        //
        // Phone is intentionally excluded.
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

          await logoutLocal(accessToken);

          router.replace('/login');

          return;
        }


        // ===================================================
        // PROFILE UPDATE FAILED
        // ===================================================

        if (!profileResponse.ok) {

          if (__DEV__) { console.log(
            'PROFILE UPDATE FAILED:',
            profileData
          ); }

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

          await saveSessionUser(accessToken, updatedProfileUser);

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

          setPhone(
            updatedProfileUser.phone ||
            originalPhone
          );
        }


        // ===================================================
        // PHONE DID NOT CHANGE
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

          await logoutLocal(accessToken);

          router.replace('/login');

          return;
        }


        // ===================================================
        // PHONE OTP REQUEST FAILED
        // ===================================================

        if (!phoneResponse.ok) {

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

        setPhone(
          trimmedPhone
        );

        Alert.alert(
          'Verification Required',
          'A verification code has been requested. Please enter the code to confirm your new phone number.'
        );

      } catch (error) {

        if (__DEV__) { console.log(
          'SAVE ACCOUNT ERROR:',
          error
        ); }

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

          await logoutLocal(accessToken);

          router.replace('/login');

          return;
        }


        const response =
          await request(
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


        if (__DEV__) { console.log(
          'VERIFY CHANGE PHONE RESPONSE:',
          data
        ); }


        // ===================================================
        // AUTH ERROR
        // ===================================================

        if (
          response.status === 401
        ) {

          await logoutLocal(accessToken);

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
        // ===================================================

        if (
          data.accessToken
        ) {

          await updateTokens({ accessToken: data.accessToken }, data.user, accessToken);
        }


        // ===================================================
        // SAVE UPDATED USER
        // ===================================================

        if (data.user) {

          if (!data.accessToken) await saveSessionUser(accessToken, data.user);

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

        if (__DEV__) { console.log(
          'VERIFY CHANGE PHONE ERROR:',
          error
        ); }

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
          color="#E35B3F"
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

        <View style={styles.sectionHeader}>

          <View style={styles.sectionAccent} />

          <Text
            style={
              styles.sectionTitle
            }
          >
            Personal Information
          </Text>

        </View>


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
              placeholderTextColor="#9A9186"
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
              placeholderTextColor="#9A9186"
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
              placeholderTextColor="#9A9186"
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

                <View
                  style={
                    styles.verificationIcon
                  }
                >

                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color="#E35B3F"
                  />

                </View>


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
                placeholderTextColor="#9A9186"
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
              placeholderTextColor="#9A9186"
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


{/* CHANGE PASSWORD */}

{!phoneVerification && (
  <Pressable
    onPress={() => router.push('/change-password')}
    disabled={saving || verifyingPhone}
    style={{
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E7DED1',
      borderRadius: 16,
      minHeight: 54,
      marginTop: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      opacity: saving || verifyingPhone ? 0.5 : 1,
    }}
  >
    <Ionicons
      name="lock-closed-outline"
      size={19}
      color="#E35B3F"
    />

    <Text
      style={{
        color: '#171717',
        fontSize: 14,
        fontWeight: '800',
      }}
    >
      Change Password
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

    /* =====================================================
       PAGE
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor: '#F7F3EC',
      paddingTop:20,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: '#F7F3EC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#817B71',
      fontWeight: '600',
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 45,
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
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E7DED1',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,

      shadowColor: '#171717',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },

    headerText: {
      flex: 1,
    },

    smallTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#817B71',
      marginBottom: 2,
      letterSpacing: 0.2,
    },

    title: {
      fontSize: 29,
      fontWeight: '900',
      color: '#171717',
      letterSpacing: -0.8,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '500',
      color: '#817B71',
    },


    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 11,
      paddingLeft: 2,
    },

    sectionAccent: {
      width: 4,
      height: 21,
      borderRadius: 2,
      backgroundColor: '#E35B3F',
      marginRight: 9,
    },

    sectionTitle: {
      flex: 1,
      fontSize: 19,
      fontWeight: '900',
      color: '#171717',
      letterSpacing: -0.3,
    },


    /* =====================================================
       MAIN CARD
    ===================================================== */

    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 21,
      borderWidth: 1,
      borderColor: '#E7DED1',
      padding: 16,

      shadowColor: '#171717',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.07,
      shadowRadius: 9,
      elevation: 2,
    },


    /* =====================================================
       FIELDS
    ===================================================== */

    field: {
      marginBottom: 18,
    },

    lastField: {
      marginBottom: 0,
    },

    label: {
      marginBottom: 7,
      fontSize: 13,
      fontWeight: '800',
      color: '#24221E',
    },

    input: {
      minHeight: 54,
      backgroundColor: '#FFF7F3',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#F0CFC4',
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 14,
      fontWeight: '600',
      color: '#24221E',
    },

    optionalText: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: '600',
      color: '#9A9186',
    },

    addressInput: {
      height: 88,
      paddingTop: 14,
      textAlignVertical: 'top',
    },

    otpInput: {
      textAlign: 'center',
      fontSize: 21,
      fontWeight: '800',
      letterSpacing: 5,
      backgroundColor: '#FFF7F3',
      borderColor: '#E35B3F',
    },

    otpHint: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: '500',
      color: '#9A9186',
    },


    /* =====================================================
       PHONE VERIFICATION
    ===================================================== */

    verificationNotice: {
      marginTop: 11,
      padding: 12,
      borderRadius: 15,
      backgroundColor: '#FFF7F3',
      borderWidth: 1,
      borderColor: '#F0CFC4',
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    verificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F0CFC4',
      alignItems: 'center',
      justifyContent: 'center',
    },

    verificationNoticeText: {
      flex: 1,
      marginLeft: 10,
      paddingTop: 1,
    },

    verificationTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: '#24221E',
    },

    verificationDescription: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '500',
      color: '#817B71',
    },

    pendingPhoneText: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: '900',
      color: '#E35B3F',
    },


    /* =====================================================
       BUTTONS
    ===================================================== */

    saveButton: {
      marginTop: 20,
      height: 54,
      borderRadius: 16,
      backgroundColor: '#E35B3F',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,

      shadowColor: '#E35B3F',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.20,
      shadowRadius: 9,
      elevation: 3,
    },

    disabledButton: {
      opacity: 0.65,
    },

    saveText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    cancelButton: {
      marginTop: 12,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E7DED1',
      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: '#171717',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.05,
      shadowRadius: 7,
      elevation: 1,
    },

    cancelText: {
      color: '#24221E',
      fontSize: 15,
      fontWeight: '800',
    },

  });
