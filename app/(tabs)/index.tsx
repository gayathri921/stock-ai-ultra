import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { stockApi, type StockQuote, type MarketIndex } from '@/lib/api';

function IndexCard({ index: idx }: { index: MarketIndex }) {
  const { colors } = useTheme();
  const isPositive = idx.change >= 0;
  return (
    <View style={[styles.indexCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text style={[styles.indexName, { color: colors.textSecondary }]}>{idx.name}</Text>
      <Text style={[styles.indexValue, { color: colors.text }]}>{idx.value.toLocaleString()}</Text>
      <View style={[styles.changePill, { backgroundColor: isPositive ? colors.positive + '18' : colors.negative + '18' }]}>
        <Ionicons name={isPositive ? "caret-up" : "caret-down"} size={10} color={isPositive ? colors.positive : colors.negative} />
        <Text style={[styles.changeText, { color: isPositive ? colors.positive : colors.negative }]}>
          {Math.abs(idx.changePercent).toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

function StockRow({ stock, onPress }: { stock: StockQuote; onPress: () => void }) {
  const { colors } = useTheme();
  const isPositive = stock.change >= 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stockRow, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.stockLeft}>
        <View style={[styles.stockIcon, { backgroundColor: colors.tint + '15' }]}>
          <Text style={[styles.stockIconText, { color: colors.tint }]}>{stock.symbol.slice(0, 2)}</Text>
        </View>
        <View>
          <Text style={[styles.stockSymbol, { color: colors.text }]}>{stock.symbol}</Text>
          <Text style={[styles.stockName, { color: colors.textSecondary }]} numberOfLines={1}>{stock.name}</Text>
        </View>
      </View>
      <View style={styles.stockRight}>
        <Text style={[styles.stockPrice, { color: colors.text }]}>${stock.price.toFixed(2)}</Text>
        <View style={[styles.stockChangePill, { backgroundColor: isPositive ? colors.positive + '15' : colors.negative + '15' }]}>
          <Ionicons name={isPositive ? "caret-up" : "caret-down"} size={9} color={isPositive ? colors.positive : colors.negative} />
          <Text style={[styles.stockChangeText, { color: isPositive ? colors.positive : colors.negative }]}>
            {Math.abs(stock.changePercent).toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function MarketsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const indicesQ = useQuery({ queryKey: ['indices'], queryFn: stockApi.indices, refetchInterval: 30000 });
  const trendingQ = useQuery({ queryKey: ['trending'], queryFn: stockApi.trending, refetchInterval: 30000 });
  const moversQ = useQuery({ queryKey: ['movers'], queryFn: stockApi.movers, refetchInterval: 30000 });
  const searchQ = useQuery({
    queryKey: ['search', search],
    queryFn: () => stockApi.search(search),
    enabled: search.length > 0,
  });

  const onRefresh = useCallback(() => {
    indicesQ.refetch();
    trendingQ.refetch();
    moversQ.refetch();
  }, []);

  const navigateToStock = (symbol: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/stock/[symbol]', params: { symbol } });
  };

  const displayStocks = search.length > 0 ? (searchQ.data || []) : (trendingQ.data || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayStocks}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={{ paddingTop: insets.top + webTop + 16, paddingBottom: 100, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.greeting, { color: colors.text }]}>Markets</Text>
              <View style={[styles.liveDot, { backgroundColor: colors.positive }]} />
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search stocks..."
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {search.length === 0 && (
              <>
                <FlatList
                  data={indicesQ.data || []}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => <IndexCard index={item} />}
                  contentContainerStyle={{ gap: 10, marginBottom: 24 }}
                  scrollEnabled={!!(indicesQ.data && indicesQ.data.length > 0)}
                />

                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Movers</Text>
                </View>
                <FlatList
                  data={moversQ.data || []}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.symbol}
                  renderItem={({ item }) => {
                    const isPositive = item.change >= 0;
                    return (
                      <Pressable
                        onPress={() => navigateToStock(item.symbol)}
                        style={({ pressed }) => [styles.moverCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Text style={[styles.moverSymbol, { color: colors.text }]}>{item.symbol}</Text>
                        <Text style={[styles.moverPrice, { color: colors.text }]}>${item.price.toFixed(2)}</Text>
                        <Text style={[styles.moverChange, { color: isPositive ? colors.positive : colors.negative }]}>
                          {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </Text>
                      </Pressable>
                    );
                  }}
                  contentContainerStyle={{ gap: 10, marginBottom: 24 }}
                  scrollEnabled={!!(moversQ.data && moversQ.data.length > 0)}
                />

                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending</Text>
                </View>
              </>
            )}

            {search.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Results</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <StockRow stock={item} onPress={() => navigateToStock(item.symbol)} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 68 }} />}
        ListEmptyComponent={
          search.length > 0 && !searchQ.isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No stocks found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 44, gap: 10, marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', height: '100%' },
  indexCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, minWidth: 130 },
  indexName: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  indexValue: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  changeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  moverCard: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, minWidth: 110, alignItems: 'center' },
  moverSymbol: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  moverPrice: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  moverChange: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  stockLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  stockIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stockIconText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  stockSymbol: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  stockName: { fontSize: 13, fontFamily: 'Inter_400Regular', maxWidth: 150 },
  stockRight: { alignItems: 'flex-end' },
  stockPrice: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  stockChangePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stockChangeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
