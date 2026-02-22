import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const passRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + webTop + 60,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
        bottomOffset={20}
      >
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#3B82F6', '#6366F1']}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trending-up" size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.appName, { color: colors.text }]}>StockAI Ultra</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>AI-Powered Stock Intelligence</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
            <TextInput
              ref={passRef}
              style={[styles.input, { color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.negative} />
              <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
            </View>
          )}

          <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push('/signup')} style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Text style={[styles.linkTextBold, { color: colors.tint }]}>Sign Up</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  tagline: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 16, height: 54, gap: 12,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter_400Regular', height: '100%' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  button: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  linkText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkTextBold: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
