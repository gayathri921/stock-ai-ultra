import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hashPassword(password: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + 'stockai_salt_v1'
  );
  return digest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('auth_user');
        if (stored) setUser(JSON.parse(stored));
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const usersStr = await AsyncStorage.getItem('registered_users');
      const users: Record<string, { id: string; name: string; email: string; passwordHash: string }> = usersStr ? JSON.parse(usersStr) : {};
      const userRecord = users[email.toLowerCase()];
      if (!userRecord) return { success: false, error: 'Account not found' };

      const hash = await hashPassword(password);
      if (hash !== userRecord.passwordHash) return { success: false, error: 'Invalid password' };

      const u: User = { id: userRecord.id, email: userRecord.email, name: userRecord.name };
      await AsyncStorage.setItem('auth_user', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const usersStr = await AsyncStorage.getItem('registered_users');
      const users: Record<string, any> = usersStr ? JSON.parse(usersStr) : {};
      if (users[email.toLowerCase()]) return { success: false, error: 'Email already registered' };

      const hash = await hashPassword(password);
      const id = Crypto.randomUUID();
      users[email.toLowerCase()] = { id, name, email: email.toLowerCase(), passwordHash: hash };
      await AsyncStorage.setItem('registered_users', JSON.stringify(users));

      const u: User = { id, email: email.toLowerCase(), name };
      await AsyncStorage.setItem('auth_user', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch {
      return { success: false, error: 'Signup failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }), [user, isLoading, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
