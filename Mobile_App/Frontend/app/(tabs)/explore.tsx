import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, Switch, ScrollView, Linking } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [storageUsed, setStorageUsed] = useState('0 MB');
  const [totalConversions, setTotalConversions] = useState(0);

  useEffect(() => {
    loadSettings();
    calculateStorage();
  }, []);

  const loadSettings = async () => {
    try {
      const notifEnabled = await AsyncStorage.getItem('notifications_enabled');
      const autoDownloadEnabled = await AsyncStorage.getItem('auto_download');
      const conversionsCount = await AsyncStorage.getItem('total_conversions');
      
      if (notifEnabled !== null) setNotifications(notifEnabled === 'true');
      if (autoDownloadEnabled !== null) setAutoDownload(autoDownloadEnabled === 'true');
      if (conversionsCount !== null) setTotalConversions(parseInt(conversionsCount));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const calculateStorage = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      if (dirInfo.exists) {
        const sizeInMB = (dirInfo.size || 0) / (1024 * 1024);
        setStorageUsed(sizeInMB.toFixed(2) + ' MB');
      }
    } catch (error) {
      console.error('Failed to calculate storage:', error);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem('notifications_enabled', value.toString());
    Alert.alert('Notifications', `Notifications ${value ? 'enabled' : 'disabled'}`);
  };

  const toggleAutoDownload = async (value: boolean) => {
    setAutoDownload(value);
    await AsyncStorage.setItem('auto_download', value.toString());
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will delete all cached files. Your conversions in the database will remain safe. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const dir = FileSystem.documentDirectory;
              if (dir) {
                const files = await FileSystem.readDirectoryAsync(dir);
                for (const file of files) {
                  await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
                }
              }
              setStorageUsed('0 MB');
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      '🎵 EchoCipher',
      'Version 1.0.0\n\nSecure audio steganography app\n\nEncrypt audio files into images with AES-256-GCM encryption.\n\n© 2025 EchoCipher',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your data is encrypted end-to-end. All conversions are stored securely in the cloud with encrypted master keys. We never access your audio files or encryption keys.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = async () => {
    Alert.alert(
      'Help & Support',
      'Need assistance?\n\nEmail: support@echocipher.com\nDocs: echocipher.com/docs',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@echocipher.com') }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/splash');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f0f4ff', '#e8f0ff']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={[styles.profileCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
          {user?.profilePicture ? (
            <Image 
              source={{ uri: user.profilePicture }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.tint }]}>
              <Text style={styles.profileInitial}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.name || 'User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.icon }]}>
              {user?.email || 'user@example.com'}
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={[styles.statsContainer, { backgroundColor: colors.tint + '08' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{totalConversions}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Conversions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.icon + '30' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{storageUsed}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Storage Used</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        
        <ToggleSettingItem 
          icon="🔔" 
          title="Push Notifications" 
          subtitle="Get notified when conversions complete"
          colors={colors}
          value={notifications}
          onToggle={toggleNotifications}
        />
        
        <ToggleSettingItem 
          icon="📥" 
          title="Auto Download" 
          subtitle="Automatically save decoded audio"
          colors={colors}
          value={autoDownload}
          onToggle={toggleAutoDownload}
        />

        {/* Storage Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage</Text>
        
        <TouchableOpacity onPress={handleClearCache}>
          <SettingItem 
            icon="🗑️" 
            title="Clear Cache" 
            subtitle="Free up storage space"
            colors={colors}
            showArrow
          />
        </TouchableOpacity>

        {/* Information Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Information</Text>
        
        <TouchableOpacity onPress={handleAbout}>
          <SettingItem 
            icon="ℹ️" 
            title="About" 
            subtitle="Version 1.0.0"
            colors={colors}
            showArrow
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrivacy}>
          <SettingItem 
            icon="🔒" 
            title="Privacy Policy" 
            subtitle="How we protect your data"
            colors={colors}
            showArrow
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleHelp}>
          <SettingItem 
            icon="❓" 
            title="Help & Support" 
            subtitle="Get assistance"
            colors={colors}
            showArrow
          />
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#FF3B30' }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle: string;
  colors: any;
  showArrow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, subtitle, colors, showArrow = false }) => (
  <View style={[styles.settingItem, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingTextContainer}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.settingSubtitle, { color: colors.icon }]}>{subtitle}</Text>
    </View>
    {showArrow && <Text style={[styles.settingArrow, { color: colors.icon }]}>›</Text>}
  </View>
);

interface ToggleSettingItemProps extends SettingItemProps {
  value: boolean;
  onToggle: (value: boolean) => void;
}

const ToggleSettingItem: React.FC<ToggleSettingItemProps> = ({ icon, title, subtitle, colors, value, onToggle }) => (
  <View style={[styles.settingItem, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '20' }]}>
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingTextContainer}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.settingSubtitle, { color: colors.icon }]}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.icon + '30', true: colors.tint + '80' }}
      thumbColor={value ? colors.tint : '#f4f3f4'}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profileImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  settingArrow: {
    fontSize: 20,
    marginLeft: 8,
    fontWeight: '300',
  },
  signOutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

