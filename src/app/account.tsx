import { getSessionSnapshot } from '../services/tokenStorage';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {
  useCallback,
  useState,
  useRef,
} from 'react';

import {
  fetchCurrentUser,
  logout as authLogout,
  deleteAccount,
  User,
} from '../services/authService';


// =========================================================
// ACCOUNT
// =========================================================

export default function Account() {
  const [user, setUser] =
    useState<User | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const deletionInProgress = useRef(false);
  const logoutInProgress = useRef(false);

  // =======================================================
  // LOAD USER
  // =======================================================

  const loadUser = async () => {
    try {
      const currentUser =
        await fetchCurrentUser();

      setUser(currentUser);
    } catch (error) {
      if (__DEV__) { console.log(
        'GET USER ERROR:',
        error
      ); }
    }
  };

  // =======================================================
  // REFRESH WHEN ACCOUNT PAGE OPENS
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  // =======================================================
  // LOGOUT
  // =======================================================

  const logout = async () => {
    if (logoutInProgress.current) return;
    logoutInProgress.current = true;
    try {
      await authLogout();

      setUser(null);

      if (__DEV__) { console.log(
        'LOGOUT COMPLETED SUCCESSFULLY'
      ); }

      // The root session lifecycle resets navigation as soon as local logout succeeds.

    } catch (error) {
      if (__DEV__) { console.log(
        'LOGOUT ERROR:',
        error
      ); }

      Alert.alert(
        'Logout Error',
        'Something went wrong while logging out.'
      );
    } finally {
      logoutInProgress.current = false;
    }
  };

  // =======================================================
  // DELETE ACCOUNT
  // =======================================================

  const handleDeleteAccount = () => {
    if (deletionInProgress.current) return;
    const revision = getSessionSnapshot().revision;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This cannot be undone. Some commercial records may be retained.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (revision !== getSessionSnapshot().revision) return;
            if (deletionInProgress.current) return;
            deletionInProgress.current = true;
            setDeletingAccount(true);

            try {
              await deleteAccount();
              setUser(null);
              router.replace('/');
            } catch (error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unable to delete your account. Please try again.';

  const deletedOnServer = message.startsWith(
    'Your account was deleted, but'
  );

  Alert.alert(
    deletedOnServer
      ? 'Account Deleted — Device Cleanup Needed'
      : 'Account Deletion Failed',
    message,
    [
      {
        text: 'OK',
        onPress: () => {
          if (deletedOnServer) {
            setUser(null);
            router.replace('/');
          }
        },
      },
    ]
  );
}finally {
              deletionInProgress.current = false;
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // DISPLAY NAME
  // =======================================================

  const displayName =
    user?.name ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(' ') ||
    'User';

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

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace('/')
            }
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color="#171717"
            />

          </Pressable>


          <View style={styles.headerText}>

            <Text style={styles.title}>
              My Account
            </Text>

            <Text style={styles.subtitle}>
              Manage your account
            </Text>

          </View>

        </View>


        {/* =================================================
            USER INFORMATION
        ================================================= */}

        {user && (

          <View style={styles.userCard}>

            <View style={styles.userIcon}>

              <Ionicons
                name="person"
                size={25}
                color="#E35B3F"
              />

            </View>


            <View style={styles.userInfo}>

              <Text
                style={styles.userName}
                numberOfLines={1}
              >
                {displayName}
              </Text>


              {user.email && (

                <Text
                  style={styles.userEmail}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>

              )}


              {user.phone && (

                <View style={styles.detailRow}>

                  <Ionicons
                    name="call-outline"
                    size={13}
                    color="#817B71"
                  />

                  <Text
                    style={styles.userDetails}
                    numberOfLines={1}
                  >
                    {user.phone}
                  </Text>

                </View>

              )}


              {user.address && (

                <View style={styles.detailRow}>

                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="#817B71"
                  />

                  <Text
                    style={styles.userDetails}
                    numberOfLines={1}
                  >
                    {user.address}
                  </Text>

                </View>

              )}

            </View>

          </View>

        )}


        {/* =================================================
            ACCOUNT
        ================================================= */}

        <View style={styles.sectionHeader}>

          <View style={styles.sectionAccent} />

          <Text style={styles.sectionTitle}>
            Account
          </Text>

        </View>


        <View style={styles.card}>

          {/* =================================================
              EDIT ACCOUNT
          ================================================= */}

          <Pressable
            style={styles.row}
            onPress={() =>
              router.push(
                '/edit-account'
              )
            }
          >

            <View style={styles.iconContainer}>

              <Ionicons
                name="person-outline"
                size={22}
                color="#E35B3F"
              />

            </View>


            <View style={styles.rowText}>

              <Text style={styles.rowTitle}>
                Edit Account
              </Text>

              <Text style={styles.rowSubtitle}>
                Update your personal information
              </Text>

            </View>


            <View style={styles.chevronContainer}>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

          </Pressable>


          <View style={styles.divider} />


          {/* =================================================
              MY ORDERS
          ================================================= */}

          <Pressable
            style={styles.row}
            onPress={() =>
              router.push('/orders')
            }
          >

            <View style={styles.iconContainer}>

              <Ionicons
                name="receipt-outline"
                size={22}
                color="#E35B3F"
              />

            </View>


            <View style={styles.rowText}>

              <Text style={styles.rowTitle}>
                My Orders
              </Text>

              <Text style={styles.rowSubtitle}>
                View your previous orders
              </Text>

            </View>


            <View style={styles.chevronContainer}>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

          </Pressable>


          <View style={styles.divider} />


          {/* =================================================
              SETTINGS
          ================================================= */}

          <Pressable
            style={styles.row}
            onPress={() =>
              router.push('/settings')
            }
          >

            <View style={styles.iconContainer}>

              <Ionicons
                name="settings-outline"
                size={22}
                color="#E35B3F"
              />

            </View>


            <View style={styles.rowText}>

              <Text style={styles.rowTitle}>
                Settings
              </Text>

              <Text style={styles.rowSubtitle}>
                App settings and preferences
              </Text>

            </View>


            <View style={styles.chevronContainer}>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

          </Pressable>

        </View>


        {/* =================================================
            LOGOUT
        ================================================= */}

        <Pressable
          style={styles.logoutButton}
          onPress={logout}
        >

          <Ionicons
            name="log-out-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>

        </Pressable>
        <Pressable
          style={[styles.deleteAccountButton, deletingAccount && styles.disabledButton]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#B42318" />
          ) : (
            <Ionicons name="trash-outline" size={19} color="#B42318" />
          )}
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
          </Text>
        </Pressable>
      </ScrollView>

    </View>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  /* =====================================================
     CONTAINER
  ===================================================== */

  container: {
    flex: 1,
    paddingTop:20,
    backgroundColor:
      '#F7F3EC',
  },


  scrollContent: {
    paddingHorizontal: 18,

    paddingTop: 18,

    paddingBottom: 40,
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

    marginRight: 13,

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


  title: {
    fontSize: 29,

    fontWeight: '900',

    color: '#171717',

    letterSpacing: -0.8,
  },


  subtitle: {
    marginTop: 3,

    fontSize: 13,

    fontWeight: '600',

    color: '#817B71',
  },


  /* =====================================================
     USER CARD
  ===================================================== */

  userCard: {
    backgroundColor:
      '#FFFFFF',

    borderRadius: 21,

    borderWidth: 1,

    borderColor:
      '#E7DED1',

    padding: 15,

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 5,

    shadowColor:
      '#171717',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.07,

    shadowRadius: 10,

    elevation: 2,
  },


  userIcon: {
    width: 58,

    height: 58,

    borderRadius: 18,

    backgroundColor:
      '#FFF7F3',

    borderWidth: 1,

    borderColor:
      '#F0CFC4',

    alignItems: 'center',

    justifyContent: 'center',
  },


  userInfo: {
    flex: 1,

    marginLeft: 14,

    minWidth: 0,
  },


  userName: {
    fontSize: 18,

    fontWeight: '900',

    color: '#171717',

    letterSpacing: -0.2,
  },


  userEmail: {
    marginTop: 3,

    fontSize: 12,

    fontWeight: '600',

    color: '#817B71',
  },


  detailRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 4,

    minWidth: 0,
  },


  userDetails: {
    marginLeft: 5,

    flex: 1,

    fontSize: 12,

    fontWeight: '600',

    color: '#24221E',
  },


  /* =====================================================
     SECTION HEADER
  ===================================================== */

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 25,

    marginBottom: 11,
  },


  sectionAccent: {
    width: 5,

    height: 23,

    borderRadius: 3,

    backgroundColor:
      '#E35B3F',

    marginRight: 10,
  },


  sectionTitle: {
    fontSize: 20,

    fontWeight: '900',

    color: '#171717',

    letterSpacing: -0.4,
  },


  /* =====================================================
     ACCOUNT CARD
  ===================================================== */

  card: {
    backgroundColor:
      '#FFFFFF',

    borderRadius: 21,

    borderWidth: 1,

    borderColor:
      '#E7DED1',

    overflow: 'hidden',

    shadowColor:
      '#171717',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.07,

    shadowRadius: 10,

    elevation: 2,
  },


  /* =====================================================
     ROW
  ===================================================== */

  row: {
    minHeight: 82,

    paddingHorizontal: 15,

    paddingVertical: 10,

    flexDirection: 'row',

    alignItems: 'center',
  },


  iconContainer: {
    width: 46,

    height: 46,

    borderRadius: 15,

    backgroundColor:
      '#FFF7F3',

    borderWidth: 1,

    borderColor:
      '#F0CFC4',

    alignItems: 'center',

    justifyContent: 'center',
  },


  rowText: {
    flex: 1,

    marginLeft: 13,

    paddingRight: 8,
  },


  rowTitle: {
    fontSize: 15,

    fontWeight: '800',

    color: '#24221E',
  },


  rowSubtitle: {
    marginTop: 4,

    fontSize: 12,

    fontWeight: '500',

    color: '#817B71',

    lineHeight: 17,
  },


  chevronContainer: {
    width: 32,

    height: 32,

    borderRadius: 11,

    backgroundColor:
      '#F8F2EA',

    alignItems: 'center',

    justifyContent: 'center',
  },


  /* =====================================================
     DIVIDER
  ===================================================== */

  divider: {
    height: 1,

    backgroundColor:
      '#EEE4D7',

    marginLeft: 74,

    marginRight: 15,
  },


  /* =====================================================
     LOGOUT
  ===================================================== */

  logoutButton: {
    marginTop: 24,

    minHeight: 53,

    borderRadius: 16,

    backgroundColor:
      '#E35B3F',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,

    shadowColor:
      '#E35B3F',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.18,

    shadowRadius: 9,

    elevation: 3,
  },


  logoutText: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

    letterSpacing: 0.1,
  },
disabledButton: {
  opacity: 0.5,
},

deleteAccountButton: {
  marginTop: 14,
  minHeight: 53,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#E9B7B3',
  backgroundColor: '#FFF5F4',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

deleteAccountText: {
  color: '#B42318',
  fontSize: 14,
  fontWeight: '800',
},
});
