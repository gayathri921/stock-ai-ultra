import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

function SettingRow({ icon, iconColor, label, subtitle, right, onPress, danger }: {
  icon: string; iconColor?: string; label: string; subtitle?: string;
  right?: React.ReactNode; onPress?: () => void; danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.settingRow, { opacity: pressed && onPress ? 0.7 : 1 }]}
    >
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || colors.tint) + '15' }]}>
        <Ionicons name={icon as any} size={20} color={danger ? colors.negative : (iconColor || colors.tint)} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: danger ? colors.negative : colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, mode } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    (async () => {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHw && isEnrolled);
      const saved = await AsyncStorage.getItem('biometric_enabled');
      setBiometricEnabled(saved === 'true');
    })();
  }, []);

  const toggleBiometric = async (val: boolean) => {
    if (val && biometricAvailable) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
      });
      if (!result.success) return;
    }
    setBiometricEnabled(val);
    await AsyncStorage.setItem('biometric_enabled', val.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert('Clear Data', 'This will reset all your portfolio and chat data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['portfolio_holdings', 'portfolio_watchlist']);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + webTop + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100, paddingHorizontal: 16 }}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="person" size={24} color={colors.tint} />
          </View>
          <View>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="moon-outline"
            iconColor="#6366F1"
            label="Dark Mode"
            subtitle={isDark ? 'On' : 'Off'}
            right={
              <Switch
                value={isDark}
                onValueChange={() => { toggleTheme(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: colors.inputBorder, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SECURITY</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="finger-print"
            iconColor="#10B981"
            label="Biometric Lock"
            subtitle={biometricAvailable ? (biometricEnabled ? 'Enabled' : 'Disabled') : 'Not available'}
            right={
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                disabled={!biometricAvailable}
                trackColor={{ false: colors.inputBorder, true: colors.positive }}
                thumbColor="#fff"
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="notifications-outline"
            iconColor="#F59E0B"
            label="Price Alerts"
            subtitle={notifications ? 'Enabled' : 'Disabled'}
            right={
              <Switch
                value={notifications}
                onValueChange={(v) => { setNotifications(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: colors.inputBorder, true: colors.warning }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DATA</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow icon="trash-outline" iconColor="#EF4444" label="Clear App Data" onPress={handleClearData} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </View>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>StockAI Ultra v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 28 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  profileEmail: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  section: { borderRadius: 14, borderWidth: 1, marginBottom: 24, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  settingSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
  versionText: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8 },
});
