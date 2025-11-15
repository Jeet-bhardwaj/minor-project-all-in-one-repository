import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return null; // Show splash while checking auth state
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {isSignedIn ? (
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />
        ) : (
          <>
            <Stack.Screen 
              name="index"
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="splash" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="auth/welcome" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="auth/login" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="auth/register" 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
