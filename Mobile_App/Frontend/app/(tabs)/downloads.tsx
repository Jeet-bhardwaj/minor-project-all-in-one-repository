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
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { gridfsApi, UserConversion } from '@/services/api';
import { Audio } from 'expo-av';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [conversions, setConversions] = useState<UserConversion[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

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
      Alert.alert('Error', 'Failed to load conversion history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversions();
    setRefreshing(false);
  };

  const handleDownloadZip = async (conversion: UserConversion) => {
    try {
      setDownloadingId(conversion.conversionId);

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.67:3000/api';
      const zipUrl = `${baseUrl}/v2/conversions/${userId}/${conversion.conversionId}/download-zip`;

      console.log('📥 Downloading ZIP from:', zipUrl);

      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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
            const zipFileName = `encrypted_${conversion.conversionId}.zip`;
            const zipUri = downloadsDir + zipFileName;

            await FileSystem.writeAsStringAsync(zipUri, base64data, { encoding: 'base64' });
            console.log('✅ ZIP saved to:', zipUri);

            Alert.alert(
              '✨ Success!',
              `ZIP file downloaded!\n\nLocation: ${downloadsDir}\nFile: ${zipFileName}`,
              [
                {
                  text: 'Share',
                  onPress: async () => {
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(zipUri, {
                        mimeType: 'application/zip',
                        dialogTitle: 'Share encrypted images (ZIP)',
                      });
                    }
                  },
                },
                {
                  text: 'OK',
                  style: 'cancel',
                },
              ]
            );
            resolve(zipUri);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
      });
    } catch (error: any) {
      console.error('❌ Failed to download ZIP:', error);
      Alert.alert('⚠️ Download Failed', error.message || 'Could not download ZIP file');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (conversion: UserConversion) => {
    Alert.alert(
      'Delete Conversion',
      `Are you sure you want to delete "${conversion.originalFileName}"?\n\nThis will delete all encrypted images from the database.`,
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
              setDeletingId(conversion.conversionId);
              await gridfsApi.deleteConversion(userId, conversion.conversionId);
              Alert.alert('✅ Deleted', 'Conversion deleted successfully');
              loadConversions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversion');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderConversionItem = (conversion: UserConversion) => {
    const isDeleting = deletingId === conversion.conversionId;
    const isDownloading = downloadingId === conversion.conversionId;

    return (
      <View
        key={conversion.conversionId}
        style={[
          styles.conversionCard,
          { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' },
        ]}
      >
        <View style={styles.conversionHeader}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
            🎵 {conversion.originalFileName}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.icon }]}>{conversion.createdAgo}</Text>
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

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.icon }]}>Created:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {new Date(conversion.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.conversionActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton, { backgroundColor: colors.tint }]}
            onPress={() => handleDownloadZip(conversion)}
            disabled={isDownloading || isDeleting}
          >
            {isDownloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>📥 Download ZIP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(conversion)}
            disabled={isDownloading || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#ff4444" size="small" />
            ) : (
              <Text style={[styles.actionButtonText, { color: '#ff4444' }]}>🗑️ Delete</Text>
            )}
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
          <Text style={[styles.title, { color: colors.text }]}>🕐 Conversion History</Text>
        </View>
      </LinearGradient>

      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' },
        ]}
      >
        <Text style={styles.infoIcon}>📜</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          View all your encrypted audio conversions stored in the database
        </Text>
      </View>

      {!userId && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No user ID found. Please create a conversion first.
          </Text>
        </View>
      )}

      {userId && (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.icon }]}>Loading conversions...</Text>
            </View>
          ) : conversions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No conversions found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                Create your first audio encryption in the Audio→Image tab
              </Text>
            </View>
          ) : (
            <View style={styles.conversionsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {conversions.length} Conversion{conversions.length !== 1 ? 's' : ''}
              </Text>
              {conversions.map(renderConversionItem)}
            </View>
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
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoIcon: {
    fontSize: 32,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  conversionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  conversionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  conversionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  timeAgo: {
    fontSize: 12,
  },
  conversionDetails: {
    marginBottom: 12,
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
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    flex: 2,
  },
  deleteButton: {
    backgroundColor: '#ffffff10',
    borderWidth: 1,
    borderColor: '#ff444430',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
