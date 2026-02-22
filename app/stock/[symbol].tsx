import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { stockApi } from '@/lib/api';

function formatNum(n: number) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString();
}

function formatVol(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: color || colors.text }]}>{value}</Text>
    </View>
  );
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const quoteQ = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => stockApi.getQuote(symbol || ''),
    refetchInterval: 15000,
    enabled: !!symbol,
  });

  const stock = quoteQ.data;
  const inWatch = isInWatchlist(symbol || '');
  const isPositive = (stock?.change || 0) >= 0;

  const toggleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (inWatch) removeFromWatchlist(symbol!);
    else addToWatchlist(symbol!);
  };

  if (!stock) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + webTop + 8, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100, paddingHorizontal: 16 }}>
        <View style={styles.topNav}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={toggleWatchlist} hitSlop={12}>
            <Ionicons name={inWatch ? "bookmark" : "bookmark-outline"} size={24} color={inWatch ? colors.warning : colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.priceSection}>
          <View style={[styles.stockBadge, { backgroundColor: colors.tint + '15' }]}>
            <Text style={[styles.stockBadgeText, { color: colors.tint }]}>{stock.symbol}</Text>
          </View>
          <Text style={[styles.stockFullName, { color: colors.textSecondary }]}>{stock.name}</Text>
          <Text style={[styles.priceMain, { color: colors.text }]}>${stock.price.toFixed(2)}</Text>
          <View style={[styles.changeRow]}>
            <View style={[styles.changePill, { backgroundColor: isPositive ? colors.positive + '15' : colors.negative + '15' }]}>
              <Ionicons name={isPositive ? "caret-up" : "caret-down"} size={12} color={isPositive ? colors.positive : colors.negative} />
              <Text style={[styles.changeAmount, { color: isPositive ? colors.positive : colors.negative }]}>
                ${Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
              </Text>
            </View>
            <Text style={[styles.sectorTag, { color: colors.textTertiary }]}>{stock.sector}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/(tabs)/chat', params: {} });
            }}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient colors={['#3B82F6', '#6366F1']} style={styles.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.actionText}>AI Analysis</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={toggleWatchlist}
            style={({ pressed }) => [styles.actionBtnOutline, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name={inWatch ? "bookmark" : "bookmark-outline"} size={18} color={colors.tint} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.tint }]}>{inWatch ? 'Saved' : 'Watch'}</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Statistics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard label="Open" value={`$${stock.open.toFixed(2)}`} />
          <MetricCard label="Previous Close" value={`$${stock.previousClose.toFixed(2)}`} />
          <MetricCard label="Day High" value={`$${stock.dayHigh.toFixed(2)}`} color={colors.positive} />
          <MetricCard label="Day Low" value={`$${stock.dayLow.toFixed(2)}`} color={colors.negative} />
          <MetricCard label="Volume" value={formatVol(stock.volume)} />
          <MetricCard label="Market Cap" value={formatNum(stock.marketCap)} />
          <MetricCard label="P/E Ratio" value={stock.pe.toFixed(2)} />
          <MetricCard label="EPS" value={`$${stock.eps.toFixed(2)}`} />
          <MetricCard label="Div Yield" value={`${stock.dividendYield.toFixed(2)}%`} />
          <MetricCard label="52W High" value={`$${stock.week52High.toFixed(2)}`} color={colors.positive} />
          <MetricCard label="52W Low" value={`$${stock.week52Low.toFixed(2)}`} color={colors.negative} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  priceSection: { marginBottom: 24 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 },
  stockBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  stockFullName: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  priceMain: { fontSize: 40, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  changeAmount: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sectorTag: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  actionButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12 },
  actionText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12, borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 14 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '47%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  metricLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  metricValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
