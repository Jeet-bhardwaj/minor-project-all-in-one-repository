import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleRegister = () => {
    router.push('/auth/register');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Gradient Effect */}
      <View style={styles.gradientOverlay} />

      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>🎵</Text>
        <Text style={[styles.appName, { color: colors.text }]}>EchoCipher</Text>
        <Text style={[styles.tagline, { color: colors.icon }]}>
          Secure Audio & Image Encryption
        </Text>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresContainer}>
        <FeatureRow
          icon="🎵"
          title="Audio to Image"
          description="Convert audio to visual art"
          colors={colors}
        />
        <FeatureRow
          icon="🖼️"
          title="Image to Audio"
          description="Transform images to sound"
          colors={colors}
        />
        <FeatureRow
          icon="🔒"
          title="Encryption"
          description="Protect your files with AES-256"
          colors={colors}
        />
      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.registerButton, { backgroundColor: colors.background, borderColor: colors.tint, borderWidth: 2 }]}
          onPress={handleRegister}
        >
          <Text style={[styles.registerButtonText, { color: colors.tint }]}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.tint }]}
          onPress={handleLogin}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        <Text style={[styles.termsText, { color: colors.icon }]}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
  colors: any;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ icon, title, description, colors }) => (
  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureTextContainer}>
      <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: colors.icon }]}>
        {description}
      </Text>
    </View>
    <Text style={[styles.featureArrow, { color: colors.tint }]}>›</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    opacity: 0.03,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  featuresContainer: {
    marginVertical: 30,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
  },
  featureArrow: {
    fontSize: 16,
    marginLeft: 8,
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  registerButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
