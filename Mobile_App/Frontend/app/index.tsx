import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Redirect to the appropriate starting route
  return <Redirect href="/splash" />;
}
