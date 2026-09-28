import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BSTORE_SUPPORT_EMAIL, BSTORE_WHATSAPP_NUMBER } from '../constants/contact';

export default function ContactUs() {
  const [error, setError] = useState('');

  async function openWhatsApp() {
    setError('');
    if (!/^[1-9]\d{6,14}$/.test(BSTORE_WHATSAPP_NUMBER)) {
      setError('WhatsApp is currently unavailable. Please contact us by email.');
      return;
    }
    const message = encodeURIComponent('Hello, I’m contacting you from BStore.');
    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(`whatsapp://send?phone=${BSTORE_WHATSAPP_NUMBER}&text=${message}`);
        return;
      } catch {
        // If the app is unavailable, use WhatsApp's HTTPS link.
      }
    }
    try {
      await Linking.openURL(`https://wa.me/${BSTORE_WHATSAPP_NUMBER}?text=${message}`);
    } catch {
      setError('Unable to open WhatsApp. Please try again or contact us by email.');
    }
  }

  async function openEmail() {
    setError('');
    try {
      await Linking.openURL(`mailto:${BSTORE_SUPPORT_EMAIL}?subject=${encodeURIComponent('BStore Support')}&body=${encodeURIComponent('Hello BStore Support,')}`);
    } catch {
      setError(`Unable to open your email app. You can email us at ${BSTORE_SUPPORT_EMAIL}.`);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}>
            <Ionicons name="arrow-back" size={22} color="#171717" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Contact Us</Text>
            <Text style={styles.subtitle}>Get in touch with BStore</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Pressable style={styles.row} accessibilityRole="link" accessibilityLabel="Chat with BStore on WhatsApp" onPress={openWhatsApp}>
            <View style={styles.iconContainer}>
              <Ionicons name="logo-whatsapp" size={22} color="#E35B3F" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>WhatsApp</Text>
              <Text style={styles.rowSubtitle}>Chat with us on WhatsApp</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={18} color="#817B71" />
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} accessibilityRole="link" accessibilityLabel={`Email ${BSTORE_SUPPORT_EMAIL}`} onPress={openEmail}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={22} color="#E35B3F" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Email</Text>
              <Text selectable style={styles.rowSubtitle}>{BSTORE_SUPPORT_EMAIL}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={18} color="#817B71" />
            </View>
          </Pressable>
        </View>
        {!!error && <Text selectable accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20, backgroundColor: '#F7F3EC' },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 45 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E7DED1', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    shadowColor: '#171717', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  headerText: { flex: 1 },
  title: { fontSize: 29, fontWeight: '900', color: '#171717', letterSpacing: -0.8 },
  subtitle: { marginTop: 3, fontSize: 13, fontWeight: '500', color: '#817B71' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 21, borderWidth: 1, borderColor: '#E7DED1', overflow: 'hidden',
    shadowColor: '#171717', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 9, elevation: 2,
  },
  row: { minHeight: 84, paddingHorizontal: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFF7F3', borderWidth: 1,
    borderColor: '#F0CFC4', alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, marginLeft: 13, paddingRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#24221E', letterSpacing: -0.1 },
  rowSubtitle: { marginTop: 4, fontSize: 12, fontWeight: '500', color: '#817B71' },
  chevronContainer: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F8F2EA', alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#EEE4D7', marginLeft: 73, marginRight: 14 },
  error: { marginTop: 16, fontSize: 13, lineHeight: 19, color: '#A33324' },
});
