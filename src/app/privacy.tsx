import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const SUPPORT_EMAIL = 'b.storelb@gmail.com';

export default function Privacy() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Back to settings"
          >
            <Ionicons name="arrow-back" size={22} color="#171717" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.subtitle}>Last updated: September 21, 2026</Text>
          </View>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={25}
              color="#E35B3F"
            />
          </View>
          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>Your Privacy Matters</Text>
            <Text style={styles.introText}>
              This policy explains how BStore uses account and order information,
              and what happens when you delete your account.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Information We Collect</Text>
          </View>
          <Text style={styles.text}>
            When you use BStore, we collect information needed for your account
            and orders, including your name, phone number, delivery address,
            optional email address, and order details. We also process login
            verification information and device notification information when
            applicable.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>How We Use Information</Text>
          </View>
          <Text style={styles.text}>
            We use this information to manage your account, verify login
            requests, process and deliver orders, provide customer support,
            create invoices, and send notifications when enabled.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Account Deletion</Text>
          </View>
          <Text style={styles.text}>
            You can request deletion of your BStore account using the Delete
            Account option in your account screen. You will be asked to confirm
            your choice. If you have an active order (Pending, Confirmed,
            Preparing, or Shipped), account deletion is blocked until the order
            is no longer active. Contact us if you need assistance.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>What Deletion Removes</Text>
          </View>
          <Text style={styles.text}>
            When account deletion succeeds, BStore deletes your customer
            account, cart, favorites, login sessions, and associated push
            notification device and delivery records. Historical orders are
            detached from the deleted account, and their shipping address is
            cleared.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Historical Orders and Invoices</Text>
          </View>
          <Text style={styles.text}>
            Deleting your account does not automatically delete historical
            orders or invoices. Invoices may still contain customer details
            recorded when they were created, such as a name, phone number,
            email address, or address. These invoice details are not erased by
            the account deletion action.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Data Retention</Text>
          </View>
          <Text style={styles.text}>
            We retain personal information for as long as necessary to provide
            our services and meet applicable legal, accounting, and legitimate
            business requirements.
            {'\n\n'}
            Invoices and related accounting records are retained for 10 years
            from the end of the year to which they relate, in accordance with
            applicable Lebanese tax and accounting requirements.
            {'\n\n'}
            If you delete your account, historical invoices and related
            transaction records may remain for the applicable retention period.
            These records may contain customer details recorded at the time
            of the transaction.
            {'\n\n'}
            When the applicable retention period expires, personal information
            will be deleted or anonymized unless further retention is required
            by law.
            {'\n\n'}
            You may contact us for information about retained records
            associated with your account.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Data Protection</Text>
          </View>
          <Text style={styles.text}>
            We take reasonable steps to protect personal information from
            unauthorized access, modification, and disclosure.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Your Requests</Text>
          </View>
          <Text style={styles.text}>
            You can contact us to ask about your information or request
            access, correction, or deletion where applicable. Account
            deletion does not automatically remove historical invoice details.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>Contact Us</Text>
          </View>
          <Text style={styles.text}>
            For privacy questions, account deletion assistance, or questions
            about retained invoice information, email us at:
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Text style={[styles.text, { color: '#E35B3F', marginTop: 8 }]}>
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerContainer}>
          <View style={styles.footerDot} />
          <Text style={styles.footer}>BStore v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // CONTAINER
  // =======================================================

  container: {

    flex: 1,
    paddingTop:20,
    backgroundColor:
      '#F7F3EC',

  },


  content: {

    paddingHorizontal: 18,

    paddingTop: 18,

    paddingBottom: 45,

  },


  // =======================================================
  // HEADER
  // =======================================================

  header: {

    flexDirection:
      'row',

    alignItems:
      'center',

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

    marginTop: 4,

    fontSize: 12,

    fontWeight:
      '600',

    color:
      '#817B71',

  },


  // =======================================================
  // INTRO CARD
  // =======================================================

  introCard: {

    flexDirection:
      'row',

    alignItems:
      'center',

    backgroundColor:
      '#FFF7F3',

    borderRadius: 20,

    borderWidth: 1,

    borderColor:
      '#F0CFC4',

    padding: 16,

    marginBottom: 3,

  },


  introIcon: {

    width: 52,

    height: 52,

    borderRadius: 17,

    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#F0CFC4',

    alignItems:
      'center',

    justifyContent:
      'center',

  },


  introTextContainer: {

    flex: 1,

    marginLeft: 13,

  },


  introTitle: {

    fontSize: 16,

    fontWeight:
      '900',

    color:
      '#24221E',

    marginBottom: 4,

  },


  introText: {

    fontSize: 12,

    lineHeight: 18,

    fontWeight:
      '500',

    color:
      '#817B71',

  },


  // =======================================================
  // CONTENT CARDS
  // =======================================================

  card: {

    marginTop: 15,

    padding: 18,

    backgroundColor:
      '#FFFFFF',

    borderRadius: 21,

    borderWidth: 1,

    borderColor:
      '#E7DED1',

    shadowColor:
      '#171717',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.06,

    shadowRadius: 9,

    elevation: 2,

  },


  // =======================================================
  // HEADING
  // =======================================================

  headingRow: {

    flexDirection:
      'row',

    alignItems:
      'center',

    marginBottom: 10,

  },


  headingAccent: {

    width: 4,

    height: 20,

    borderRadius: 3,

    backgroundColor:
      '#E35B3F',

    marginRight: 9,

  },


  heading: {

    flex: 1,

    fontSize: 17,

    fontWeight:
      '900',

    color:
      '#24221E',

    letterSpacing:
      -0.2,

  },


  // =======================================================
  // TEXT
  // =======================================================

  text: {

    fontSize: 14,

    lineHeight: 22,

    fontWeight:
      '500',

    color:
      '#777168',

  },


  // =======================================================
  // FOOTER
  // =======================================================

  footerContainer: {

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    marginTop: 30,

  },


  footerDot: {

    width: 5,

    height: 5,

    borderRadius: 3,

    backgroundColor:
      '#E35B3F',

    marginRight: 7,

    opacity: 0.75,

  },


  footer: {

    fontSize: 12,

    fontWeight:
      '600',

    color:
      '#9A9186',

    letterSpacing:
      0.2,

  },

});