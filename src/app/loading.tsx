import { Redirect } from 'expo-router';

// Keep old links working without delaying access to the catalogue.
export default function Loading() {
  return <Redirect href="/" />;
}
