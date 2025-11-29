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
import AsyncStorage from '@react-native-async-storage/async-storage';
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

interface ExtractedFiles {
  files: string[];
  directory: string;
  savedToGallery: boolean;
}

export default function DownloadsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFiles | null>(null);
  const [progressText, setProgressText] = useState('');

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

      // Load downloads from AsyncStorage
      const storedDownloads = await AsyncStorage.getItem('downloadedFiles');
      if (storedDownloads) {
        const parsedDownloads: DownloadedFile[] = JSON.parse(storedDownloads);
        
        // Verify files still exist
        const existingDownloads = await Promise.all(
          parsedDownloads.map(async (file) => {
            const fileInfo = await FileSystem.getInfoAsync(file.path);
            if (fileInfo.exists) {
              return file;
            }
            return null;
          })
        );
        
        const validDownloads = existingDownloads.filter(f => f !== null) as DownloadedFile[];
        setDownloads(validDownloads);
        
        // Update AsyncStorage with valid files only
        if (validDownloads.length !== parsedDownloads.length) {
          await AsyncStorage.setItem('downloadedFiles', JSON.stringify(validDownloads));
        }
      } else {
        setDownloads([]);
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
      setDownloads([]);
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
      setProgressText('Creating downloads directory...');

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

      setProgressText('Copying ZIP file...');
      // Copy file to downloads
      const { copyAsync } = await import('expo-file-system');
      await copyAsync({
        from: file.uri,
        to: zipPath,
      });

      setProgressText('Saving to gallery...');
      // Try saving ZIP to gallery album
      let gallerySuccess = false;
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
          gallerySuccess = true;
        }
      } catch (err: any) {
        console.warn('Could not save ZIP to gallery:', err);
        Alert.alert('⚠️ Partial Success', `ZIP saved locally but could not save to gallery:\n${err.message}`);
      }

      // Save to downloads list in AsyncStorage
      const fileInfo = await FileSystem.getInfoAsync(zipPath);
      const downloadedFile: DownloadedFile = {
        name: file.name,
        path: zipPath,
        size: (fileInfo as any).size || 0,
        date: new Date().toISOString(),
      };
      
      const storedDownloads = await AsyncStorage.getItem('downloadedFiles');
      const currentDownloads: DownloadedFile[] = storedDownloads ? JSON.parse(storedDownloads) : [];
      currentDownloads.unshift(downloadedFile); // Add to beginning
      await AsyncStorage.setItem('downloadedFiles', JSON.stringify(currentDownloads));

      if (gallerySuccess) {
        Alert.alert('✅ Success', `ZIP file saved to downloads folder and Pictures/EchoCipher album!`);
      } else {
        Alert.alert('✅ Success', `ZIP file saved to downloads folder`);
      }
      await loadDownloads();
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', `Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
      setProgressText('');
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
      setProgressText('Reading ZIP file...');

      // Read ZIP file as base64
      const base64 = await FileSystem.readAsStringAsync(zipFile.uri, {
        encoding: 'base64',
      });

      setProgressText('Parsing ZIP contents...');
      // Convert base64 to binary
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Extract ZIP
      const zip = await JSZip.loadAsync(bytes);
      const extractDir = `${FileSystem.documentDirectory}extracted/${zipFile.name.replace('.zip', '')}/`;
      
      setProgressText('Creating extraction directory...');
      // Create extraction directory
      const dirInfo = await FileSystem.getInfoAsync(extractDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      }

      let extractedCount = 0;
      const fileNames: string[] = [];
      const totalFiles = Object.keys(zip.files).filter(k => !zip.files[k].dir).length;

      // Extract all files
      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          setProgressText(`Extracting file ${extractedCount + 1}/${totalFiles}...`);
          const content = await file.async('base64');
          const filePath = `${extractDir}${filename}`;
          
          await FileSystem.writeAsStringAsync(filePath, content, {
            encoding: 'base64',
          });
          
          extractedCount++;
          fileNames.push(filename);
        }
      }

      // Store extracted files info for later gallery save
      setExtractedFiles({
        files: fileNames.map(f => `${extractDir}${f}`),
        directory: extractDir,
        savedToGallery: false,
      });

      Alert.alert(
        '✅ Extraction Complete',
        `Extracted ${extractedCount} files to app storage.\n\nUse "Save to Gallery" button to save images to Pictures/EchoCipher album.`,
        [
          {
            text: 'OK',
          }
        ]
      );

    } catch (error: any) {
      console.error('Extraction error:', error);
      Alert.alert('Extraction Failed', `Error: ${error.message || 'Failed to extract ZIP file'}\n\nPlease try again or check the ZIP file.`);
    } finally {
      setExtracting(false);
      setProgressText('');
    }
  };

  const handleSaveToGallery = async () => {
    if (!extractedFiles || extractedFiles.files.length === 0) {
      Alert.alert('No Files', 'Please extract a ZIP file first');
      return;
    }

    try {
      setSavingToGallery(true);
      setProgressText('Requesting gallery permissions...');

      const perm = await MediaLibrary.requestPermissionsAsync();
      if ((perm as any).status !== 'granted' && (perm as any).status !== 'limited') {
        Alert.alert('Permission Denied', 'Gallery access is required to save images. Please enable it in Settings.');
        return;
      }

      const albumName = 'EchoCipher';
      let album = await MediaLibrary.getAlbumAsync(albumName);
      let savedCount = 0;
      let failedCount = 0;

      setProgressText(`Saving 0/${extractedFiles.files.length} files...`);

      for (let i = 0; i < extractedFiles.files.length; i++) {
        const filePath = extractedFiles.files[i];
        try {
          setProgressText(`Saving ${i + 1}/${extractedFiles.files.length} files...`);
          const asset = await MediaLibrary.createAssetAsync(filePath);
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
          }
          savedCount++;
        } catch (innerErr: any) {
          console.warn('Failed to save file to gallery:', innerErr);
          failedCount++;
        }
      }

      setExtractedFiles({
        ...extractedFiles,
        savedToGallery: true,
      });

      if (failedCount === 0) {
        Alert.alert(
          '✅ Success!',
          `All ${savedCount} files saved to Pictures/${albumName} album!\n\nYou can view them in your device gallery.`
        );
      } else {
        Alert.alert(
          '⚠️ Partial Success',
          `Saved ${savedCount} files to gallery.\nFailed: ${failedCount} files.\n\nSome files may not be compatible image formats.`
        );
      }
    } catch (error: any) {
      console.error('Save to gallery error:', error);
      Alert.alert('Save Failed', `Error: ${error.message || 'Could not save to gallery'}`);
    } finally {
      setSavingToGallery(false);
      setProgressText('');
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
              setExtractedFiles(null);
              await AsyncStorage.setItem('downloadedFiles', JSON.stringify([]));
              Alert.alert('✅ Success', 'All downloads cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear downloads');
            }
          },
        },
      ]
    );
  };

  const handleDeleteFile = async (file: DownloadedFile) => {
    Alert.alert(
      'Delete File',
      `Delete ${file.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(file.path, { idempotent: true });
              const updatedDownloads = downloads.filter(d => d.path !== file.path);
              setDownloads(updatedDownloads);
              await AsyncStorage.setItem('downloadedFiles', JSON.stringify(updatedDownloads));
              Alert.alert('✅ Deleted', 'File removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleShareFile = async (file: DownloadedFile) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.path);
      } else {
        Alert.alert('Not Available', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

        {/* Progress Indicator */}
        {progressText !== '' && (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              {progressText}
            </Text>
          </View>
        )}

        {/* Main Card */}
        <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
          
          {/* Downloaded Files List */}
          {downloads.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📂 Downloaded ZIP Files ({downloads.length})
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.icon }]}>
                Tap a file to extract or manage
              </Text>

              <View style={styles.filesList}>
                {downloads.map((file, index) => (
                  <View key={index} style={[styles.fileItem, { backgroundColor: colors.background }]}>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                        📦 {file.name}
                      </Text>
                      <View style={styles.fileMetadata}>
                        <Text style={[styles.fileSize, { color: colors.icon }]}>
                          {formatFileSize(file.size)}
                        </Text>
                        <Text style={[styles.fileDot, { color: colors.icon }]}> • </Text>
                        <Text style={[styles.fileDate, { color: colors.icon }]}>
                          {formatDate(file.date)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => handleExtractZip({ uri: file.path, name: file.name })}
                      >
                        <Text style={styles.actionButtonText}>Extract</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
                        onPress={() => handleShareFile(file)}
                      >
                        <Text style={styles.actionButtonText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#ff444420' }]}
                        onPress={() => handleDeleteFile(file)}
                      >
                        <Text style={[styles.actionButtonText, { color: '#ff4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          
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

          {/* Save to Gallery Section */}
          {extractedFiles && extractedFiles.files.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🖼️ Save to Gallery
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.icon }]}>
                Save {extractedFiles.files.length} extracted file(s) to Pictures/EchoCipher
              </Text>

              <TouchableOpacity
                style={styles.extractButton}
                onPress={handleSaveToGallery}
                disabled={savingToGallery || extractedFiles.savedToGallery}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={extractedFiles.savedToGallery 
                    ? ['#28a745', '#20c997'] 
                    : ['#4facfe', '#00f2fe']
                  }
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {savingToGallery ? (
                    <>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.buttonText}>Saving...</Text>
                    </>
                  ) : extractedFiles.savedToGallery ? (
                    <>
                      <Text style={styles.buttonIcon}>✅</Text>
                      <Text style={styles.buttonText}>Saved to Gallery</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonIcon}>💾</Text>
                      <Text style={styles.buttonText}>Save to Gallery</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {extractedFiles.savedToGallery && (
                <Text style={[styles.successText, { color: '#28a745' }]}>
                  ✅ Files available in your device gallery under Pictures/EchoCipher
                </Text>
              )}
            </View>
          )}

          {/* Info Section */}
          <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
            <Text style={styles.infoIcon}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                How to use:
              </Text>
              <Text style={[styles.infoText, { color: colors.icon }]}>
                1. Tap "Select & Extract ZIP" to choose a ZIP file{'\n'}
                2. Wait for extraction to complete{'\n'}
                3. Tap "Save to Gallery" to save to Pictures/EchoCipher{'\n'}
                4. View images in your device gallery app
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
            <Text style={[styles.storagePath, { color: colors.icon }]}>
              Gallery: Pictures/EchoCipher (after saving)
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
              • Use "Save to Gallery" to access files permanently{'\n'}
              • Gallery files are saved to Pictures/EchoCipher album{'\n'}
              • Clear downloads regularly to save space{'\n'}
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
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
  filesList: {
    gap: 12,
  },
  fileItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  fileInfo: {
    marginBottom: 10,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileDot: {
    fontSize: 12,
  },
  fileDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
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
  successText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
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
