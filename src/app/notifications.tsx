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
              color="#171717"
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
            SECTION TITLE
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View
            style={
              styles.sectionAccent
            }
          />

          <Text
            style={
              styles.sectionTitle
            }
          >
            Notification Preferences
          </Text>

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
              size={23}
              color="#E35B3F"
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


        {/* =================================================
            STATUS CARD
        ================================================= */}

        <View
          style={
            styles.statusCard
          }
        >

          <View
            style={
              styles.statusIcon
            }
          >

            <Ionicons
              name={
                notificationsEnabled
                  ? 'checkmark-circle-outline'
                  : 'notifications-off-outline'
              }
              size={21}
              color="#E35B3F"
            />

          </View>


          <View
            style={
              styles.statusTextContainer
            }
          >

            <Text
              style={
                styles.statusTitle
              }
            >
              {notificationsEnabled
                ? 'Notifications are enabled'
                : 'Notifications are disabled'}
            </Text>


            <Text
              style={
                styles.statusSubtitle
              }
            >
              {notificationsEnabled
                ? 'Stay updated with important updates from BStore.'
                : 'You can turn them back on anytime.'}
            </Text>

          </View>

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

    // ===================================================
    // CONTAINER
    // ===================================================

    container: {

      flex: 1,
      paddingTop:20,
      backgroundColor:
        '#F7F3EC',

    },


    scrollContent: {

      paddingHorizontal:
        18,

      paddingTop:
        18,

      paddingBottom:
        40,

    },


    // ===================================================
    // HEADER
    // ===================================================

    header: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        22,

    },


    backButton: {

      width:
        46,

      height:
        46,

      borderRadius:
        16,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        13,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        8,

      elevation:
        2,

    },


    headerText: {

      flex: 1,

    },


    title: {

      fontSize:
        29,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.8,

    },


    subtitle: {

      marginTop:
        4,

      fontSize:
        13,

      fontWeight:
        '600',

      color:
        '#817B71',

    },


    // ===================================================
    // SECTION HEADER
    // ===================================================

    sectionHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        12,

    },


    sectionAccent: {

      width:
        4,

      height:
        20,

      borderRadius:
        2,

      backgroundColor:
        '#E35B3F',

      marginRight:
        9,

    },


    sectionTitle: {

      fontSize:
        19,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.3,

    },


    // ===================================================
    // NOTIFICATION CARD
    // ===================================================

    card: {

      minHeight:
        86,

      paddingHorizontal:
        14,

      paddingVertical:
        14,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        21,

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      flexDirection:
        'row',

      alignItems:
        'center',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        9,

      elevation:
        2,

    },


    // ===================================================
    // ICON
    // ===================================================

    iconContainer: {

      width:
        46,

      height:
        46,

      borderRadius:
        15,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    // ===================================================
    // TEXT
    // ===================================================

    textContainer: {

      flex: 1,

      marginLeft:
        13,

      marginRight:
        10,

    },


    rowTitle: {

      fontSize:
        15,

      fontWeight:
        '800',

      color:
        '#24221E',

    },


    rowSubtitle: {

      marginTop:
        5,

      fontSize:
        12,

      lineHeight:
        17,

      fontWeight:
        '600',

      color:
        '#817B71',

    },


    // ===================================================
    // SWITCH
    // ===================================================

    switch: {

      width:
        52,

      height:
        30,

      borderRadius:
        15,

      backgroundColor:
        '#D8D2CA',

      justifyContent:
        'center',

      paddingHorizontal:
        3,

    },


    switchActive: {

      backgroundColor:
        '#E35B3F',

    },


    switchCircle: {

      width:
        24,

      height:
        24,

      borderRadius:
        12,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        3,

      elevation:
        2,

    },


    switchCircleActive: {

      alignSelf:
        'flex-end',

    },


    // ===================================================
    // STATUS CARD
    // ===================================================

    statusCard: {

      marginTop:
        13,

      padding:
        14,

      backgroundColor:
        '#FFF7F3',

      borderRadius:
        18,

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      flexDirection:
        'row',

      alignItems:
        'center',

    },


    statusIcon: {

      width:
        42,

      height:
        42,

      borderRadius:
        14,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    statusTextContainer: {

      flex: 1,

      marginLeft:
        12,

    },


    statusTitle: {

      fontSize:
        13,

      fontWeight:
        '800',

      color:
        '#24221E',

    },


    statusSubtitle: {

      marginTop:
        4,

      fontSize:
        11.5,

      lineHeight:
        17,

      fontWeight:
        '600',

      color:
        '#817B71',

    },

  });

