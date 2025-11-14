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
  quality: 'low' | 'medium' | 'high';
  sampleRate: '16000' | '44100' | '48000';
  format: 'mp3' | 'wav' | 'aac';
}

export default function ImageToAudioScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [outputFile, setOutputFile] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    quality: 'high',
    sampleRate: '44100',
    format: 'mp3',
  });

  const handleSelectImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setOutputFile(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image file');
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an image file first');
      return;
    }

    try {
      setConverting(true);

      const response = await conversionApi.imageToAudio(selectedFile.uri, options);

      if (response.success && response.outputFile) {
        setOutputFile(response.outputFile);
        Alert.alert('Success', 'Image converted to audio successfully!');
      } else {
        Alert.alert('Error', 'Conversion failed. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Conversion failed');
      console.error(error);
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (outputFile?.url) {
      Alert.alert('Success', 'Audio file is ready for download');
    }
  };

  const handleNewConversion = () => {
    setSelectedFile(null);
    setOutputFile(null);
    setOptions({
      quality: 'high',
      sampleRate: '44100',
      format: 'mp3',
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
        <Text style={[styles.title, { color: colors.text }]}>Image to Audio</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
        <Text style={styles.infoIcon}>🖼️➜🎵</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Convert images into audio files based on visual data
        </Text>
      </View>

      {!outputFile ? (
        <>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}
            onPress={handleSelectImage}
          >
            <Text style={styles.uploadIcon}>🖼️</Text>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {selectedFile ? 'Image Selected ✓' : 'Tap to select image file'}
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
                <Text style={[styles.optionsButtonText, { color: colors.text }]}>⚙️ Audio Settings</Text>
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
                  {selectedFile ? 'Convert to Audio' : 'Select File First'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.tipsBox, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Tips</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Supports JPG, PNG, GIF formats</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Higher sample rate = better quality</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Image colors map to audio frequencies</Text>
            <Text style={[styles.tipItem, { color: colors.icon }]}>• Best results with detailed images</Text>
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Audio Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Quality</Text>
            <View style={styles.buttonGroup}>
              {(['low', 'medium', 'high'] as const).map((qual) => (
                <TouchableOpacity
                  key={qual}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: options.quality === qual ? colors.tint : colors.tint + '15',
                    },
                  ]}
                  onPress={() => onOptionsChange({ ...options, quality: qual })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: options.quality === qual ? '#fff' : colors.text },
                    ]}
                  >
                    {qual.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Sample Rate</Text>
            <View style={styles.buttonGroup}>
              {(['16000', '44100', '48000'] as const).map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: options.sampleRate === rate ? colors.tint : colors.tint + '15',
                    },
                  ]}
                  onPress={() => onOptionsChange({ ...options, sampleRate: rate })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: options.sampleRate === rate ? '#fff' : colors.text },
                    ]}
                  >
                    {rate}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Format</Text>
            <View style={styles.buttonGroup}>
              {(['mp3', 'wav', 'aac'] as const).map((fmt) => (
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
