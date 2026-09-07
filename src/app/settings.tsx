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
            App
          </Text>

        </View>


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
                color="#E35B3F"
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


            <View
              style={
                styles.chevronContainer
              }
            >

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

          </Pressable>

        </View>


        {/* =================================================
            SUPPORT
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
            Support
          </Text>

        </View>


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
                color="#E35B3F"
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


            <View
              style={
                styles.chevronContainer
              }
            >

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

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
                color="#E35B3F"
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


            <View
              style={
                styles.chevronContainer
              }
            >

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

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
                color="#E35B3F"
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


            <View
              style={
                styles.chevronContainer
              }
            >

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#817B71"
              />

            </View>

          </Pressable>

        </View>


        {/* =================================================
            VERSION
        ================================================= */}

        <View
          style={
            styles.versionContainer
          }
        >

          <View
            style={
              styles.versionDot
            }
          />

          <Text
            style={
              styles.version
            }
          >
            BStore v1.0.0
          </Text>

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

    // =====================================================
    // CONTAINER
    // =====================================================

    container: {

      flex: 1,
      paddingTop:20,
      backgroundColor:
        '#F7F3EC',

    },


    scrollContent: {

      paddingHorizontal: 18,

      paddingTop: 18,

      paddingBottom: 45,

    },


    // =====================================================
    // HEADER
    // =====================================================

    header: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 2,

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

      alignItems:
        'center',

      justifyContent:
        'center',

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

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.8,

    },


    subtitle: {

      marginTop: 3,

      fontSize: 13,

      fontWeight:
        '500',

      color:
        '#817B71',

    },


    // =====================================================
    // SECTION HEADER
    // =====================================================

    sectionHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop: 25,

      marginBottom: 11,

      paddingLeft: 2,

    },


    sectionAccent: {

      width: 4,

      height: 21,

      borderRadius: 3,

      backgroundColor:
        '#E35B3F',

      marginRight: 9,

    },


    sectionTitle: {

      fontSize: 20,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.3,

    },


    // =====================================================
    // CARD
    // =====================================================

    card: {

      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      overflow:
        'hidden',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,

      shadowRadius: 9,

      elevation: 2,

    },


    // =====================================================
    // ROW
    // =====================================================

    row: {

      minHeight: 84,

      paddingHorizontal: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

    },


    // =====================================================
    // ICON CONTAINER
    // =====================================================

    iconContainer: {

      width: 46,

      height: 46,

      borderRadius: 15,

      backgroundColor:
        '#FFF7F3',

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    // =====================================================
    // TEXT
    // =====================================================

    rowText: {

      flex: 1,

      marginLeft: 13,

      paddingRight: 8,

    },


    rowTitle: {

      fontSize: 15,

      fontWeight:
        '800',

      color:
        '#24221E',

      letterSpacing:
        -0.1,

    },


    rowSubtitle: {

      marginTop: 4,

      fontSize: 12,

      fontWeight:
        '500',

      color:
        '#817B71',

    },


    // =====================================================
    // CHEVRON
    // =====================================================

    chevronContainer: {

      width: 32,

      height: 32,

      borderRadius: 11,

      backgroundColor:
        '#F8F2EA',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    // =====================================================
    // DIVIDER
    // =====================================================

    divider: {

      height: 1,

      backgroundColor:
        '#EEE4D7',

      marginLeft: 73,

      marginRight: 14,

    },


    // =====================================================
    // VERSION
    // =====================================================

    versionContainer: {

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop: 30,

    },


    versionDot: {

      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        '#E35B3F',

      marginRight: 7,

      opacity: 0.75,

    },


    version: {

      fontSize: 12,

      fontWeight:
        '600',

      color:
        '#9A9186',

      letterSpacing:
        0.2,

    },

  });