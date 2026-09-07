
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function About() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />
          </Pressable>

          <View style={styles.headerText}>
            

            <Text style={styles.title}>
              About BStore
            </Text>
          </View>
        </View>


        {/* VERSION */}
        <View style={styles.versionRow}>
          <View style={styles.versionDot} />

          <Text style={styles.version}>
            BStore v1.0.0
          </Text>
        </View>


        {/* ABOUT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="storefront-outline"
                size={22}
                color="#E35B3F"
              />
            </View>

            <Text style={styles.heading}>
              About BStore
            </Text>
          </View>

          <Text style={styles.text}>
            BStore is a simple and convenient
            shopping app where you can browse
            products, add items to your cart,
            and manage your orders.
          </Text>
        </View>


        {/* MISSION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="heart-outline"
                size={22}
                color="#E35B3F"
              />
            </View>

            <Text style={styles.heading}>
              Our Mission
            </Text>
          </View>

          <Text style={styles.text}>
            Our goal is to provide a simple,
            comfortable, and enjoyable shopping
            experience for everyone.
          </Text>
        </View>


        {/* APP INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#E35B3F"
              />
            </View>

            <Text style={styles.heading}>
              App Information
            </Text>
          </View>

          <View style={styles.infoList}>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Version
              </Text>

              <Text style={styles.infoValue}>
                1.0.0
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Platform
              </Text>

              <Text style={styles.infoValue}>
                Android
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                App
              </Text>

              <Text style={styles.infoValue}>
                BStore
              </Text>
            </View>

          </View>
        </View>


        {/* FOOTER */}
        <View style={styles.footerContainer}>
          <View style={styles.footerIcon}>
            <Ionicons
              name="heart"
              size={17}
              color="#E35B3F"
            />
          </View>

          <Text style={styles.footer}>
            Thank you for using BStore
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({

  /* =====================================================
     PAGE
  ===================================================== */

  container: {
    flex: 1,
    backgroundColor: '#F7F3EC',
    paddingTop:20,
  },

  content: {
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
    marginBottom: 12,
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


  /* =====================================================
     VERSION
  ===================================================== */

  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 58,
    marginBottom: 7,
  },

  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 7,
  },

  version: {
    fontSize: 13,
    fontWeight: '600',
    color: '#817B71',
  },


  /* =====================================================
     CARDS
  ===================================================== */

  card: {
    marginTop: 14,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  heading: {
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.3,
  },

  text: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: '#817B71',
  },


  /* =====================================================
     APP INFORMATION
  ===================================================== */

  infoList: {
    marginTop: 2,
  },

  infoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#817B71',
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24221E',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEE4D7',
  },


  /* =====================================================
     FOOTER
  ===================================================== */

  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 27,
  },

  footerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  footer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#817B71',
  },

});

