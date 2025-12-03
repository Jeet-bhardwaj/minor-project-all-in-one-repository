import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to welcome if not signed in
  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace('/auth/welcome');
    }
  }, [isSignedIn, isLoading]);

  if (isLoading || !isSignedIn) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="audio-to-image-tab"
        options={{
          title: 'Audio→Image',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="image-to-audio-tab"
        options={{
          title: 'Image→Audio',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lock.open.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
