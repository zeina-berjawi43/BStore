import { useCallback } from 'react';
import { StartupScreen } from '../components/startup-screen';
import { router, useFocusEffect } from 'expo-router';

export default function Loading() {
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => {
      router.dismissTo('/');
    }, 1500);
    return () => clearTimeout(timer);
  }, []));

  return <StartupScreen />;
}
