
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
  getNotificationSetting,
  updateNotificationSetting,
} from '../services/authService';

import { useEffect, useState } from 'react';


// =========================================================
// NOTIFICATIONS
// =========================================================

export default function Notifications() {

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);


  // =========================================================
  // LOAD NOTIFICATION SETTING
  // =========================================================

  useEffect(() => {

    loadNotificationSetting();

  }, []);


  const loadNotificationSetting =
    async () => {

      try {

        const enabled =
          await getNotificationSetting();

        setNotificationsEnabled(
          enabled
        );

      } catch (error) {

        console.log(
          'ERROR LOADING NOTIFICATION SETTING:',
          error
        );

      }

    };


  // =========================================================
  // TOGGLE NOTIFICATIONS
  // =========================================================

  const toggleNotifications =
    async () => {

      const newValue =
        !notificationsEnabled;


      // Update UI immediately

      setNotificationsEnabled(
        newValue
      );


      try {

        const savedValue =
          await updateNotificationSetting(
            newValue
          );


        // Use backend value

        setNotificationsEnabled(
          savedValue
        );


        console.log(
          'NOTIFICATION SETTING UPDATED:',
          savedValue
        );

      } catch (error) {

        console.log(
          'ERROR UPDATING NOTIFICATION SETTING:',
          error
        );


        // Revert UI if backend update failed

        setNotificationsEnabled(
          !newValue
        );

      }

    };


  // =========================================================
  // UI
  // =========================================================

  return (

    <View
      style={
        styles.container
      }
    >

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.push(
                '/settings'
              )
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
              style={
                styles.title
              }
            >
              Notifications
            </Text>


            <Text
              style={
                styles.subtitle
              }
            >
              Manage your notifications
            </Text>

          </View>

        </View>


        {/* =================================================
            NOTIFICATION CARD
        ================================================= */}

        <View
          style={
            styles.card
          }
        >

          <View
            style={
              styles.iconContainer
            }
          >

            <Ionicons
              name="notifications-outline"
              size={22}
              color="#D4AF37"
            />

          </View>


          <View
            style={
              styles.textContainer
            }
          >

            <Text
              style={
                styles.rowTitle
              }
            >
              Notifications
            </Text>


            <Text
              style={
                styles.rowSubtitle
              }
            >
              {notificationsEnabled
                ? 'You will receive notifications'
                : 'Notifications are turned off'}
            </Text>

          </View>


          <Pressable
            style={[
              styles.switch,

              notificationsEnabled &&
                styles.switchActive,
            ]}
            onPress={
              toggleNotifications
            }
          >

            <View
              style={[
                styles.switchCircle,

                notificationsEnabled &&
                  styles.switchCircleActive,
              ]}
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

    /* CONTAINER */

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


    /* HEADER */

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


    /* CARD */

    card: {

      marginTop: 22,

      minHeight: 80,

      paddingHorizontal: 15,

      paddingVertical: 15,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      flexDirection:
        'row',

      alignItems:
        'center',

    },


    /* ICON */

    iconContainer: {

      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        '#F7F7F7',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    /* TEXT */

    textContainer: {

      flex: 1,

      marginLeft: 12,

    },


    rowTitle: {

      fontSize: 15,

      fontWeight:
        '700',

      color:
        '#1A1A1A',

    },


    rowSubtitle: {

      marginTop: 5,

      fontSize: 12,

      color:
        '#888888',

    },


    /* SWITCH */

    switch: {

      width: 52,

      height: 30,

      borderRadius: 15,

      backgroundColor:
        '#D8D8D8',

      justifyContent:
        'center',

      paddingHorizontal: 3,

    },


    switchActive: {

      backgroundColor:
        '#D4AF37',

    },


    switchCircle: {

      width: 24,

      height: 24,

      borderRadius: 12,

      backgroundColor:
        '#FFFFFF',

    },


    switchCircleActive: {

      alignSelf:
        'flex-end',

    },

  });

