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

        {/* HEADER */}

        <View style={styles.header}>

          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />
          </Pressable>

          <Text style={styles.title}>
            Privacy Policy
          </Text>

        </View>

        {/* UPDATED */}

        <Text style={styles.updated}>
          Last updated: August 2026
        </Text>

        {/* YOUR PRIVACY */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            Your Privacy
          </Text>

          <Text style={styles.text}>
            We respect your privacy
            and are committed to protecting your
            personal information.
          </Text>
        </View>

        {/* INFORMATION WE COLLECT */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            Information We Collect
          </Text>

          <Text style={styles.text}>
            We may collect information such as
            your name, email address, phone number,
            shipping information, and order details
            when you use our app.
          </Text>
        </View>

        {/* HOW WE USE */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            How We Use Your Information
          </Text>

          <Text style={styles.text}>
            Your information may be used to process
            orders, provide customer support, improve
            our services, and provide you with a
            better shopping experience.
          </Text>
        </View>

        {/* DATA PROTECTION */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            Data Protection
          </Text>

          <Text style={styles.text}>
            We take reasonable steps to protect
            your personal information from
            unauthorized access, modification,
            or disclosure.
          </Text>
        </View>

        {/* YOUR RIGHTS */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            Your Rights
          </Text>

          <Text style={styles.text}>
            You may request access to, correction
            of, or deletion of your personal
            information where applicable.
          </Text>
        </View>

        {/* CONTACT */}

        <View style={styles.card}>
          <Text style={styles.heading}>
            Contact Us
          </Text>

          <Text style={styles.text}>
            If you have any questions about this
            Privacy Policy, please contact our
           support team.
          </Text>
        </View>

        {/* FOOTER */}

        <Text style={styles.footer}>
          BStore v1.0.0
        </Text>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFFCF8',
    paddingTop:20,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },

  /* UPDATED */

  updated: {
    marginLeft: 54,
    fontSize: 13,
    color: '#A3948A',
  },

  /* CARDS */

  card: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E4DA',
  },

  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5A3A2A',
    marginBottom: 10,
  },

  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7A6A60',
  },

  /* FOOTER */

  footer: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13,
    color: '#C9A894',
  },

});
