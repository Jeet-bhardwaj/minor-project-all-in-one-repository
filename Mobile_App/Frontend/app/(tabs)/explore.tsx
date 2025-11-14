import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

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

      {/* Settings Options */}
      <View style={styles.settingsContainer}>
        <SettingItem 
          icon="🔔" 
          title="Notifications" 
          subtitle="Manage push notifications"
          colors={colors}
        />
        <SettingItem 
          icon="🎨" 
          title="Theme" 
          subtitle={`Current: ${isDark ? 'Dark' : 'Light'}`}
          colors={colors}
        />
        <SettingItem 
          icon="📱" 
          title="About" 
          subtitle="Version 1.0.0"
          colors={colors}
        />
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: '#FF3B30' }]}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle: string;
  colors: any;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, subtitle, colors }) => (
  <View style={[styles.settingItem, { borderBottomColor: colors.icon + '20' }]}>
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingTextContainer}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.settingSubtitle, { color: colors.icon }]}>{subtitle}</Text>
    </View>
    <Text style={[styles.settingArrow, { color: colors.icon }]}>›</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
  },
  settingsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  settingArrow: {
    fontSize: 18,
    marginLeft: 8,
  },
  signOutButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

