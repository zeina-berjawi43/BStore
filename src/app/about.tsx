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
              size={23}
              color="#000000"
            />
          </Pressable>

          <Text style={styles.title}>
            About BStore
          </Text>

        </View>


        {/* VERSION */}
        <Text style={styles.version}>
          BStore v1.0.0
        </Text>


        {/* ABOUT */}
        <View style={styles.card}>

          <Text style={styles.heading}>
            About BStore
          </Text>

          <Text style={styles.text}>
            BStore is a simple and convenient
            shopping app where you can browse
            products, add items to your cart,
            and manage your orders.
          </Text>

        </View>


        {/* MISSION */}
        <View style={styles.card}>

          <Text style={styles.heading}>
            Our Mission
          </Text>

          <Text style={styles.text}>
            Our goal is to provide a simple,
            comfortable, and enjoyable shopping
            experience for everyone.
          </Text>

        </View>


        {/* APP INFORMATION */}
        <View style={styles.card}>

          <Text style={styles.heading}>
            App Information
          </Text>

          <Text style={styles.info}>
            Version: 1.0.0
          </Text>

          <Text style={styles.info}>
            Platform: Android
          </Text>

          <Text style={styles.info}>
            App: BStore
          </Text>

        </View>


        {/* FOOTER */}
        <Text style={styles.footer}>
          Thank you for using BStore ❤️
        </Text>

      </ScrollView>

    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    paddingTop: 30,
    flex: 1,
    backgroundColor: '#F7F7F7',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
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
    fontWeight: '800',
    color: '#000000',
  },

  /* VERSION */

  version: {
    marginLeft: 54,
    marginTop: 3,
    fontSize: 13,
    color: '#888888',
  },

  /* CARDS */

  card: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 10,
  },

  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555555',
  },

  info: {
    marginTop: 7,
    fontSize: 14,
    color: '#555555',
  },

  footer: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
    color: '#888888',
  },

});
