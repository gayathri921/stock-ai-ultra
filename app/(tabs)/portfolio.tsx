import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Platform, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { usePortfolio, type PortfolioItem } from '@/contexts/PortfolioContext';
import { stockApi, type StockQuote } from '@/lib/api';

function formatCurrency(n: number) {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function HoldingRow({ holding, quote, onRemove }: { holding: PortfolioItem; quote?: StockQuote; onRemove: () => void }) {
  const { colors } = useTheme();
  const currentPrice = quote?.price || holding.buyPrice;
  const totalValue = currentPrice * holding.quantity;
  const totalCost = holding.buyPrice * holding.quantity;
  const pnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const isPositive = pnl >= 0;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/stock/[symbol]', params: { symbol: holding.symbol } }); }}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Alert.alert('Remove', `Remove ${holding.symbol} from portfolio?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: onRemove }]); }}
      style={({ pressed }) => [styles.holdingRow, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.holdingLeft}>
        <View style={[styles.holdingIcon, { backgroundColor: isPositive ? colors.positive + '15' : colors.negative + '15' }]}>
          <Ionicons name={isPositive ? "trending-up" : "trending-down"} size={18} color={isPositive ? colors.positive : colors.negative} />
        </View>
        <View>
          <Text style={[styles.holdingSymbol, { color: colors.text }]}>{holding.symbol}</Text>
          <Text style={[styles.holdingQty, { color: colors.textSecondary }]}>{holding.quantity} shares @ ${holding.buyPrice.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.holdingRight}>
        <Text style={[styles.holdingValue, { color: colors.text }]}>{formatCurrency(totalValue)}</Text>
        <Text style={[styles.holdingPnl, { color: isPositive ? colors.positive : colors.negative }]}>
          {isPositive ? '+' : ''}{formatCurrency(pnl)} ({pnlPct.toFixed(1)}%)
        </Text>
      </View>
    </Pressable>
  );
}

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { holdings, removeHolding, addHolding } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const [addSymbol, setAddSymbol] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const symbols = holdings.map(h => h.symbol);
  const quotesQ = useQuery({
    queryKey: ['portfolio-quotes', symbols.join(',')],
    queryFn: async () => {
      const quotes: Record<string, StockQuote> = {};
      await Promise.all(symbols.map(async s => {
        try { quotes[s] = await stockApi.getQuote(s); } catch {}
      }));
      return quotes;
    },
    refetchInterval: 30000,
    enabled: symbols.length > 0,
  });

  const quotes = quotesQ.data || {};
  const totalValue = holdings.reduce((sum, h) => sum + (quotes[h.symbol]?.price || h.buyPrice) * h.quantity, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPositive = totalPnl >= 0;

  const handleAdd = async () => {
    const sym = addSymbol.toUpperCase().trim();
    const qty = parseInt(addQty);
    const price = parseFloat(addPrice);
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      Alert.alert('Invalid', 'Please enter valid stock details');
      return;
    }
    let name = sym;
    try { const q = await stockApi.getQuote(sym); name = q.name; } catch {}
    await addHolding({ symbol: sym, name, quantity: qty, buyPrice: price, addedAt: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setAddSymbol('');
    setAddQty('');
    setAddPrice('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={holdings}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={{ paddingTop: insets.top + webTop + 16, paddingBottom: 100, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => quotesQ.refetch()} tintColor={colors.tint} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }} hitSlop={8}>
                <Ionicons name="add-circle" size={28} color={colors.tint} />
              </Pressable>
            </View>

            <LinearGradient
              colors={isPositive ? ['#059669', '#10B981'] : ['#DC2626', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
              <View style={styles.summaryRow}>
                <Ionicons name={isPositive ? "trending-up" : "trending-down"} size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.summaryPnl}>
                  {isPositive ? '+' : ''}{formatCurrency(totalPnl)} ({totalPnlPct.toFixed(2)}%)
                </Text>
              </View>
              <Text style={styles.summaryInvested}>Invested: {formatCurrency(totalCost)}</Text>
            </LinearGradient>

            {holdings.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Holdings</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <HoldingRow holding={item} quote={quotes[item.symbol]} onRemove={() => removeHolding(item.symbol)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 60 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No holdings yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Tap + to add your first stock</Text>
          </View>
        }
      />

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Stock</Text>
              <Pressable onPress={() => setShowAdd(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <TextInput style={[styles.modalInputText, { color: colors.text }]} placeholder="Symbol (e.g. AAPL)" placeholderTextColor={colors.textTertiary} value={addSymbol} onChangeText={setAddSymbol} autoCapitalize="characters" />
            </View>
            <View style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <TextInput style={[styles.modalInputText, { color: colors.text }]} placeholder="Quantity" placeholderTextColor={colors.textTertiary} value={addQty} onChangeText={setAddQty} keyboardType="numeric" />
            </View>
            <View style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <TextInput style={[styles.modalInputText, { color: colors.text }]} placeholder="Buy price ($)" placeholderTextColor={colors.textTertiary} value={addPrice} onChangeText={setAddPrice} keyboardType="decimal-pad" />
            </View>
            <Pressable onPress={handleAdd} style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient colors={['#3B82F6', '#6366F1']} style={styles.addButtonGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.addButtonText}>Add to Portfolio</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryPnl: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  summaryInvested: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  holdingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  holdingSymbol: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  holdingQty: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  holdingPnl: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalInput: { borderRadius: 12, borderWidth: 1, height: 48, paddingHorizontal: 14, justifyContent: 'center' },
  modalInputText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  addButton: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  addButtonGrad: { height: 50, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
