import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

export default function Help() {

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.header}>

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />

          </Pressable>


          <View style={styles.headerText}>

            <Text style={styles.title}>
              Help & Support
            </Text>

            <Text style={styles.subtitle}>
              We're here to help you
            </Text>

          </View>

        </View>


        {/* ====================================================
            INTRO
        ==================================================== */}

        <View style={styles.introCard}>

          <View style={styles.introIcon}>

            <Ionicons
              name="help-circle-outline"
              size={28}
              color="#D4AF37"
            />

          </View>


          <View style={styles.introTextContainer}>

            <Text style={styles.introTitle}>
              How can we help?
            </Text>

            <Text style={styles.introText}>
              Find answers to common questions or
              explore the information below if you
              need further assistance.
            </Text>

          </View>

        </View>


        {/* ====================================================
            FREQUENTLY ASKED QUESTIONS
        ==================================================== */}

        <Text style={styles.sectionTitle}>
          Frequently Asked Questions
        </Text>


        <View style={styles.card}>

          {/* ORDER */}

          <View style={styles.faqRow}>

            <View style={styles.faqIcon}>

              <Ionicons
                name="bag-handle-outline"
                size={21}
                color="#D4AF37"
              />

            </View>


            <View style={styles.faqText}>

              <Text style={styles.faqTitle}>
                How can I place an order?
              </Text>

              <Text style={styles.faqAnswer}>
                Browse our products, add the items
                you want to your cart, then continue
                to checkout to complete your order.
              </Text>

            </View>

          </View>


          <View style={styles.divider} />


          {/* CART */}

          <View style={styles.faqRow}>

            <View style={styles.faqIcon}>

              <Ionicons
                name="cart-outline"
                size={21}
                color="#D4AF37"
              />

            </View>


            <View style={styles.faqText}>

              <Text style={styles.faqTitle}>
                How can I change my cart?
              </Text>

              <Text style={styles.faqAnswer}>
                Open your cart to increase or decrease
                product quantities or remove products
                before checkout.
              </Text>

            </View>

          </View>


          <View style={styles.divider} />


          {/* DELIVERY */}

          <View style={styles.faqRow}>

            <View style={styles.faqIcon}>

              <Ionicons
                name="car-outline"
                size={21}
                color="#D4AF37"
              />

            </View>


            <View style={styles.faqText}>

              <Text style={styles.faqTitle}>
                How does delivery work?
              </Text>

              <Text style={styles.faqAnswer}>
                After placing your order, our team
                will process it and arrange delivery
                to the address provided at checkout.
              </Text>

            </View>

          </View>


          <View style={styles.divider} />


          {/* PAYMENT */}

          <View style={styles.faqRow}>

            <View style={styles.faqIcon}>

              <Ionicons
                name="card-outline"
                size={21}
                color="#D4AF37"
              />

            </View>


            <View style={styles.faqText}>

              <Text style={styles.faqTitle}>
                What payment methods are available?
              </Text>

              <Text style={styles.faqAnswer}>
                Available payment methods will be
                shown during the checkout process.
              </Text>

            </View>

          </View>

        </View>


        {/* ====================================================
            VERSION
        ==================================================== */}

        <Text style={styles.version}>
          BStore v1.0.0
        </Text>

      </ScrollView>

    </View>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
     CONTAINER
  ========================================================== */

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


  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
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


  /* ==========================================================
     INTRO
  ========================================================== */

  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },


  introIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },


  introTextContainer: {
    flex: 1,
    marginLeft: 13,
  },


  introTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },


  introText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#777777',
  },


  /* ==========================================================
     SECTION
  ========================================================== */

  sectionTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },


  /* ==========================================================
     CARD
  ========================================================== */

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    marginBottom: 25,
  },


  /* ==========================================================
     FAQ
  ========================================================== */

  faqRow: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },


  faqIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },


  faqText: {
    flex: 1,
    marginLeft: 12,
  },


  faqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },


  faqAnswer: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#888888',
  },


  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 69,
  },


  /* ==========================================================
     VERSION
  ========================================================== */

  version: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 12,
    color: '#AAAAAA',
  },

});
