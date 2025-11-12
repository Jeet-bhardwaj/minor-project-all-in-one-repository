import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';

const { width } = Dimensions.get('window');
const cardWidth = (width - 50) / 2; // Two columns with padding

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [pressedCard, setPressedCard] = useState<string | null>(null);

  const features = [
    {
      id: 'audio-to-image',
      title: 'Audio to Image',
      icon: '🎵➜🖼️',
      description: 'Convert audio files to images',
      gradient: ['#FF6B6B', '#FF8E72'],
      route: '/audio-to-image',
    },
    {
      id: 'image-to-audio',
      title: 'Image to Audio',
      icon: '🖼️➜🎵',
      description: 'Convert images to audio',
      gradient: ['#4ECDC4', '#44A08D'],
      route: '/image-to-audio',
    },
    {
      id: 'encrypt',
      title: 'Encryption',
      icon: '🔒',
      description: 'Encrypt audio or image',
      gradient: ['#667EEA', '#764BA2'],
      route: '/encryption',
    },
    {
      id: 'decrypt',
      title: 'Decryption',
      icon: '🔓',
      description: 'Decrypt encrypted files',
      gradient: ['#F093FB', '#F5576C'],
      route: '/decryption',
    },
  ];

  const handleCardPress = (featureId: string, route: string) => {
    setPressedCard(featureId);
    setTimeout(() => {
      setPressedCard(null);
      // Navigate to the feature screen
      // router.push(route); // Uncomment when screens are ready
    }, 100);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Welcome Back! 👋
        </Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Choose an operation to get started
        </Text>
      </View>

      {/* Features Grid */}
      <View style={styles.gridContainer}>
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            colors={colors}
            isPressed={pressedCard === feature.id}
            onPress={() => handleCardPress(feature.id, feature.route)}
          />
        ))}
      </View>

      {/* Quick Info Section */}
      <View style={styles.infoSection}>
        <InfoBox
          icon="⚡"
          title="Fast & Secure"
          description="Lightning-fast processing with military-grade encryption"
          colors={colors}
        />
        <InfoBox
          icon="�"
          title="Privacy First"
          description="Your files are processed locally. Nothing is stored on servers"
          colors={colors}
        />
        <InfoBox
          icon="🚀"
          title="Easy to Use"
          description="Simple interface with powerful features"
          colors={colors}
        />
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomSection}>
        <Text style={[styles.versionText, { color: colors.icon }]}>
          EchoCipher v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

interface FeatureCardProps {
  feature: {
    id: string;
    title: string;
    icon: string;
    description: string;
    gradient: string[];
  };
  colors: any;
  isPressed: boolean;
  onPress: () => void;
}

function FeatureCard({ feature, colors, isPressed, onPress }: FeatureCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: cardWidth,
          transform: [{ scale: isPressed ? 0.95 : 1 }],
          backgroundColor: feature.gradient[0] + '20',
          borderColor: feature.gradient[0],
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Gradient Background Effect */}
      <View
        style={[
          styles.cardBackground,
          {
            backgroundColor: feature.gradient[0],
            opacity: 0.1,
          },
        ]}
      />

      {/* Icon */}
      <Text style={styles.cardIcon}>{feature.icon}</Text>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {feature.title}
      </Text>

      {/* Description */}
      <Text style={[styles.cardDescription, { color: colors.icon }]}>
        {feature.description}
      </Text>

      {/* Arrow Icon */}
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

interface InfoBoxProps {
  icon: string;
  title: string;
  description: string;
  colors: any;
}

function InfoBox({ icon, title, description, colors }: InfoBoxProps) {
  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor: colors.tint + '15',
          borderLeftColor: colors.tint,
        },
      ]}
    >
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.infoDescription, { color: colors.icon }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 30,
    marginTop: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Grid Container
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },

  // Feature Card
  card: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    position: 'relative',
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginBottom: 12,
  },
  arrowContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  arrow: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Info Section
  infoSection: {
    marginBottom: 20,
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Bottom Section
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
