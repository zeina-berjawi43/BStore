
import { Stack } from 'expo-router';

export default function RootLayout() {
  // ==========================================================
  // ROUTER
  // ==========================================================

  return (
    <Stack
      initialRouteName="loading"
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}