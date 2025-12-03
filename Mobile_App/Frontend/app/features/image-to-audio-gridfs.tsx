import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { gridfsApi, UserConversion } from '@/services/api';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

export default function ImageToAudioGridFSScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [conversions, setConversions] = useState<UserConversion[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [decodingId, setDecodingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Manual upload mode state
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [selectedZipFile, setSelectedZipFile] = useState<any>(null);
  const [manualUserId, setManualUserId] = useState('');
  const [manualMasterKey, setManualMasterKey] = useState('');
  const [manualDecoding, setManualDecoding] = useState(false);

  useEffect(() => {
    loadUserId();
    
    // Cleanup sound on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (userId) {
      loadConversions();
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      const savedUserId = await AsyncStorage.getItem('lastUsedUserId');
      if (savedUserId) {
        setUserId(savedUserId);
      }
    } catch (error) {
      console.error('Failed to load userId:', error);
    }
  };

  const loadConversions = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await gridfsApi.getUserConversions(userId);
      setConversions(response.conversions);
    } catch (error: any) {
      console.error('Failed to load conversions:', error);
      Alert.alert('Error', 'Failed to load conversions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversions();
    setRefreshing(false);
  };

  const handleDecode = async (conversion: UserConversion) => {
    try {
      setDecodingId(conversion.conversionId);

      console.log('🎵 Decoding conversion:', {
        conversionId: conversion.conversionId,
        userId: userId,
        originalFileName: conversion.originalFileName
      });

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please restart the app.');
        return;
      }

      // Call GridFS API to decode
      const audioBlob = await gridfsApi.imageToAudio(userId, conversion.conversionId);

      // Save to local file system
      const outputFilename = `decoded_${conversion.originalFileName}`;
      const outputPath = `${FileSystem.documentDirectory}${outputFilename}`;

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];

        await FileSystem.writeAsStringAsync(outputPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ Audio saved to:', outputPath);

        // Offer to share or play
        Alert.alert(
          'Success!',
          'Audio decoded successfully',
          [
            {
              text: 'Play',
              onPress: () => playAudio(outputPath),
            },
            {
              text: 'Share',
              onPress: () => shareAudio(outputPath),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      };

      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Decode error:', error);
      Alert.alert(
        'Decode Failed',
        error.response?.data?.message || error.message || 'Failed to decode audio'
      );
    } finally {
      setDecodingId(null);
    }
  };

  const playAudio = async (audioPath: string) => {
    try {
      // Stop current sound if playing
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true }
      );

      setSound(newSound);

      // Auto-cleanup when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const shareAudio = async (audioPath: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(audioPath);
      } else {
        Alert.alert('Success', `Audio saved at: ${audioPath}`);
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share audio');
    }
  };

  const handlePickZipFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/zip',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedZipFile(file);
        Alert.alert('✅ File Selected', `${file.name}\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick ZIP file');
    }
  };

  const handleManualDecode = async () => {
    if (!selectedZipFile) {
      Alert.alert('⚠️ No File', 'Please select a ZIP file first');
      return;
    }

    if (!manualUserId.trim()) {
      Alert.alert('⚠️ Missing User ID', 'Please enter your User ID');
      return;
    }

    if (!manualMasterKey.trim()) {
      Alert.alert('⚠️ Missing Master Key', 'Please enter your Master Key');
      return;
    }

    if (manualMasterKey.length !== 64) {
      Alert.alert('⚠️ Invalid Key', 'Master Key must be exactly 64 characters (hex)');
      return;
    }

    try {
      setManualDecoding(true);

      console.log('🎵 Manual decoding with:', {
        file: selectedZipFile.name,
        userId: manualUserId,
        keyLength: manualMasterKey.length,
      });

      // Call FastAPI directly with manual inputs
      const baseUrl = 'https://minor-project-all-in-one-repository.vercel.app';
      const formData = new FormData();

      // Read ZIP file
      const fileContent = await FileSystem.readAsStringAsync(selectedZipFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const blob = await fetch(`data:application/zip;base64,${fileContent}`).then(res => res.blob());

      formData.append('encrypted_zip', blob, selectedZipFile.name);
      formData.append('user_id', manualUserId);
      formData.append('master_key', manualMasterKey);
      formData.append('output_filename', selectedZipFile.name.replace('.zip', '.wav'));

      console.log('📤 Sending to FastAPI...');

      const response = await fetch(`${baseUrl}/api/v1/decode`, {
        method: 'POST',
        headers: {
          'X-API-Key': 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Decoding failed: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log('✅ Audio decoded:', audioBlob.size, 'bytes');

      // Save to local file system
      const outputFilename = `decoded_manual_${Date.now()}.wav`;
      const outputPath = `${FileSystem.documentDirectory}${outputFilename}`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];

        await FileSystem.writeAsStringAsync(outputPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ Audio saved to:', outputPath);

        Alert.alert(
          '✅ Decoding Complete!',
          'Audio decoded successfully from your ZIP file',
          [
            {
              text: 'Play',
              onPress: () => playAudio(outputPath),
            },
            {
              text: 'Share',
              onPress: () => shareAudio(outputPath),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      };

      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('❌ Manual decode error:', error);
      Alert.alert(
        '⚠️ Decoding Failed',
        error.message || 'Failed to decode audio. Please check your User ID and Master Key.'
      );
    } finally {
      setManualDecoding(false);
    }
  };

  const handleDelete = async (conversion: UserConversion) => {
    Alert.alert(
      'Delete Conversion',
      `Are you sure you want to delete "${conversion.originalFileName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await gridfsApi.deleteConversion(userId, conversion.conversionId);
              Alert.alert('Deleted', 'Conversion deleted successfully');
              loadConversions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversion');
            }
          },
        },
      ]
    );
  };

  const renderConversionItem = (conversion: UserConversion) => {
    const isDecoding = decodingId === conversion.conversionId;

    return (
      <View
        key={conversion.conversionId}
        style={[styles.conversionCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
      >
        <View style={styles.conversionHeader}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
            {conversion.originalFileName}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.icon }]}>
            {conversion.createdAgo}
          </Text>
        </View>

        <View style={styles.conversionDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.icon }]}>Format:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {conversion.audioFormat.toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.icon }]}>Images:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {conversion.numImages} PNG files
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.icon }]}>Size:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {conversion.fileSizeReadable}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.icon }]}>Compressed:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {conversion.compressed ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        <View style={styles.conversionActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.decodeButton, { backgroundColor: colors.tint }]}
            onPress={() => handleDecode(conversion)}
            disabled={isDecoding}
          >
            {isDecoding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.actionButtonText}>🎵 Decode</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(conversion)}
            disabled={isDecoding}
          >
            <Text style={[styles.actionButtonText, { color: '#ff4444' }]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f0f4ff', '#e8f0ff']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.tint }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>My Conversions</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <Text style={styles.infoIcon}>🖼️➜🎵</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          {showManualUpload 
            ? 'Upload your own ZIP file with User ID and Master Key'
            : 'Select a conversion to decode back to audio. All conversions are securely stored in the cloud.'}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            !showManualUpload && styles.modeButtonActive,
            !showManualUpload && { backgroundColor: colors.tint },
          ]}
          onPress={() => setShowManualUpload(false)}
        >
          <Text style={[styles.modeButtonText, !showManualUpload && styles.modeButtonTextActive]}>
            📂 Database
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            showManualUpload && styles.modeButtonActive,
            showManualUpload && { backgroundColor: colors.tint },
          ]}
          onPress={() => setShowManualUpload(true)}
        >
          <Text style={[styles.modeButtonText, showManualUpload && styles.modeButtonTextActive]}>
            📁 Manual Upload
          </Text>
        </TouchableOpacity>
      </View>

      {/* Manual Upload Section */}
      {showManualUpload && (
        <View style={[styles.manualUploadContainer, { backgroundColor: colors.tint + '08' }]}>
          <View style={styles.manualUploadContent}>
            {/* ZIP File Picker */}
            <TouchableOpacity
              style={[styles.filePickerButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '40' }]}
              onPress={handlePickZipFile}
            >
              <Text style={[styles.filePickerIcon]}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.filePickerLabel, { color: colors.text }]}>
                  {selectedZipFile ? selectedZipFile.name : 'Select ZIP File'}
                </Text>
                {selectedZipFile && (
                  <Text style={[styles.filePickerSize, { color: colors.icon }]}>
                    {(selectedZipFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
              </View>
              <Text style={[styles.filePickerArrow, { color: colors.tint }]}>›</Text>
            </TouchableOpacity>

            {/* User ID Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>User ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.tint + '10', color: colors.text, borderColor: colors.tint + '30' }]}
                placeholder="Enter User ID"
                placeholderTextColor={colors.icon}
                value={manualUserId}
                onChangeText={setManualUserId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Master Key Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Master Key (64 characters)</Text>
              <TextInput
                style={[styles.input, styles.keyInput, { backgroundColor: colors.tint + '10', color: colors.text, borderColor: colors.tint + '30' }]}
                placeholder="Enter 64-character hexadecimal Master Key"
                placeholderTextColor={colors.icon}
                value={manualMasterKey}
                onChangeText={setManualMasterKey}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={2}
              />
              <Text style={[styles.keyHelper, { color: colors.icon }]}>
                {manualMasterKey.length}/64 characters
              </Text>
            </View>

            {/* Decode Button */}
            <TouchableOpacity
              style={[
                styles.manualDecodeButton,
                { backgroundColor: colors.tint },
                (!selectedZipFile || !manualUserId || !manualMasterKey || manualDecoding) && styles.disabledButton,
              ]}
              onPress={handleManualDecode}
              disabled={!selectedZipFile || !manualUserId || !manualMasterKey || manualDecoding}
            >
              {manualDecoding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.manualDecodeButtonText}>🎵 Decode Audio</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Conversions List */}
      {!showManualUpload && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
        {loading && conversions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.icon }]}>
              Loading conversions...
            </Text>
          </View>
        ) : conversions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversions Yet</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              Convert audio files in the "Audio to Image" tab first
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.icon }]}>
              {conversions.length} Conversion{conversions.length !== 1 ? 's' : ''}
            </Text>
            {conversions.map(renderConversionItem)}
          </>
        )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 32,
    fontWeight: '300',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  infoBox: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  conversionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  conversionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 12,
  },
  conversionDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  conversionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decodeButton: {
    flex: 2,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff10',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  modeButtonActive: {
    borderColor: 'transparent',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff80',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  manualUploadContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  manualUploadContent: {
    gap: 16,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  filePickerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  filePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  filePickerSize: {
    fontSize: 12,
    marginTop: 4,
  },
  filePickerArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  keyInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  keyHelper: {
    fontSize: 12,
    marginTop: -4,
  },
  manualDecodeButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  manualDecodeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

