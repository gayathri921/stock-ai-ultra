import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  addedAt: string;
}

interface PortfolioContextValue {
  holdings: PortfolioItem[];
  watchlist: string[];
  addHolding: (item: PortfolioItem) => Promise<void>;
  removeHolding: (symbol: string) => Promise<void>;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  isInWatchlist: (symbol: string) => boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [holdings, setHoldings] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [h, w] = await Promise.all([
        AsyncStorage.getItem('portfolio_holdings'),
        AsyncStorage.getItem('portfolio_watchlist'),
      ]);
      if (h) setHoldings(JSON.parse(h));
      if (w) setWatchlist(JSON.parse(w));
    })();
  }, []);

  const addHolding = useCallback(async (item: PortfolioItem) => {
    setHoldings(prev => {
      const next = [...prev.filter(h => h.symbol !== item.symbol), item];
      AsyncStorage.setItem('portfolio_holdings', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeHolding = useCallback(async (symbol: string) => {
    setHoldings(prev => {
      const next = prev.filter(h => h.symbol !== symbol);
      AsyncStorage.setItem('portfolio_holdings', JSON.stringify(next));
      return next;
    });
  }, []);

  const addToWatchlist = useCallback(async (symbol: string) => {
    setWatchlist(prev => {
      if (prev.includes(symbol)) return prev;
      const next = [...prev, symbol];
      AsyncStorage.setItem('portfolio_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    setWatchlist(prev => {
      const next = prev.filter(s => s !== symbol);
      AsyncStorage.setItem('portfolio_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  const value = useMemo(() => ({
    holdings, watchlist, addHolding, removeHolding,
    addToWatchlist, removeFromWatchlist, isInWatchlist,
  }), [holdings, watchlist, addHolding, removeHolding, addToWatchlist, removeFromWatchlist, isInWatchlist]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
