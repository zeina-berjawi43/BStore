
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';


// =========================================================
// SETTINGS
// =========================================================

export default function Settings() {

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
              router.push('/')
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
              Settings
            </Text>


            <Text
              style={
                styles.subtitle
              }
            >
             Manage your preferences
            </Text>

          </View>

        </View>


        {/* =================================================
            APP
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          App
        </Text>


        <View
          style={
            styles.card
          }
        >

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <Pressable
            style={
              styles.row
            }
            onPress={() =>
              router.push(
                '/notifications'
              )
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
                styles.rowText
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
                Manage notifications
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />

          </Pressable>

        </View>


        {/* =================================================
            SUPPORT
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Support
        </Text>


        <View
          style={
            styles.card
          }
        >

          {/* =================================================
              HELP
          ================================================= */}

          <Pressable
            style={
              styles.row
            }
            onPress={() =>
              router.push(
                '/help'
              )
            }
          >

            <View
              style={
                styles.iconContainer
              }
            >

              <Ionicons
                name="help-circle-outline"
                size={22}
                color="#D4AF37"
              />

            </View>


            <View
              style={
                styles.rowText
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                Help & Support
              </Text>


              <Text
                style={
                  styles.rowSubtitle
                }
              >
                Get help and support
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />

          </Pressable>


          <View
            style={
              styles.divider
            }
          />


          {/* =================================================
              PRIVACY
          ================================================= */}

          <Pressable
            style={
              styles.row
            }
            onPress={() =>
              router.push(
                '/privacy'
              )
            }
          >

            <View
              style={
                styles.iconContainer
              }
            >

              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#D4AF37"
              />

            </View>


            <View
              style={
                styles.rowText
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                Privacy Policy
              </Text>


              <Text
                style={
                  styles.rowSubtitle
                }
              >
                How we protect your data
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />

          </Pressable>


          <View
            style={
              styles.divider
            }
          />


          {/* =================================================
              ABOUT
          ================================================= */}

          <Pressable
            style={
              styles.row
            }
            onPress={() =>
              router.push(
                '/about'
              )
            }
          >

            <View
              style={
                styles.iconContainer
              }
            >

              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#D4AF37"
              />

            </View>


            <View
              style={
                styles.rowText
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                About
              </Text>


              <Text
                style={
                  styles.rowSubtitle
                }
              >
                App information
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={20}
              color="#B0B0B0"
            />

          </Pressable>

        </View>


        {/* =================================================
            VERSION
        ================================================= */}

        <Text
          style={
            styles.version
          }
        >
          BStore v1.0.0
        </Text>

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


    scrollContent: {

      paddingHorizontal: 20,

      paddingTop: 18,

      paddingBottom: 40,

    },


    /* =====================================================
       HEADER
    ===================================================== */

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


    /* =====================================================
       SECTION
    ===================================================== */

    sectionTitle: {

      marginTop: 25,

      marginBottom: 10,

      fontSize: 15,

      fontWeight:
        '700',

      color:
        '#1A1A1A',

    },


    /* =====================================================
       CARD
    ===================================================== */

    card: {

      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      overflow:
        'hidden',

    },


    /* =====================================================
       ROW
    ===================================================== */

    row: {

      minHeight: 78,

      paddingHorizontal: 15,

      flexDirection:
        'row',

      alignItems:
        'center',

    },


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


    rowText: {

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

      marginTop: 4,

      fontSize: 12,

      color:
        '#888888',

    },


    divider: {

      height: 1,

      backgroundColor:
        '#E0E0E0',

      marginLeft: 69,

    },


    /* =====================================================
       VERSION
    ===================================================== */

    version: {

      textAlign:
        'center',

      marginTop: 30,

      marginBottom: 10,

      fontSize: 13,

      color:
        '#AAAAAA',

    },

  });
