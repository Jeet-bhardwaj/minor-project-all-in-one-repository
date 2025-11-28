import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Easing,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { conversionApi } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface ConversionOptions {
  compress: boolean;
}

export default function AudioToImageScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<ConversionOptions>({
    compress: true,
  });

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Request media + audio permissions
    (async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Media library permission not granted');
        }
      } catch (e) {
        console.log('MediaLibrary permission error', e);
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation for loading
    if (loading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [loading]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        
        // Bounce animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required to record audio');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Recording Failed', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      console.log('⏹️ Stopping recording...');
      setIsRecording(false);
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        // Create file object from recording
        const fileName = `recording_${Date.now()}.m4a`;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        setSelectedFile({
          uri,
          name: fileName,
          mimeType: 'audio/m4a',
          size: fileInfo.size || 0,
        });

        console.log('✅ Recording saved:', fileName);
        Alert.alert('✅ Recording Complete', `Duration: ${formatDuration(recordingDuration)}`);
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setProgress(0);
    progressAnim.setValue(0);

    try {
      console.log('📤 Starting conversion for:', selectedFile.name);
      console.log('📊 File details:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.mimeType,
        uri: selectedFile.uri
      });

      const simulateProgress = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 0.1;
          if (next < 0.9) {
            Animated.timing(progressAnim, {
              toValue: next,
              duration: 100,
              useNativeDriver: false,
            }).start();
            return next;
          }
          return prev;
        });
      }, 200);

      console.log('🚀 Sending conversion request...');
      
      // Pass the file object and options separately to the API
      const result = await conversionApi.audioToImage(
        selectedFile,
        undefined, // userId - optional
        {
          compress: options.compress,
          masterKeyHex: generateMasterKey(),
        }
      );
      
      console.log('✅ Conversion result:', result);
      
      clearInterval(simulateProgress);
      setProgress(1);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      setConversionResult(result);
      
      // Auto-download files
      if (result?.images && result.images.length > 0) {
        await autoDownloadFiles(result.images, result.conversionId);
      }

    } catch (error: any) {
      console.error('❌ Conversion error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMsg = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Invalid audio file. Please try another file.';
        
      Alert.alert('Conversion Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const autoDownloadFiles = async (fileNames: string[], conversionId: string) => {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 
                      (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://192.168.29.67:3000/api');
      
      // Download ZIP file instead of individual files
      const zipUrl = `${baseUrl}/conversions/${conversionId}/download-zip`;
      
      console.log('📥 Downloading ZIP file from:', zipUrl);

      if (Platform.OS === 'web') {
        // Web: Direct download link
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `encrypted_${conversionId}.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('✅ Success!', 'ZIP file downloaded');
      } else {
        // Mobile: Fetch and save ZIP
        console.log('🌐 Fetching ZIP file...');
        const response = await fetch(zipUrl);
        
        console.log('📊 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get the blob
        const blob = await response.blob();
        console.log('📦 ZIP received:', blob.size, 'bytes');
        
        // Create downloads directory
        const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
        const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
        }
        
        // Convert blob to base64 and save
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64data = (reader.result as string).split(',')[1];
              const zipFileName = `encrypted_${conversionId}.zip`;
              const zipUri = downloadsDir + zipFileName;
              
              // Write ZIP file
              await FileSystem.writeAsStringAsync(zipUri, base64data, { encoding: 'base64' });
              
              console.log('✅ ZIP saved to:', zipUri);
              // Save ZIP to device Pictures/EchoCipher album
              try {
                const perm = await MediaLibrary.getPermissionsAsync();
                if (perm.status === 'granted' || perm.status === 'limited') {
                  const asset = await MediaLibrary.createAssetAsync(zipUri);
                  const albumName = 'EchoCipher';
                  const existing = await MediaLibrary.getAlbumAsync(albumName);
                  if (!existing) {
                    await MediaLibrary.createAlbumAsync(albumName, asset, false);
                  } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], existing.id, false);
                  }
                  console.log('✅ ZIP saved to gallery album:', albumName);
                } else {
                  console.log('MediaLibrary permission not granted - skipping save to gallery');
                }
              } catch (err) {
                console.warn('Could not save ZIP to gallery:', err);
              }
              
              // Share the ZIP file
              if (await Sharing.isAvailableAsync()) {
                console.log('📤 Opening share dialog for ZIP...');
                await Sharing.shareAsync(zipUri, {
                  mimeType: 'application/zip',
                  dialogTitle: 'Save encrypted images (ZIP)',
                  UTI: 'public.zip-archive',
                });
              } else {
                Alert.alert('✅ Success', `ZIP file saved to: ${zipUri}`);
              }
              
              setDownloadedFiles(new Set(['ZIP Downloaded']));
              resolve(true);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
        });

        Alert.alert(
          '✨ Success!', 
          `ZIP file with ${fileNames.length} encrypted images is ready!\n\nSaved to Downloads folder.`,
          [
            { text: 'OK' }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Failed to download ZIP:', error);
      console.error('Error details:', { 
        message: error.message, 
        stack: error.stack,
        name: error.name
      });
      
      Alert.alert(
        '⚠️ Download Failed', 
        'Could not download ZIP file. Please check:\n\n1. Internet connection\n2. Backend is running\n3. Try again'
      );
    }
  };

  const handleDownloadSingle = async (fileName: string) => {
    if (!conversionResult?.conversionId) return;

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 
                      (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://192.168.29.67:3000/api');
      
      // URL encode the filename
      const encodedFileName = encodeURIComponent(fileName);
      const downloadUrl = `${baseUrl}/conversions/${conversionResult.conversionId}/${encodedFileName}`;

      console.log('📥 Downloading single file:', { fileName, downloadUrl });

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadedFiles(prev => new Set([...prev, fileName]));
      } else {
        // Use fetch for better compatibility
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Create cache directory
        const cacheDir = Platform.OS === 'ios' ? `${FileSystem.cacheDirectory}encrypted/` : `${FileSystem.documentDirectory}encrypted/`;
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }
        
        // Convert blob to base64 and save
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64data = (reader.result as string).split(',')[1];
              const fileUri = cacheDir + fileName;
              
              await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: 'base64' });
              
              setDownloadedFiles(prev => new Set([...prev, fileName]));
              
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: 'image/png',
                  dialogTitle: 'Save encrypted image'
                });
              } else {
                Alert.alert('Success', `File saved to: ${fileUri}`);
              }
              resolve(true);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
        });
      }
    } catch (error: any) {
      console.error('❌ Download error:', error);
      Alert.alert('Download Failed', error.message || 'Failed to download file');
    }
  };

  const generateMasterKey = () => {
    return Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  };

  const handleNewConversion = () => {
    setSelectedFile(null);
    setConversionResult(null);
    setProgress(0);
    progressAnim.setValue(0);
    setDownloadedFiles(new Set());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={colorScheme === 'dark' 
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#667eea', '#764ba2', '#f093fb']
        }
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated Circles Background */}
      <View style={styles.circlesContainer}>
        <Animated.View 
          style={[
            styles.circle1,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: colorScheme === 'dark' ? '#667eea40' : '#ffffff40',
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.circle2,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: colorScheme === 'dark' ? '#764ba240' : '#ffffff40',
            }
          ]} 
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#ffffff' }]}>
              🎵 Audio Encryption
            </Text>
            <Text style={[styles.subtitle, { color: '#ffffff90' }]}>
              Transform your audio into secure visual art
            </Text>
          </View>

          {/* Main Card */}
          <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
            
            {!loading && !conversionResult && (
              <>
                {/* File Picker Section */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📁 Select Audio File
                  </Text>
                  
                  <View style={styles.inputMethodsContainer}>
                    {/* File Picker Button */}
                    <TouchableOpacity
                      style={[styles.inputMethodButton, { borderColor: colors.tint }]}
                      onPress={handleFilePick}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={colorScheme === 'dark' 
                          ? ['#667eea', '#764ba2']
                          : ['#667eea', '#764ba2']
                        }
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.filePickerIcon}>📂</Text>
                        <Text style={styles.filePickerText}>Choose File</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Microphone Button */}
                    <TouchableOpacity
                      style={[styles.inputMethodButton, { borderColor: isRecording ? '#ff4444' : colors.tint }]}
                      onPress={isRecording ? stopRecording : startRecording}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={isRecording 
                          ? ['#ff4444', '#cc0000']
                          : ['#f093fb', '#f5576c']
                        }
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.filePickerIcon}>
                          {isRecording ? '⏹️' : '🎤'}
                        </Text>
                        <Text style={styles.filePickerText}>
                          {isRecording ? 'Stop' : 'Record'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Recording Duration */}
                  {isRecording && (
                    <View style={[styles.recordingIndicator, { backgroundColor: colors.tint + '20' }]}>
                      <View style={styles.recordingDot} />
                      <Text style={[styles.recordingText, { color: colors.text }]}>
                        Recording: {formatDuration(recordingDuration)}
                      </Text>
                    </View>
                  )}

                  {selectedFile && (
                    <Animated.View 
                      style={[
                        styles.fileInfo,
                        { 
                          backgroundColor: colors.tint + '10',
                          transform: [{ scale: scaleAnim }]
                        }
                      ]}
                    >
                      <View style={styles.fileInfoHeader}>
                        <Text style={styles.fileEmoji}>🎵</Text>
                        <View style={styles.fileDetails}>
                          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                            {selectedFile.name}
                          </Text>
                          <Text style={[styles.fileSize, { color: colors.icon }]}>
                            {formatFileSize(selectedFile.size || 0)}
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  )}
                </View>

                {/* Options Section - Simplified */}
                {selectedFile && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      ⚙️ Conversion Options
                    </Text>

                    {/* Compress Option */}
                    <View style={styles.optionGroup}>
                      <TouchableOpacity
                        style={[
                          styles.compressOption,
                          {
                            backgroundColor: options.compress 
                              ? colors.tint + '20'
                              : colors.background,
                            borderColor: colors.tint + '30',
                          }
                        ]}
                        onPress={() => setOptions({ compress: !options.compress })}
                      >
                        <Text style={styles.compressIcon}>
                          {options.compress ? '✅' : '⬜'}
                        </Text>
                        <View style={styles.compressTextContainer}>
                          <Text style={[styles.compressTitle, { color: colors.text }]}>
                            Enable Compression
                          </Text>
                          <Text style={[styles.compressSubtitle, { color: colors.icon }]}>
                            Reduce file size by 30-50%
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Convert Button */}
                {selectedFile && (
                  <TouchableOpacity
                    style={styles.convertButton}
                    onPress={handleConvert}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.convertGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.convertButtonText}>
                        ✨ Start Encryption
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Text style={styles.loadingIcon}>🔄</Text>
                </Animated.View>
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Encrypting your audio...
                </Text>
                
                {/* Animated Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: colors.background }]}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.progressGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </Animated.View>
                </View>
                
                <Text style={[styles.progressText, { color: colors.icon }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            )}

            {/* Results */}
            {conversionResult && !loading && (
              <View style={styles.resultsContainer}>
                <View style={styles.successHeader}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Encryption Complete!
                  </Text>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={styles.statEmoji}>🖼️</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {conversionResult.images?.length || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.icon }]}>Images</Text>
                  </View>
                  
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={styles.statEmoji}>📦</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatFileSize(conversionResult.totalSize || 0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.icon }]}>Total Size</Text>
                  </View>
                  
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={styles.statEmoji}>✓</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {downloadedFiles.size}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.icon }]}>Saved</Text>
                  </View>
                </View>

                {/* Files List */}
                {conversionResult.images && conversionResult.images.length > 0 && (
                  <View style={[styles.filesCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.filesCardTitle, { color: colors.text }]}>
                      📂 Generated Files
                    </Text>
                    
                    <ScrollView style={styles.filesList} nestedScrollEnabled>
                      {conversionResult.images.map((fileName: string, index: number) => {
                        const isDownloaded = downloadedFiles.has(fileName);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.fileItem,
                              {
                                backgroundColor: isDownloaded 
                                  ? colors.tint + '15'
                                  : colors.card,
                                borderColor: colors.tint + '20',
                              }
                            ]}
                            onPress={() => handleDownloadSingle(fileName)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.fileItemLeft}>
                              <Text style={styles.fileItemIcon}>
                                {fileName.endsWith('.json') ? '📋' : '🖼️'}
                              </Text>
                              <View style={styles.fileItemInfo}>
                                <Text 
                                  style={[styles.fileItemName, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {fileName}
                                </Text>
                                <Text style={[styles.fileItemStatus, { color: colors.icon }]}>
                                  {isDownloaded ? '✓ Saved locally' : 'Tap to download'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={[
                              styles.downloadButton,
                              { backgroundColor: isDownloaded ? colors.tint + '20' : colors.tint }
                            ]}>
                              <Text style={styles.downloadButtonText}>
                                {isDownloaded ? '✓' : '⬇'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* New Conversion Button */}
                <TouchableOpacity
                  style={[styles.newConversionButton, { borderColor: colors.tint }]}
                  onPress={handleNewConversion}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.newConversionText, { color: colors.tint }]}>
                    🔄 New Encryption
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.card + '80' }]}>
            <Text style={styles.infoEmoji}>ℹ️</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Your audio is encrypted into visual patterns. Keep the generated images safe to decrypt your audio later.
            </Text>
          </View>
        </Animated.View>
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
    height: height * 0.5,
  },
  circlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 100,
    left: -50,
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    marginBottom: 16,
  },
  inputMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputMethodButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
  },
  recordingText: {
    fontSize: 15,
    fontWeight: '700',
  },
  filePickerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  gradientButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  filePickerIcon: {
    fontSize: 24,
  },
  filePickerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  fileInfo: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  fileInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileEmoji: {
    fontSize: 32,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionGroup: {
    marginBottom: 20,
  },
  compressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  compressIcon: {
    fontSize: 24,
  },
  compressTextContainer: {
    flex: 1,
  },
  compressTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  compressSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  convertButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  convertGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  convertButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingVertical: 20,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  filesCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  filesList: {
    maxHeight: 250,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  fileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileItemIcon: {
    fontSize: 28,
  },
  fileItemInfo: {
    flex: 1,
  },
  fileItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileItemStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  newConversionButton: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newConversionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
});
