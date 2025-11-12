import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  useEffect(() => {
    // Auto-navigate after 5 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Logo/Icon Area */}
      <View style={styles.logoContainer}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: colors.tint },
          ]}
        >
          <Text style={styles.logoText}>🎵</Text>
        </View>
      </View>

      {/* App Name */}
      <Text
        style={[
          styles.appName,
          { color: colors.text },
        ]}
      >
        EchoCipher
      </Text>

      {/* Welcome Message */}
      <Text
        style={[
          styles.welcomeMessage,
          { color: colors.icon },
        ]}
      >
        Welcome to EchoCipher
      </Text>

      {/* Tagline */}
      <Text
        style={[
          styles.tagline,
          { color: colors.tabIconDefault },
        ]}
      >
        Secure Audio & Image Encryption
      </Text>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <View
          style={[
            styles.loadingDot,
            { backgroundColor: colors.tint },
          ]}
        />
        <View
          style={[
            styles.loadingDot,
            { backgroundColor: colors.tint },
            { marginHorizontal: 8 },
          ]}
        />
        <View
          style={[
            styles.loadingDot,
            { backgroundColor: colors.tint },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoText: {
    fontSize: 50,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 50,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
