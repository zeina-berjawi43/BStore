import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Loading() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/loading-screen.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7ded1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});