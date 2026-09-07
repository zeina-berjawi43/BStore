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
              size={22}
              color="#171717"
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
              size={25}
              color="#E35B3F"
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

        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />

          <Text style={styles.sectionTitle}>
            Frequently Asked Questions
          </Text>
        </View>


        <View style={styles.card}>

          {/* ORDER */}

          <View style={styles.faqRow}>

            <View style={styles.faqIcon}>
              <Ionicons
                name="bag-handle-outline"
                size={21}
                color="#E35B3F"
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
                color="#E35B3F"
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
                color="#E35B3F"
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
                color="#E35B3F"
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

        <View style={styles.versionContainer}>

          <View style={styles.versionDot} />

          <Text style={styles.version}>
            BStore v1.0.0
          </Text>

        </View>

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
    backgroundColor: '#F7F3EC',
    paddingTop:20,
  },


  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 45,
  },


  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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


  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
    color: '#817B71',
  },


  /* ==========================================================
     INTRO
  ========================================================== */

  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },


  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    alignItems: 'center',
    justifyContent: 'center',
  },


  introTextContainer: {
    flex: 1,
    marginLeft: 13,
  },


  introTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.2,
  },


  introText: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: '#817B71',
  },


  /* ==========================================================
     SECTION
  ========================================================== */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    paddingLeft: 2,
  },


  sectionAccent: {
    width: 4,
    height: 21,
    borderRadius: 2,
    backgroundColor: '#E35B3F',
    marginRight: 9,
  },


  sectionTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.3,
  },


  /* ==========================================================
     FAQ CARD
  ========================================================== */

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',
    overflow: 'hidden',
    marginBottom: 10,

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },


  /* ==========================================================
     FAQ ROW
  ========================================================== */

  faqRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },


  faqIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    alignItems: 'center',
    justifyContent: 'center',
  },


  faqText: {
    flex: 1,
    marginLeft: 13,
    paddingTop: 1,
  },


  faqTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: '#24221E',
  },


  faqAnswer: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#817B71',
  },


  divider: {
    height: 1,
    backgroundColor: '#EEE4D7',
    marginLeft: 75,
  },


  /* ==========================================================
     VERSION
  ========================================================== */

  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },


  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 7,
  },


  version: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A9186',
  },

});

