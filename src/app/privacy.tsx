import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Privacy() {
  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/settings')}
          >

            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />

          </Pressable>


          <View style={styles.headerText}>

            <Text style={styles.title}>
              Privacy Policy
            </Text>

            <Text style={styles.subtitle}>
              Last updated: August 2026
            </Text>

          </View>

        </View>


        {/* =================================================
            PRIVACY INTRO
        ================================================= */}

        <View style={styles.introCard}>

          <View style={styles.introIcon}>

            <Ionicons
              name="shield-checkmark-outline"
              size={25}
              color="#E35B3F"
            />

          </View>

          <View style={styles.introTextContainer}>

            <Text style={styles.introTitle}>
              Your Privacy Matters
            </Text>

            <Text style={styles.introText}>
              We respect your privacy and are committed
              to protecting your personal information.
            </Text>

          </View>

        </View>


        {/* =================================================
            YOUR PRIVACY
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              Your Privacy
            </Text>

          </View>

          <Text style={styles.text}>
            We respect your privacy
            and are committed to protecting your
            personal information.
          </Text>

        </View>


        {/* =================================================
            INFORMATION WE COLLECT
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              Information We Collect
            </Text>

          </View>

          <Text style={styles.text}>
            We may collect information such as
            your name, email address, phone number,
            shipping information, and order details
            when you use our app.
          </Text>

        </View>


        {/* =================================================
            HOW WE USE
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              How We Use Your Information
            </Text>

          </View>

          <Text style={styles.text}>
            Your information may be used to process
            orders, provide customer support, improve
            our services, and provide you with a
            better shopping experience.
          </Text>

        </View>


        {/* =================================================
            DATA PROTECTION
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              Data Protection
            </Text>

          </View>

          <Text style={styles.text}>
            We take reasonable steps to protect
            your personal information from
            unauthorized access, modification,
            or disclosure.
          </Text>

        </View>


        {/* =================================================
            YOUR RIGHTS
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              Your Rights
            </Text>

          </View>

          <Text style={styles.text}>
            You may request access to, correction
            of, or deletion of your personal
            information where applicable.
          </Text>

        </View>


        {/* =================================================
            CONTACT
        ================================================= */}

        <View style={styles.card}>

          <View style={styles.headingRow}>

            <View style={styles.headingAccent} />

            <Text style={styles.heading}>
              Contact Us
            </Text>

          </View>

          <Text style={styles.text}>
            If you have any questions about this
            Privacy Policy, please contact our
            support team.
          </Text>

        </View>


        {/* =================================================
            FOOTER
        ================================================= */}

        <View style={styles.footerContainer}>

          <View style={styles.footerDot} />

          <Text style={styles.footer}>
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