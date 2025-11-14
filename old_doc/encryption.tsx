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

export default function EncryptionScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [outputFile, setOutputFile] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        setConfirmPassword('');
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

  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, text: 'Enter password', color: '#EF4444' };
    if (password.length < 8) return { level: 33, text: '⚠️ Weak', color: '#EF4444' };
    if (password.length < 12) return { level: 66, text: '🟡 Medium', color: '#F59E0B' };
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    if (hasNumbers && hasSpecial) return { level: 100, text: '✅ Strong', color: '#10B981' };
    return { level: 75, text: '🟡 Good', color: '#F59E0B' };
  };

  const handleEncrypt = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setEncrypting(true);

      const response = await encryptionApi.encryptFile(selectedFile.uri, password);

      if (response.success && response.encryptedFile) {
        setOutputFile(response.encryptedFile);
        Alert.alert('Success', 'File encrypted successfully!');
      } else {
        Alert.alert('Error', 'Encryption failed. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Encryption failed');
      console.error(error);
    } finally {
      setEncrypting(false);
    }
  };

  const handleDownload = () => {
    if (outputFile?.url) {
      Alert.alert('Success', 'Encrypted file is ready for download');
    }
  };

  const handleNewEncryption = () => {
    setSelectedFile(null);
    setOutputFile(null);
    setPassword('');
    setConfirmPassword('');
  };

  const strength = getPasswordStrength();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Encryption</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <Text style={styles.infoIcon}>🔒</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Encrypt files with AES-256 military-grade encryption
        </Text>
      </View>

      {!outputFile ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectFile}
          >
            <Text style={styles.uploadIcon}>📂</Text>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? 'File Selected ✓' : 'Tap to select file'}
            </Text>
            {selectedFile && (
              <Text style={[styles.fileName, { color: colors.icon }]}>
                {selectedFile.name}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.passwordSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Password</Text>

            <View style={[styles.passwordInputContainer, { borderColor: colors.tint + '50' }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter password"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.strengthContainer, { backgroundColor: colors.tint + '15' }]}>
              <View style={[styles.strengthBar, { backgroundColor: '#E5E7EB' }]}>
                <View
                  style={[
                    styles.strengthFill,
                    { width: `${strength.level}%`, backgroundColor: strength.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>{strength.text}</Text>
            </View>

            <View style={[styles.passwordInputContainer, { borderColor: colors.tint + '50' }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.eyeIcon}>{showConfirm ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            {confirmPassword && password !== confirmPassword && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>Passwords do not match</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.encryptButton,
              {
                backgroundColor:
                  selectedFile && password.length >= 8 && password === confirmPassword
                    ? colors.tint
                    : colors.icon + '50',
                opacity: encrypting ? 0.7 : 1,
              },
            ]}
            onPress={handleEncrypt}
            disabled={!selectedFile || password.length < 8 || password !== confirmPassword || encrypting}
          >
            {encrypting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.encryptIcon}>🔐</Text>
                <Text style={styles.encryptButtonText}>Encrypt File</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.tipsBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>🔐 Security Tips</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Use a unique password</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Mix letters, numbers & symbols</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Keep password in safe place</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Encrypted file cannot be recovered without password</Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.successBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '50' }]}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.successTitle, { color: colors.text }]}>Encryption Complete!</Text>
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
            <Text style={styles.downloadButtonText}>Download Encrypted File</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newButton, { borderColor: colors.tint }]}
            onPress={handleNewEncryption}
          >
            <Text style={[styles.newButtonText, { color: colors.tint }]}>Encrypt Another</Text>
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
  passwordSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  passwordInputContainer: { borderRadius: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  eyeIcon: { fontSize: 18, padding: 8 },
  strengthContainer: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  strengthBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthText: { fontSize: 12, fontWeight: '600' },
  errorText: { fontSize: 12, marginTop: -8, marginBottom: 8 },
  encryptButton: { borderRadius: 10, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  encryptIcon: { fontSize: 20, marginRight: 8 },
  encryptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tipsBox: { borderRadius: 10, padding: 16, borderWidth: 1 },
  tipsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  tipItem: { fontSize: 12, lineHeight: 18 },
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
