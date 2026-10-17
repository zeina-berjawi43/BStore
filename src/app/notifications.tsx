import { notificationPreference } from '../services/notification-preference';
import { goBackOrSettings } from '../services/navigation';
import { syncPush, PushState } from '../services/pushService';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  AppState,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';




import { useEffect, useRef, useState, useSyncExternalStore } from 'react';


// =========================================================
// NOTIFICATIONS
// =========================================================

export default function Notifications() {
  const [deviceState, setDeviceState] = useState<PushState | 'error'>('disabled');
  const preference = useSyncExternalStore(notificationPreference.subscribe, notificationPreference.getSnapshot, notificationPreference.getSnapshot);
  const notificationsEnabled = preference.value;
  const busy = preference.loading || preference.saving;
  const loadFailed = !preference.loaded && !!preference.error;
  const savingRef = useRef(false);
  const observedSave = useRef(preference.savedVersion);
  const loadNotificationSetting = notificationPreference.load;
  const toggleNotifications = notificationPreference.toggle;
  useEffect(() => {
    void notificationPreference.load();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void notificationPreference.load(); });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!preference.loaded || preference.saving) return;
    let active = true;
    const ask = observedSave.current !== preference.savedVersion && preference.confirmed;
    observedSave.current = preference.savedVersion;
    void syncPush(ask, ask, preference.confirmed).then(state => { if (active) setDeviceState(state); }).catch(() => { if (active) setDeviceState('error'); });
    return () => { active = false; };
  }, [preference.confirmed, preference.loaded, preference.savedVersion, preference.saving]);

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
            onPress={goBackOrSettings}
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
              {Platform.OS === 'web' ? 'Account preference for notifications in the Android app' : 'Manage your notifications'}
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
              {Platform.OS === 'web' ? (notificationsEnabled ? 'Enabled for your Android devices' : 'Account notifications are turned off') : notificationsEnabled
                ? (deviceState === 'ready' ? 'This device is registered' : 'Device setup needs attention')
                : 'Notifications are turned off'}
            </Text>

          </View>


          <Pressable
            accessibilityRole="switch"
            aria-checked={notificationsEnabled}
            accessibilityState={{ checked: notificationsEnabled, disabled: false }}
            accessibilityLabel="Notifications"
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
              {Platform.OS === 'web' ? 'Account notification preference' : notificationsEnabled
                ? (deviceState === 'ready' ? 'Notifications are enabled' : 'Notifications need setup')
                : 'Notifications are disabled'}
            </Text>


            <Text
              style={
                styles.statusSubtitle
              }
            >
              {Platform.OS === 'web' ? 'This setting controls Android notifications. This browser does not receive push notifications.' : notificationsEnabled
                ? (deviceState === 'ready' ? 'Receive offers and order updates from BStore.' : 'Check phone permissions and retry device registration below.')
                : 'You can turn them back on anytime.'}
            </Text>

          </View>

        </View>

        {Platform.OS !== 'web' && <Pressable disabled={busy} onPress={() => {
          if (savingRef.current) return;
          if (deviceState === 'denied') { void Linking.openSettings(); return; }
          savingRef.current = true;
          void syncPush(true).then(setDeviceState).catch(error => {
            setDeviceState('error'); Alert.alert('Notifications', error.message);
          }).finally(() => { savingRef.current = false; });
        }} style={{ padding: 20 }}>
          <Text>{deviceState === 'denied' ? 'Open phone settings' : 'Retry device registration'}</Text>
        </Pressable>}
        {!!preference.error && <Text accessibilityRole="alert" style={{ color: '#B53522', paddingHorizontal: 20 }}>{preference.error}</Text>}
        {loadFailed && <Pressable onPress={() => { void loadNotificationSetting(); }} style={{ padding: 20 }}>
          <Text>Retry loading settings</Text>
        </Pressable>}
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
