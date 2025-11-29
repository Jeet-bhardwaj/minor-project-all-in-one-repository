import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { audioImageApi } from '@/services/api';

export default function ImageToAudioScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [outputFile, setOutputFile] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [masterKey, setMasterKey] = useState('');

  // Load saved credentials from AsyncStorage
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedUserId = await AsyncStorage.getItem('lastUsedUserId');
      const savedMasterKey = await AsyncStorage.getItem('lastUsedMasterKey');
      
      if (savedUserId) setUserId(savedUserId);
      if (savedMasterKey) setMasterKey(savedMasterKey);
    } catch (error) {
      console.error('Failed to load saved credentials:', error);
    }
  };

  const handleSelectImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/zip',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Validate file size (max 500MB as per API)
        if (file.size && file.size > 500 * 1024 * 1024) {
          Alert.alert('Error', 'ZIP file is too large. Maximum size is 500MB');
          return;
        }

        setSelectedFile(file);
        setOutputFile(null);
      }
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        // User cancelled file picker
        return;
      }
      Alert.alert('Error', 'Failed to pick ZIP file. Please try again.');
      console.error('File picker error:', error);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a ZIP file first');
      return;
    }

    // Validate User ID
    if (!userId || userId.trim().length === 0) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }

    // Validate Master Key (must be 64 hex characters)
    if (!masterKey || !/^[0-9a-fA-F]{64}$/.test(masterKey)) {
      Alert.alert(
        'Error',
        'Master Key must be exactly 64 hexadecimal characters.\n\nExample:\na7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567'
      );
      return;
    }

    try {
      setConverting(true);

      // Call Vercel API to decode image to audio
      const audioBlob = await audioImageApi.decodeImageToAudio(
        selectedFile.uri,
        userId.trim(),
        masterKey.trim()
      );

      // Save the audio file to local storage
      const outputFilename = 'decoded_audio_' + Date.now() + '.mp3';
      const outputPath = `${FileSystem.documentDirectory}${outputFilename}`;
      
      // Convert blob to base64 and save
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1]; // Remove data:audio/mpeg;base64, prefix
        
        await FileSystem.writeAsStringAsync(outputPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileInfo = await FileSystem.getInfoAsync(outputPath);
        
        setOutputFile({
          path: outputPath,
          filename: outputFilename,
          size: (fileInfo as any).size || 0,
        });

        Alert.alert('Success', 'Audio decoded successfully!');
      };
      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Decode error:', error);
      let errorMessage = 'Decoding failed. ';
      
      if (error.response?.status === 400) {
        errorMessage += 'Please verify your User ID and Master Key match the ones used during encoding.';
      } else if (error.response?.status === 401) {
        errorMessage += 'API authentication failed.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async () => {
    if (outputFile?.path) {
      try {
        // Share the audio file
        const { Sharing } = await import('expo-sharing');
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(outputFile.path);
        } else {
          Alert.alert('Success', `Audio file saved at: ${outputFile.path}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to share audio file');
      }
    }
  };

  const handleNewConversion = () => {
    setSelectedFile(null);
    setOutputFile(null);
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
        <Text style={[styles.title, { color: colors.text }]}>Image to Audio</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <Text style={styles.infoIcon}>🖼️➜🎵</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Decode encrypted PNG images back to original audio. Upload the ZIP file from "Audio to Image" conversion.
        </Text>
      </View>

      {!outputFile ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectImage}
          >
            <Text style={styles.uploadIcon}>📦</Text>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? 'ZIP File Selected ✓' : 'Tap to select encrypted ZIP file'}
            </Text>
            {selectedFile && (
              <Text style={[styles.fileName, { color: colors.icon }]}>
                {selectedFile.name}
              </Text>
            )}
          </TouchableOpacity>

          {selectedFile && (
            <>
              {/* User ID Input */}
              <View style={[styles.inputContainer, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>User ID</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.tint + '30' }]}
                  value={userId}
                  onChangeText={setUserId}
                  placeholder="Enter User ID (same as encoding)"
                  placeholderTextColor={colors.icon + '80'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.inputHint, { color: colors.icon }]}>
                  Must match the User ID used during encoding
                </Text>
              </View>

              {/* Master Key Input */}
              <View style={[styles.inputContainer, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Master Key</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.tint + '30' }]}
                  value={masterKey}
                  onChangeText={setMasterKey}
                  placeholder="Enter 64-character hex master key"
                  placeholderTextColor={colors.icon + '80'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}
                  multiline
                />
                <Text style={[styles.inputHint, { color: colors.icon }]}>
                  Must match the Master Key used during encoding (64 hex characters)
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.convertButton,
              {
                backgroundColor: selectedFile && userId && masterKey ? colors.tint : colors.icon + '50',
                opacity: converting ? 0.7 : 1,
              },
            ]}
            onPress={handleConvert}
            disabled={!selectedFile || !userId || !masterKey || converting}
          >
            {converting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.convertIcon}>🔓</Text>
                <Text style={styles.convertButtonText}>
                  {selectedFile && userId && masterKey ? 'Decode to Audio' : 'Fill All Fields'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.tipsBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Tips</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Upload the ZIP file from "Audio to Image" tab</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Use the same User ID and Master Key</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Decryption requires matching credentials</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Output will be the original audio file</Text>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.successBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '50' }]}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.successTitle, { color: colors.text }]}>Conversion Complete!</Text>
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
            <Text style={styles.downloadButtonText}>Download Audio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newButton, { borderColor: colors.tint }]}
            onPress={handleNewConversion}
          >
            <Text style={[styles.newButtonText, { color: colors.tint }]}>Convert Another</Text>
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
  inputContainer: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 48 },
  inputHint: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  convertButton: { borderRadius: 10, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  convertIcon: { fontSize: 20, marginRight: 8 },
  convertButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
