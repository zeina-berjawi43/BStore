import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {
  useCallback,
  useState,
} from 'react';

import {
  fetchCurrentUser,
  logout as authLogout,
  User,
} from '../services/authService';

// =========================================================
// ACCOUNT
// =========================================================

export default function Account() {
  const [user, setUser] =
    useState<User | null>(null);

  // =======================================================
  // LOAD USER
  // =======================================================

  const loadUser = async () => {
    try {
      const currentUser =
        await fetchCurrentUser();

      setUser(currentUser);
    } catch (error) {
      console.log(
        'GET USER ERROR:',
        error
      );
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
    try {
      await authLogout();

      setUser(null);

      console.log(
        'LOGOUT COMPLETED SUCCESSFULLY'
      );

      router.replace('/');

    } catch (error) {
      console.log(
        'LOGOUT ERROR:',
        error
      );

      Alert.alert(
        'Logout Error',
        'Something went wrong while logging out.'
      );
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
              router.replace('/')
            }
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
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

        {/* USER INFORMATION */}

        {user && (
          <View style={styles.userCard}>

            <View style={styles.userIcon}>
              <Ionicons
                name="person"
                size={25}
                color="#D4AF37"
              />
            </View>

            <View style={styles.userInfo}>

              <Text
                style={styles.userName}
                numberOfLines={1}
              >
                {user.name}
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
                <Text style={styles.userDetails}>
                  {user.phone}
                </Text>
              )}

              {user.address && (
                <Text
                  style={styles.userDetails}
                  numberOfLines={1}
                >
                  {user.address}
                </Text>
              )}

            </View>
          </View>
        )}

        {/* ACCOUNT */}

        <Text style={styles.sectionTitle}>
          Account
        </Text>

        <View style={styles.card}>

          {/* EDIT ACCOUNT */}

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
                color="#D4AF37"
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

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />
          </Pressable>

          <View style={styles.divider} />

          {/* MY ORDERS */}

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
                color="#D4AF37"
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

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />
          </Pressable>

          <View style={styles.divider} />

          {/* SETTINGS */}

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
                color="#D4AF37"
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

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />
          </Pressable>

        </View>

        {/* LOGOUT */}

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
    marginBottom: 18,
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

  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  userIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userInfo: {
    flex: 1,
    marginLeft: 13,
  },

  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },

  userEmail: {
    marginTop: 3,
    fontSize: 12,
    color: '#888888',
  },

  userDetails: {
    marginTop: 3,
    fontSize: 12,
    color: '#1A1A1A',
  },

  sectionTitle: {
    marginTop: 25,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },

  row: {
    minHeight: 78,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowText: {
    flex: 1,
    marginLeft: 12,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },

  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 69,
  },

  logoutButton: {
    marginTop: 25,
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});