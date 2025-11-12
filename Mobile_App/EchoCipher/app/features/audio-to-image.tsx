import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function AudioToImageScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const handleSelectAudio = () => {
    // TODO: Implement file picker
    Alert.alert('File Picker', 'Audio file picker will be implemented here');
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }
    setConverting(true);
    // TODO: Implement conversion logic
    setTimeout(() => {
      setConverting(false);
      Alert.alert('Success', 'Audio converted to image successfully!');
    }, 2000);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.tint }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Audio to Image</Text>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15' }]}>
        <Text style={styles.infoIcon}>🎵➜🖼️</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Convert your audio files into beautiful visual representations
        </Text>
      </View>

      {/* File Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Audio File</Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            {
              backgroundColor: colors.tint + '15',
              borderColor: colors.tint,
            },
          ]}
          onPress={handleSelectAudio}
        >
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {selectedFile ? selectedFile : 'Tap to select audio file'}
          </Text>
          <Text style={[styles.uploadSubtext, { color: colors.icon }]}>
            Supported: MP3, WAV, FLAC, AAC
          </Text>
        </TouchableOpacity>
      </View>

      {/* Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Conversion Settings</Text>
        <OptionCard
          title="Resolution"
          value="High"
          colors={colors}
        />
        <OptionCard
          title="Color Scheme"
          value="Vibrant"
          colors={colors}
        />
        <OptionCard
          title="Output Format"
          value="PNG"
          colors={colors}
        />
      </View>

      {/* Convert Button */}
      <TouchableOpacity
        style={[
          styles.convertButton,
          {
            backgroundColor: colors.tint,
            opacity: selectedFile ? 1 : 0.5,
          },
        ]}
        onPress={handleConvert}
        disabled={!selectedFile || converting}
      >
        <Text style={[styles.convertButtonText, { color: colors.background }]}>
          {converting ? 'Converting...' : 'Convert to Image'}
        </Text>
      </TouchableOpacity>

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Tips</Text>
        <Text style={[styles.tipText, { color: colors.icon }]}>
          • Choose higher resolution for more detail{'\n'}
          • Vibrant colors make better visual representations{'\n'}
          • Large audio files may take longer to process
        </Text>
      </View>
    </ScrollView>
  );
}

interface OptionCardProps {
  title: string;
  value: string;
  colors: any;
}

function OptionCard({ title, value, colors }: OptionCardProps) {
  return (
    <View
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.tint + '08',
          borderColor: colors.tint + '30',
        },
      ]}
    >
      <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.optionValue, { color: colors.tint }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  infoIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  uploadBox: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  optionCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  convertButton: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  convertButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsSection: {
    backgroundColor: '#FFD93D15',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD93D',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
});
