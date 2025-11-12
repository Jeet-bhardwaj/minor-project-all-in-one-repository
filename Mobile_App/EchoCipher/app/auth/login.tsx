import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { signInWithGoogle, isSignedIn } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: '(tabs)' }],
      });
    }
  }, [isSignedIn]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // This will be integrated with actual Google OAuth flow
      // For now, mock data for testing
      const mockGoogleData = {
        id: '123456789',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://via.placeholder.com/200',
      };
      
      await signInWithGoogle(mockGoogleData);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Text style={[styles.logo, { color: colors.tint }]}>🎵</Text>
        <Text style={[styles.appName, { color: colors.text }]}>EchoCipher</Text>
        <Text style={[styles.tagline, { color: colors.icon }]}>
          Convert, Encrypt, Transform
        </Text>
      </View>

      {/* Welcome Text */}
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Welcome Back
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.icon }]}>
          Sign in to access all features
        </Text>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresContainer}>
        <FeatureItem
          icon="🎵"
          title="Audio to Image"
          description="Convert your audio to stunning images"
          colors={colors}
        />
        <FeatureItem
          icon="🖼️"
          title="Image to Audio"
          description="Transform images back to audio"
          colors={colors}
        />
        <FeatureItem
          icon="🔒"
          title="Encrypt & Decrypt"
          description="Secure your files with AES-256"
          colors={colors}
        />
      </View>

      {/* Sign In Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.tint }]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.googleButtonIcon}>🔐</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.termsText, { color: colors.icon }]}>
          By signing in, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  colors: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, colors }) => (
  <View style={[styles.featureItem, { borderColor: colors.tint + '20' }]}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.featureDescription, { color: colors.icon }]}>
      {description}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    fontSize: 60,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  welcomeContainer: {
    marginVertical: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
  },
  featuresContainer: {
    marginVertical: 20,
  },
  featureItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  googleButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
