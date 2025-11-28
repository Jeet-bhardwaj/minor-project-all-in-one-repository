import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { conversionApi } from '@/services/api';

interface ConversionOptions {
  resolution: 'low' | 'medium' | 'high';
  colorMode: 'grayscale' | 'color' | 'gradient';
  format: 'png' | 'jpg' | 'webp';
}

export default function AudioToImageScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    resolution: 'high',
    colorMode: 'gradient',
    format: 'png',
  });
  const [progress, setProgress] = useState(0);
  const [progressAnim] = useState(new Animated.Value(0));
  const [downloading, setDownloading] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (converting) {
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [converting]);

  const handleSelectAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Validate file size (max 100MB)
        if (file.size && file.size > 100 * 1024 * 1024) {
          Alert.alert('Error', 'Audio file is too large. Maximum size is 100MB');
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
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
      console.error('File picker error:', error);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    try {
      setConverting(true);
      setProgress(0);
      setConversionResult(null);

      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      // Call the API endpoint
      const response = await conversionApi.audioToImage(
        selectedFile,
        'user-' + Date.now(),
        {
          compress: true,
          deleteSource: false,
        }
      );

      setProgress(100);

      if (response.success) {
        const result = {
          conversionId: response.conversionId,
          images: response.images || [],
          imageCount: response.imageCount || 0,
          outputPath: response.outputPath,
          inputFile: response.inputFile || selectedFile.name,
          timestamp: response.timestamp,
        };
        
        setConversionResult(result);

        // Auto-download files after conversion
        await autoDownloadFiles(result);

        Alert.alert(
          '✅ Success!',
          `Your audio has been converted into ${response.imageCount} encrypted image(s)!\n\nFiles are being downloaded automatically.`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        throw new Error(response.message || 'Conversion failed');
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      setProgress(0);
      Alert.alert(
        '❌ Conversion Failed',
        error.message || 'Network error. Make sure backend is running.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setConverting(false);
    }
  };

  const autoDownloadFiles = async (result: any) => {
    if (!result || !result.conversionId) return;

    try {
      const { conversionId, images } = result;
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 
                      (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://192.168.29.67:3000/api');

      const downloaded = new Set<string>();

      if (Platform.OS === 'web') {
        // For web, download all files automatically
        for (const imageName of images) {
          const downloadUrl = `${baseUrl}/conversions/${conversionId}/${imageName}`;
          
          // Create a hidden link and click it
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = imageName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          downloaded.add(imageName);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        setDownloadedFiles(downloaded);
      } else {
        // For mobile, download to device storage
        const downloadPromises = images.map(async (imageName: string) => {
          const downloadUrl = `${baseUrl}/conversions/${conversionId}/${imageName}`;
          const fileUri = FileSystem.documentDirectory + imageName;
          
          try {
            await FileSystem.downloadAsync(downloadUrl, fileUri);
            downloaded.add(imageName);
            return { success: true, file: imageName, uri: fileUri };
          } catch (err) {
            console.error(`Failed to download ${imageName}:`, err);
            return { success: false, file: imageName };
          }
        });

        const results = await Promise.all(downloadPromises);
        setDownloadedFiles(downloaded);
        
        const successCount = results.filter(r => r.success).length;
        console.log(`Downloaded ${successCount}/${images.length} files to device storage`);
        
        // Show success message for mobile
        if (successCount === images.length) {
          Alert.alert(
            '📥 Files Downloaded',
            `All ${successCount} files saved to device storage:\n${FileSystem.documentDirectory}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Auto-download error:', error);
      // Don't show error alert, files are still available for manual download
    }
  };

  const handleDownloadAll = async () => {
    if (!conversionResult || !conversionResult.conversionId) {
      Alert.alert('Error', 'No conversion result available');
      return;
    }

    try {
      setDownloading(true);

      // Download all images as a ZIP or individually
      const { conversionId, images, imageCount } = conversionResult;

      if (Platform.OS === 'web') {
        // For web, open download link
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        for (const imageName of images) {
          const downloadUrl = `${baseUrl}/conversions/${conversionId}/${imageName}`;
          window.open(downloadUrl, '_blank');
        }
        Alert.alert('✅ Download Started', `${imageCount} file(s) are being downloaded.`);
      } else {
        // For mobile, use FileSystem and Sharing
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.67:3000/api';
        
        if (images.length === 1) {
          // Download single file
          const downloadUrl = `${baseUrl}/conversions/${conversionId}/${images[0]}`;
          const fileUri = FileSystem.documentDirectory + images[0];
          
          const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri);
            Alert.alert('✅ Success', 'Image ready to save!');
          } else {
            Alert.alert('✅ Downloaded', `Saved to: ${downloadResult.uri}`);
          }
        } else {
          // Download multiple files
          Alert.alert(
            '📦 Multiple Files',
            `You have ${imageCount} images. They will be downloaded one by one.`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Download All',
                onPress: async () => {
                  for (let i = 0; i < images.length; i++) {
                    const imageName = images[i];
                    const downloadUrl = `${baseUrl}/conversions/${conversionId}/${imageName}`;
                    const fileUri = FileSystem.documentDirectory + imageName;
                    
                    await FileSystem.downloadAsync(downloadUrl, fileUri);
                  }
                  Alert.alert('✅ Complete', `All ${imageCount} files downloaded!`);
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('❌ Download Failed', error.message || 'Failed to download images');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingle = async (fileName: string) => {
    if (!conversionResult || !conversionResult.conversionId) return;

    try {
      const { conversionId } = conversionResult;
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 
                      (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://192.168.29.67:3000/api');
      const downloadUrl = `${baseUrl}/conversions/${conversionId}/${fileName}`;

      if (Platform.OS === 'web') {
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mark as downloaded
        setDownloadedFiles(prev => new Set([...prev, fileName]));
      } else {
        const fileUri = FileSystem.documentDirectory + fileName;
        const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
        
        // Mark as downloaded
        setDownloadedFiles(prev => new Set([...prev, fileName]));
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('✅ Downloaded', `File saved to:\n${downloadResult.uri}`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleNewConversion = () => {
    setSelectedFile(null);
    setConversionResult(null);
    setProgress(0);
    progressAnim.setValue(0);
    setDownloadedFiles(new Set());
    setOptions({
      resolution: 'high',
      colorMode: 'gradient',
      format: 'png',
    });
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
        <Text style={[styles.title, { color: colors.text }]}>Audio to Image</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <View style={styles.infoIconContainer}>
          <Text style={styles.infoIcon}>🎵</Text>
          <Text style={[styles.arrow, { color: colors.tint }]}>→</Text>
          <Text style={styles.infoIcon}>🖼️</Text>
        </View>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Convert your audio files into encrypted images
        </Text>
        <Text style={[styles.infoSubtext, { color: colors.icon }]}>
          Secure • Fast • Lossless
        </Text>
      </View>

      {!conversionResult ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectAudio}
            disabled={converting}
          >
            <View style={[styles.uploadIconCircle, { backgroundColor: colors.tint + '20' }]}>
              <Text style={styles.uploadIcon}>🎵</Text>
            </View>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? '✓ Audio Selected' : 'Select Audio File'}
            </Text>
            {selectedFile && (
              <View style={[styles.fileInfo, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '20' }]}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  📄 {selectedFile.name}
                </Text>
                <Text style={[styles.fileSize, { color: colors.icon }]}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {converting && (
            <View style={[styles.progressContainer, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '20' }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>Converting...</Text>
                <Text style={[styles.progressPercent, { color: colors.tint }]}>{progress.toFixed(0)}%</Text>
              </View>
              <View style={[styles.progressBarBackground, { backgroundColor: colors.icon + '20' }]}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: colors.tint,
                      width: `${progress}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.icon }]}>
                Encrypting and converting your audio file...
              </Text>
              <ActivityIndicator color={colors.tint} size="large" style={{ marginTop: 12 }} />
            </View>
          )}

          {!converting && (
            <>
              <TouchableOpacity
                style={[
                  styles.convertButton,
                  {
                    backgroundColor: selectedFile ? colors.tint : colors.icon + '50',
                  },
                ]}
                onPress={handleConvert}
                disabled={!selectedFile}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.convertIcon}>✨</Text>
                  <Text style={styles.convertButtonText}>
                    {selectedFile ? 'Convert to Image' : 'Select File First'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.featuresBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '15' }]}>
                <Text style={[styles.featuresTitle, { color: colors.text }]}>✨ Features</Text>
                <View style={styles.featuresList}>
                  <FeatureItem icon="🔐" text="AES-256 Encryption" colors={colors} />
                  <FeatureItem icon="📦" text="Zstd Compression" colors={colors} />
                  <FeatureItem icon="🎯" text="Lossless Quality" colors={colors} />
                  <FeatureItem icon="⚡" text="Fast Processing" colors={colors} />
                </View>
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <View style={[styles.successBox, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '40' }]}>
            <View style={[styles.successIconCircle, { backgroundColor: colors.tint + '20' }]}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Conversion Complete!</Text>
            <Text style={[styles.successSubtitle, { color: colors.icon }]}>
              Your audio has been encrypted into images
            </Text>
            
            <View style={[styles.statsContainer, { backgroundColor: colors.background, borderColor: colors.tint + '20' }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Images</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{conversionResult.imageCount}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.icon + '30' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Source</Text>
                <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                  {conversionResult.inputFile.split('.').pop()?.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.icon + '30' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.icon }]}>ID</Text>
                <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                  {conversionResult.conversionId.slice(0, 6)}...
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.filesListContainer, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '15' }]}>
            <View style={styles.filesListHeader}>
              <Text style={[styles.filesListTitle, { color: colors.text }]}>📁 Generated Files</Text>
              {downloadedFiles.size > 0 && (
                <Text style={[styles.downloadedBadge, { color: colors.tint }]}>
                  ✓ {downloadedFiles.size} saved
                </Text>
              )}
            </View>
            <ScrollView style={styles.filesList} nestedScrollEnabled>
              {conversionResult.images.map((fileName: string, index: number) => {
                const isDownloaded = downloadedFiles.has(fileName);
                return (
                  <View
                    key={index}
                    style={[
                      styles.fileItem,
                      {
                        backgroundColor: isDownloaded ? colors.tint + '08' : colors.background,
                        borderColor: isDownloaded ? colors.tint + '30' : colors.icon + '20',
                      }
                    ]}
                  >
                    <View style={styles.fileItemLeft}>
                      <Text style={styles.fileItemIcon}>{fileName.endsWith('.json') ? '📋' : '🖼️'}</Text>
                      <View style={styles.fileItemInfo}>
                        <View style={styles.fileItemNameRow}>
                          <Text style={[styles.fileItemName, { color: colors.text }]} numberOfLines={1}>
                            {fileName}
                          </Text>
                          {isDownloaded && <Text style={styles.checkMark}>✓</Text>}
                        </View>
                        <Text style={[styles.fileItemType, { color: colors.icon }]}>
                          {fileName.endsWith('.json') ? 'Metadata' : 'Encrypted Image'}
                          {isDownloaded && ' • Saved locally'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.downloadIconButton,
                        { backgroundColor: isDownloaded ? colors.tint + '20' : colors.tint + '15' }
                      ]}
                      onPress={() => handleDownloadSingle(fileName)}
                    >
                      <Text style={styles.downloadIconText}>{isDownloaded ? '✓' : '⬇️'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.tint }]}
            onPress={handleDownloadAll}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.downloadIcon}>📥</Text>
                <Text style={styles.downloadButtonText}>Download All Files</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.tint, flex: 1, marginRight: 8 }]}
              onPress={handleNewConversion}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>🔄 New Conversion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.tint, flex: 1, marginLeft: 8 }]}
              onPress={() => {
                Alert.alert(
                  'Conversion ID',
                  `Your conversion ID is:\n\n${conversionResult.conversionId}\n\nSave this to decode your images later.`,
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>📋 Copy ID</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoNote, { backgroundColor: colors.icon + '10', borderColor: colors.icon + '20' }]}>
            <Text style={styles.infoNoteIcon}>💡</Text>
            <Text style={[styles.infoNoteText, { color: colors.icon }]}>
              Save your Conversion ID to decode these images back to audio later!
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// FeatureItem Component
const FeatureItem: React.FC<{ icon: string; text: string; colors: any }> = ({ icon, text, colors }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={[styles.featureText, { color: colors.icon }]}>{text}</Text>
  </View>
);

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
  options: ConversionOptions;
  onOptionsChange: (options: ConversionOptions) => void;
  colors: any;
}

