import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
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
  const [outputFile, setOutputFile] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    resolution: 'high',
    colorMode: 'gradient',
    format: 'png',
  });

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

      // Call the corrected API endpoint
      const response = await conversionApi.audioToImage(
        selectedFile,
        'user-' + Date.now(),
        {
          compress: true,
          deleteSource: false,
        }
      );

      if (response.success && response.images) {
        // Create a mock output file for display
        setOutputFile({
          filename: response.images[0] || 'converted.png',
          size: 102400, // Mock size
          url: '#',
        });
        Alert.alert('Success', `Audio converted to ${response.imageCount} image(s)!`);
      } else {
        Alert.alert('Error', response.message || 'Conversion failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      Alert.alert('Error', error.message || 'Network error. Make sure backend is running on port 3000.');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (outputFile?.url) {
      Alert.alert('Success', 'Image file is ready for download');
    }
  };

  const handleNewConversion = () => {
    setSelectedFile(null);
    setOutputFile(null);
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
        <Text style={styles.infoIcon}>🎵➜🖼️</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Convert audio files into beautiful visual representations
        </Text>
      </View>

      {!outputFile ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectAudio}
          >
            <Text style={styles.uploadIcon}>🎵</Text>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? 'Audio Selected ✓' : 'Tap to select audio file'}
            </Text>
            {selectedFile && (
              <Text style={[styles.fileName, { color: colors.icon }]}>
                {selectedFile.name}
              </Text>
            )}
          </TouchableOpacity>

          {selectedFile && (
            <>
              <TouchableOpacity
                style={[styles.optionsButton, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}
                onPress={() => setShowOptions(true)}
              >
                <Text style={[styles.optionsButtonText, { color: colors.text }]}>⚙️ Conversion Settings</Text>
              </TouchableOpacity>

              <OptionsModal
                visible={showOptions}
                onClose={() => setShowOptions(false)}
                options={options}
                onOptionsChange={setOptions}
                colors={colors}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.convertButton,
              {
                backgroundColor: selectedFile ? colors.tint : colors.icon + '50',
                opacity: converting ? 0.7 : 1,
              },
            ]}
            onPress={handleConvert}
            disabled={!selectedFile || converting}
          >
            {converting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.convertIcon}>✨</Text>
                <Text style={styles.convertButtonText}>
                  {selectedFile ? 'Convert to Image' : 'Select File First'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.tipsBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Tips</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Supports MP3, WAV, FLAC, AAC formats</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Higher resolution = more detail</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Gradient mode shows color transitions</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Larger files may take longer to process</Text>
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
            <Text style={styles.downloadButtonText}>Download Image</Text>
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
  optionsButton: { borderRadius: 10, padding: 14, marginBottom: 16, alignItems: 'center', borderWidth: 1 },
  optionsButtonText: { fontSize: 14, fontWeight: '600' },
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
