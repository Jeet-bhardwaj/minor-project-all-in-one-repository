import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function DecryptionScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  const handleSelectFile = () => {
    Alert.alert('File Picker', 'Encrypted file picker will be implemented here');
  };

  const handleDecrypt = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an encrypted file first');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter the password');
      return;
    }
    setDecrypting(true);
    setTimeout(() => {
      setDecrypting(false);
      Alert.alert('Success', 'File decrypted successfully!\nYour file is now accessible.');
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
        <Text style={[styles.title, { color: colors.text }]}>Decryption</Text>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15' }]}>
        <Text style={styles.infoIcon}>🔓</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Decrypt your password-protected audio and image files
        </Text>
      </View>

      {/* File Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Encrypted File</Text>
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
          <Text style={styles.uploadIcon}>🔐</Text>
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {selectedFile ? selectedFile : 'Tap to select encrypted file'}
          </Text>
          <Text style={[styles.uploadSubtext, { color: colors.icon }]}>
            Files encrypted with EchoCipher
          </Text>
        </TouchableOpacity>
      </View>

      {/* File Info */}
      {selectedFile && (
        <View style={[styles.fileInfoBox, { backgroundColor: colors.tint + '08' }]}>
          <Text style={[styles.fileInfoTitle, { color: colors.text }]}>File Details</Text>
          <View style={styles.fileInfoRow}>
            <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>File Type:</Text>
            <Text style={[styles.fileInfoValue, { color: colors.text }]}>Encrypted Audio/Image</Text>
          </View>
          <View style={styles.fileInfoRow}>
            <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>Size:</Text>
            <Text style={[styles.fileInfoValue, { color: colors.text }]}>2.5 MB</Text>
          </View>
          <View style={styles.fileInfoRow}>
            <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>Encryption:</Text>
            <Text style={[styles.fileInfoValue, { color: colors.text }]}>AES-256</Text>
          </View>
        </View>
      )}

      {/* Password Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Enter Password</Text>
        <TextInput
          style={[
            styles.passwordInput,
            {
              backgroundColor: colors.tint + '08',
              color: colors.text,
              borderColor: colors.tint,
            },
          ]}
          placeholder="Enter decryption password"
          placeholderTextColor={colors.icon}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Decryption Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Options</Text>
        <OptionCard
          title="Auto Extract"
          value="Yes"
          colors={colors}
        />
        <OptionCard
          title="Delete Original"
          value="No"
          colors={colors}
        />
      </View>

      {/* Decrypt Button */}
      <TouchableOpacity
        style={[
          styles.decryptButton,
          {
            backgroundColor: colors.tint,
            opacity: selectedFile && password.length > 0 ? 1 : 0.5,
          },
        ]}
        onPress={handleDecrypt}
        disabled={!selectedFile || password.length === 0 || decrypting}
      >
        <Text style={[styles.decryptButtonText, { color: colors.background }]}>
          {decrypting ? 'Decrypting...' : 'Decrypt File'}
        </Text>
      </TouchableOpacity>

      {/* Important Notes */}
      <View style={styles.notesSection}>
        <Text style={[styles.notesTitle, { color: colors.text }]}>⚠️ Important</Text>
        <Text style={[styles.noteText, { color: colors.icon }]}>
          • Incorrect password will fail to decrypt{'\n'}
          • Processing may take a few moments{'\n'}
          • Decrypted files are saved to your device{'\n'}
          • Keep your password safe
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
  fileInfoBox: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  fileInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  fileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fileInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileInfoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  passwordInput: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
  decryptButton: {
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
  decryptButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  notesSection: {
    backgroundColor: '#EC4C4515',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#EC4C45',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
});
