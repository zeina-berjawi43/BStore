import { Stack, router } from 'expo-router';
import { useEffect } from 'react';


export default function RootLayout() {
  return (
    <Stack
      initialRouteName="loading"
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}



