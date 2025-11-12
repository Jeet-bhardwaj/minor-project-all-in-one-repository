import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          🎵 EchoCipher
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Secure Audio & Image Encryption
        </Text>
      </View>

      {/* Features Section */}
      <View style={styles.featuresContainer}>
        <FeatureCard
          icon="🔒"
          title="Audio Encryption"
          description="Encrypt your audio files with advanced security"
          colors={colors}
        />
        <FeatureCard
          icon="🖼️"
          title="Image Encryption"
          description="Secure your images with military-grade encryption"
          colors={colors}
        />
        <FeatureCard
          icon="⚡"
          title="Fast Processing"
          description="Lightning-fast encryption and decryption"
          colors={colors}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Start Encrypting
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.tint }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            Learn More
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ icon, title, description, colors }: any) {
  return (
    <View style={[styles.card, { backgroundColor: colors.tint + '15' }]}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardDescription, { color: colors.icon }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  featuresContainer: {
    marginBottom: 30,
    gap: 15,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  secondaryButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
