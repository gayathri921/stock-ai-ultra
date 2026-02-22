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

export default function SignupScreen() {
  const { signup } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await signup(name.trim(), email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Signup failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + webTop + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
        bottomOffset={20}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your investment journey</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Full name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
            <TextInput
              ref={emailRef}
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
              placeholder="Password (min 6 chars)"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textTertiary} />
            <TextInput
              ref={confirmRef}
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSignup}
            />
          </View>

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.negative} />
              <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
            </View>
          )}

          <Pressable onPress={handleSignup} disabled={loading} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <Text style={[styles.linkTextBold, { color: colors.tint }]}>Sign In</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { marginBottom: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular' },
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