const OptionsModal: React.FC<OptionsModalProps> = ({
  visible,
  onClose,
  options,
  onOptionsChange,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Conversion Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Resolution</Text>
            <View style={styles.buttonGroup}>
              {(['low', 'medium', 'high'] as const).map((res) => (
                <TouchableOpacity
                  key={res}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: options.resolution === res ? colors.tint : colors.tint + '15',
                    },
                  ]}
                  onPress={() => onOptionsChange({ ...options, resolution: res })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: options.resolution === res ? '#fff' : colors.text },
                    ]}
                  >
                    {res.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Color Mode</Text>
            <View style={styles.buttonGroup}>
              {(['grayscale', 'color', 'gradient'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: options.colorMode === mode ? colors.tint : colors.tint + '15',
                    },
                  ]}
                  onPress={() => onOptionsChange({ ...options, colorMode: mode })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: options.colorMode === mode ? '#fff' : colors.text },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Format</Text>
            <View style={styles.buttonGroup}>
              {(['png', 'jpg', 'webp'] as const).map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: options.format === fmt ? colors.tint : colors.tint + '15',
                    },
                  ]}
                  onPress={() => onOptionsChange({ ...options, format: fmt })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: options.format === fmt ? '#fff' : colors.text },
                    ]}
                  >
                    {fmt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: colors.tint }]}
          onPress={onClose}
        >
          <Text style={styles.applyButtonText}>Apply Settings</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 28, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  
  // Info Box
  infoBox: { borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center', borderWidth: 1 },
  infoIconContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoIcon: { fontSize: 36 },
  arrow: { fontSize: 24, fontWeight: '600' },
  infoText: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  infoSubtext: { fontSize: 13, fontWeight: '500', marginTop: 6 },
  
  // Upload Box
  uploadBox: { borderRadius: 16, padding: 28, marginBottom: 20, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  uploadIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  uploadIcon: { fontSize: 40 },
  uploadText: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  fileInfo: { marginTop: 16, padding: 12, borderRadius: 10, width: '100%', borderWidth: 1 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  fileSize: { fontSize: 12, fontWeight: '500' },
  
  // Progress
  progressContainer: { borderRadius: 14, padding: 20, marginBottom: 20, borderWidth: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700' },
  progressPercent: { fontSize: 18, fontWeight: '700' },
  progressBarBackground: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  
  // Convert Button
  convertButton: { borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 20 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  convertIcon: { fontSize: 22, marginRight: 10 },
  convertButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  
  // Features Box
  featuresBox: { borderRadius: 14, padding: 18, borderWidth: 1, marginBottom: 20 },
  featuresTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  featuresList: { gap: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, fontWeight: '500' },
  
  // Success Box
  successBox: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 2 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successIcon: { fontSize: 42 },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  successSubtitle: { fontSize: 14, fontWeight: '500', marginBottom: 18, textAlign: 'center' },
  
  // Stats Container
  statsContainer: { flexDirection: 'row', borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, marginHorizontal: 12 },
  
  // Files List
  filesListContainer: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  filesListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filesListTitle: { fontSize: 15, fontWeight: '700' },
  downloadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  filesList: { maxHeight: 200 },
  fileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  fileItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  fileItemIcon: { fontSize: 24 },
  fileItemInfo: { flex: 1 },
  fileItemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkMark: { fontSize: 14 },
  fileItemName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fileItemType: { fontSize: 11, fontWeight: '500' },
  downloadIconButton: { padding: 8, borderRadius: 8 },
  downloadIconText: { fontSize: 18 },
  
  // Download Button
  downloadButton: { borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
  downloadIcon: { fontSize: 20, marginRight: 10 },
  
  // Action Buttons
  actionButtons: { flexDirection: 'row', marginBottom: 16 },
  secondaryButton: { borderRadius: 12, borderWidth: 2, padding: 14, alignItems: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
  
  // Info Note
  infoNote: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, gap: 10 },
  infoNoteIcon: { fontSize: 20 },
  infoNoteText: { fontSize: 12, fontWeight: '500', lineHeight: 18, flex: 1 },
  
  // Modal (kept for compatibility)
  modalContainer: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { fontSize: 24 },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  optionSection: { marginBottom: 28 },
  optionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  optionButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  optionButtonText: { fontSize: 12, fontWeight: '600' },
  applyButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
