import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { encryptionApi } from '@/services/api';

export default function DecryptionScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [outputFile, setOutputFile] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Validate file size (max 100MB)
        if (file.size && file.size > 100 * 1024 * 1024) {
          Alert.alert('Error', 'File is too large. Maximum size is 100MB');
          return;
        }

        setSelectedFile(file);
        setOutputFile(null);
        setPassword('');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        // User cancelled file picker
        return;
      }
      Alert.alert('Error', 'Failed to pick file. Please try again.');
      console.error('File picker error:', error);
    }
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

    try {
      setDecrypting(true);

      const response = await encryptionApi.decryptFile(selectedFile.uri, password);

      if (response.success && response.decryptedFile) {
        setOutputFile(response.decryptedFile);
        Alert.alert('Success', 'File decrypted successfully!');
      } else {
        Alert.alert('Error', 'Decryption failed. Wrong password or corrupted file.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Decryption failed');
      console.error(error);
    } finally {
      setDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (outputFile?.url) {
      Alert.alert('Success', 'Decrypted file is ready for download');
    }
  };

  const handleNewDecryption = () => {
    setSelectedFile(null);
    setOutputFile(null);
    setPassword('');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Decryption</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <Text style={styles.infoIcon}>🔓</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Decrypt your password-protected files
        </Text>
      </View>

      {!outputFile ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectFile}
          >
            <Text style={styles.uploadIcon}>🔐</Text>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? 'File Selected ✓' : 'Tap to select encrypted file'}
            </Text>
            {selectedFile && (
              <Text style={[styles.fileName, { color: colors.icon }]}>
                {selectedFile.name}
              </Text>
            )}
          </TouchableOpacity>

          {selectedFile && (
            <View style={[styles.fileInfoBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
              <Text style={[styles.fileInfoTitle, { color: colors.text }]}>File Details</Text>
              <View style={styles.fileInfoRow}>
                <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>Filename:</Text>
                <Text style={[styles.fileInfoValue, { color: colors.text }]}>{selectedFile.name}</Text>
              </View>
              <View style={styles.fileInfoRow}>
                <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>Size:</Text>
                <Text style={[styles.fileInfoValue, { color: colors.text }]}>
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              </View>
              <View style={styles.fileInfoRow}>
                <Text style={[styles.fileInfoLabel, { color: colors.icon }]}>Encryption:</Text>
                <Text style={[styles.fileInfoValue, { color: colors.text }]}>AES-256</Text>
              </View>
            </View>
          )}

          <View style={styles.passwordSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Enter Password</Text>

            <View style={[styles.passwordInputContainer, { borderColor: colors.tint + '50' }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter decryption password"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={selectedFile !== null}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.decryptButton,
              {
                backgroundColor: selectedFile && password.length > 0 ? colors.tint : colors.icon + '50',
                opacity: decrypting ? 0.7 : 1,
              },
            ]}
            onPress={handleDecrypt}
            disabled={!selectedFile || password.length === 0 || decrypting}
          >
            {decrypting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.decryptIcon}>🔓</Text>
                <Text style={styles.decryptButtonText}>
                  {selectedFile ? 'Decrypt File' : 'Select File First'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.notesBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
            <Text style={[styles.notesTitle, { color: colors.text }]}>⚠️ Important</Text>
            <Text style={[styles.noteItem, { color: colors.icon }]}>• Wrong password will fail decryption</Text>
            <Text style={[styles.noteItem, { color: colors.icon }]}>• Processing may take a few moments</Text>
            <Text style={[styles.noteItem, { color: colors.icon }]}>• Keep your password safe</Text>
            <Text style={[styles.noteItem, { color: colors.icon }]}>• File cannot be recovered if password is lost</Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.successBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '50' }]}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.successTitle, { color: colors.text }]}>Decryption Complete!</Text>
            <Text style={[styles.successDetails, { color: colors.icon }]}>
              File: {outputFile.filename}
            </Text>
            <Text style={[styles.successDetails, { color: colors.icon }]}>
              Size: {(outputFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.tint }]}
            onPress={handleDownload}
          >
            <Text style={styles.downloadIcon}>⬇️</Text>
            <Text style={styles.downloadButtonText}>Download Decrypted File</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newButton, { borderColor: colors.tint }]}
            onPress={handleNewDecryption}
          >
            <Text style={[styles.newButtonText, { color: colors.tint }]}>Decrypt Another</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 8 },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700' },
  infoBox: { borderRadius: 12, padding: 16, marginBottom: 24, alignItems: 'center', borderWidth: 1 },
  infoIcon: { fontSize: 32, marginBottom: 8 },
  infoText: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  uploadBox: { borderRadius: 12, padding: 24, marginBottom: 20, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  fileName: { fontSize: 12, marginTop: 8 },
  fileInfoBox: { borderRadius: 10, padding: 15, marginBottom: 20, borderWidth: 1 },
  fileInfoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  fileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  fileInfoLabel: { fontSize: 12, fontWeight: '500' },
  fileInfoValue: { fontSize: 12, fontWeight: '600' },
  passwordSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  passwordInputContainer: { borderRadius: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  eyeIcon: { fontSize: 18, padding: 8 },
  decryptButton: { borderRadius: 10, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  decryptIcon: { fontSize: 20, marginRight: 8 },
  decryptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  notesBox: { borderRadius: 10, padding: 16, borderWidth: 1 },
  notesTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  noteItem: { fontSize: 12, lineHeight: 18 },
  successBox: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 2 },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  successDetails: { fontSize: 13, marginTop: 4 },
  downloadButton: { borderRadius: 10, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  downloadIcon: { fontSize: 18, marginRight: 8 },
  downloadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  newButton: { borderRadius: 10, borderWidth: 2, padding: 14, alignItems: 'center' },
  newButtonText: { fontSize: 14, fontWeight: '600' },
});
