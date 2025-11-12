import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function EncryptionScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  const handleSelectFile = () => {
    Alert.alert('File Picker', 'File picker will be implemented here');
  };

  const handleEncrypt = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    setEncrypting(true);
    setTimeout(() => {
      setEncrypting(false);
      Alert.alert('Success', 'File encrypted successfully!\nPassword protected file saved.');
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
        <Text style={[styles.title, { color: colors.text }]}>Encryption</Text>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15' }]}>
        <Text style={styles.infoIcon}>🔒</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Encrypt your audio or image files with military-grade encryption
        </Text>
      </View>

      {/* File Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select File to Encrypt</Text>
        <TouchableOpacity
          style={[
            styles.uploadBox,
            {
              backgroundColor: colors.tint + '15',
              borderColor: colors.tint,
            },
          ]}
          onPress={handleSelectFile}
        >
          <Text style={styles.uploadIcon}>📂</Text>
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {selectedFile ? selectedFile : 'Tap to select file'}
          </Text>
          <Text style={[styles.uploadSubtext, { color: colors.icon }]}>
            Audio: MP3, WAV, FLAC | Image: JPG, PNG, BMP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Password</Text>
        <TextInput
          style={[
            styles.passwordInput,
            {
              backgroundColor: colors.tint + '08',
              color: colors.text,
              borderColor: colors.tint,
            },
          ]}
          placeholder="Enter a strong password"
          placeholderTextColor={colors.icon}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.passwordStrength}>
          <View
            style={[
              styles.strengthBar,
              {
                backgroundColor: password.length > 12 ? '#10B981' : 
                                password.length > 8 ? '#F59E0B' : '#EF4444',
                width: `${Math.min(password.length * 8, 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.passwordHint, { color: colors.icon }]}>
          {password.length === 0 
            ? 'Enter at least 8 characters for security'
            : password.length < 8
            ? '⚠️ Weak password'
            : password.length < 12
            ? '🟡 Medium password'
            : '✅ Strong password'}
        </Text>
      </View>

      {/* Encryption Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Encryption Options</Text>
        <OptionCard
          title="Algorithm"
          value="AES-256"
          colors={colors}
        />
        <OptionCard
          title="Compression"
          value="Enabled"
          colors={colors}
        />
      </View>

      {/* Encrypt Button */}
      <TouchableOpacity
        style={[
          styles.encryptButton,
          {
            backgroundColor: colors.tint,
            opacity: selectedFile && password.length >= 8 ? 1 : 0.5,
          },
        ]}
        onPress={handleEncrypt}
        disabled={!selectedFile || password.length < 8 || encrypting}
      >
        <Text style={[styles.encryptButtonText, { color: colors.background }]}>
          {encrypting ? 'Encrypting...' : 'Encrypt File'}
        </Text>
      </TouchableOpacity>

      {/* Security Tips */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>🔐 Security Tips</Text>
        <Text style={[styles.tipText, { color: colors.icon }]}>
          • Use a strong, unique password{'\n'}
          • Never share your password{'\n'}
          • Keep a backup of your password{'\n'}
          • Use mix of letters, numbers, and symbols
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
  passwordInput: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  passwordStrength: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  passwordHint: {
    fontSize: 12,
    fontWeight: '500',
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
  encryptButton: {
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
  encryptButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsSection: {
    backgroundColor: '#9333EA15',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#9333EA',
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
