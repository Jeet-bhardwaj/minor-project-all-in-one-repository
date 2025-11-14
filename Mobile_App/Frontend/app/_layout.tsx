import { DarkTheme, DefaultTheme, ThemeProvider } from '@/node_modules/@react-navigation/native/lib/typescript/src';
import { Stack } from 'expo-router';
import { StatusBar } from '@/node_modules/expo-status-bar/build/StatusBar';
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
      <Stack>
        {isSignedIn ? (
          <>
            <Stack.Screen 
              name="(tabs)" 
              options={{ headerShown: false }} 
            />
          </>
        ) : (
          <>
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
