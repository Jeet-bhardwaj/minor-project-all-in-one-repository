import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import JSZip from 'jszip';

interface DownloadedFile {
  name: string;
  path: string;
  size: number;
  date: string;
}

export default function DownloadsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    // Request media library permission for saving images/zip to gallery
    (async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('MediaLibrary permission not granted');
        }
      } catch (e) {
        console.log('MediaLibrary request error', e);
      }
    })();
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
        return;
      }

      // Note: expo-file-system doesn't have readdir, so we'll track downloads manually
      // In a real app, you'd store this in AsyncStorage or a state management solution
      setDownloads([]);
    } catch (error) {
      console.error('Failed to load downloads:', error);
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
        await downloadZipFile(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick ZIP file');
    }
  };

  const downloadZipFile = async (file: any) => {
    try {
      setLoading(true);

      // Create downloads directory
      const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      }

      // Save ZIP file
      const zipPath = `${downloadsDir}${file.name}`;
      
      if (Platform.OS === 'web') {
        Alert.alert('Not Supported', 'File download is not supported on web');
        return;
      }

      // Copy file to downloads
      const { copyAsync } = await import('expo-file-system');
      await copyAsync({
        from: file.uri,
        to: zipPath,
      });

      // Try saving ZIP to gallery album
      try {
        const perm = await MediaLibrary.getPermissionsAsync();
        if ((perm as any).status === 'granted' || (perm as any).status === 'limited') {
          const asset = await MediaLibrary.createAssetAsync(zipPath);
          const albumName = 'EchoCipher';
          const existing = await MediaLibrary.getAlbumAsync(albumName);
          if (!existing) {
            await MediaLibrary.createAlbumAsync(albumName, asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], existing.id, false);
          }
          console.log('✅ ZIP saved to gallery album:', albumName);
        }
      } catch (err) {
        console.warn('Could not save ZIP to gallery:', err);
      }

      Alert.alert('✅ Success', `ZIP file saved to downloads folder`);
      await loadDownloads();
    } catch (error: any) {
      Alert.alert('Download Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractZip = async (file?: any) => {
    try {
      let zipFile = file;
      
      if (!zipFile) {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/zip',
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }
        zipFile = result.assets[0];
      }

      setExtracting(true);

      // Read ZIP file as base64
      const base64 = await FileSystem.readAsStringAsync(zipFile.uri, {
        encoding: 'base64',
      });

      // Convert base64 to binary
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Extract ZIP
      const zip = await JSZip.loadAsync(bytes);
      const extractDir = `${FileSystem.documentDirectory}extracted/${zipFile.name.replace('.zip', '')}/`;
      
      // Create extraction directory
      const dirInfo = await FileSystem.getInfoAsync(extractDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      }

      let extractedCount = 0;
      const fileNames: string[] = [];

      // Extract all files
      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const content = await file.async('base64');
          const filePath = `${extractDir}${filename}`;
          
          await FileSystem.writeAsStringAsync(filePath, content, {
            encoding: 'base64',
          });
          
          extractedCount++;
          fileNames.push(filename);
        }
      }

      // Try saving extracted images to gallery album
      try {
        const perm = await MediaLibrary.getPermissionsAsync();
        if ((perm as any).status === 'granted' || (perm as any).status === 'limited') {
          const albumName = 'EchoCipher';
          let album = await MediaLibrary.getAlbumAsync(albumName);

          for (const fname of fileNames) {
            try {
              const filePath = `${extractDir}${fname}`;
              const asset = await MediaLibrary.createAssetAsync(filePath);
              if (!album) {
                album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
              } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
              }
            } catch (innerErr) {
              console.warn('Failed to save extracted file to gallery:', innerErr);
            }
          }
        }
      } catch (err) {
        console.warn('Could not save extracted files to gallery:', err);
      }

      Alert.alert(
        '✅ Extraction Complete',
        `Extracted ${extractedCount} files to:\n${extractDir}\n\nFiles: ${fileNames.join(', ')}`,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Share first file as example
              if (fileNames.length > 0 && await Sharing.isAvailableAsync()) {
                const firstFile = `${extractDir}${fileNames[0]}`;
                await Sharing.shareAsync(firstFile);
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Extraction error:', error);
      Alert.alert('Extraction Failed', error.message || 'Failed to extract ZIP file');
    } finally {
      setExtracting(false);
    }
  };

  const handleClearDownloads = async () => {
    Alert.alert(
      'Clear Downloads',
      'Are you sure you want to delete all downloaded files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
              const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
              if (dirInfo.exists) {
                await FileSystem.deleteAsync(downloadsDir, { idempotent: true });
                await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
              }
              
              const extractedDir = `${FileSystem.documentDirectory}extracted/`;
              const extractedInfo = await FileSystem.getInfoAsync(extractedDir);
              if (extractedInfo.exists) {
                await FileSystem.deleteAsync(extractedDir, { idempotent: true });
              }
              
              setDownloads([]);
              Alert.alert('✅ Success', 'All downloads cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear downloads');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={colorScheme === 'dark' 
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#f093fb', '#f5576c', '#4facfe']
        }
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#ffffff' }]}>
            📥 Downloads
          </Text>
          <Text style={[styles.subtitle, { color: '#ffffff90' }]}>
            Manage and extract your encrypted files
          </Text>
        </View>

        {/* Main Card */}
        <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
          
          {/* Extract ZIP Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📦 Extract ZIP File
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.icon }]}>
              Extract encrypted images from a ZIP archive
            </Text>

            <TouchableOpacity
              style={styles.extractButton}
              onPress={() => handleExtractZip()}
              disabled={extracting}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {extracting ? (
                  <>
                    <ActivityIndicator color="#ffffff" />
                    <Text style={styles.buttonText}>Extracting...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.buttonIcon}>📂</Text>
                    <Text style={styles.buttonText}>Select & Extract ZIP</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
            <Text style={styles.infoIcon}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                How to use:
              </Text>
              <Text style={[styles.infoText, { color: colors.icon }]}>
                1. Tap "Select & Extract ZIP" to choose a ZIP file{'\n'}
                2. The encrypted images will be extracted{'\n'}
                3. Files are saved in the app's document directory{'\n'}
                4. You can share extracted files after extraction
              </Text>
            </View>
          </View>

          {/* Storage Info */}
          <View style={[styles.storageCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.storageTitle, { color: colors.text }]}>
              📁 Storage Locations
            </Text>
            <Text style={[styles.storagePath, { color: colors.icon }]}>
              Downloads: {FileSystem.documentDirectory}downloads/
            </Text>
            <Text style={[styles.storagePath, { color: colors.icon }]}>
              Extracted: {FileSystem.documentDirectory}extracted/
            </Text>
          </View>

          {/* Clear Button */}
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.tint }]}
            onPress={handleClearDownloads}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, { color: colors.tint }]}>
              🗑️ Clear All Downloads
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card + '80' }]}>
          <Text style={styles.tipsEmoji}>ℹ️</Text>
          <View style={styles.tipsContent}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              Storage Tips
            </Text>
            <Text style={[styles.tipsText, { color: colors.icon }]}>
              • Extracted files are stored locally on your device{'\n'}
              • Clear downloads regularly to save space{'\n'}
              • Use the share button to save files to your gallery{'\n'}
              • Keep your encrypted ZIP files safe for backup
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  extractButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  storageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  storageTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  storagePath: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  clearButton: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipsEmoji: {
    fontSize: 20,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
});
