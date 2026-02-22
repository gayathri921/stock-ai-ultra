const STOCKS: Record<string, { name: string; sector: string; basePrice: number }> = {
  AAPL: { name: 'Apple Inc.', sector: 'Technology', basePrice: 198.50 },
  MSFT: { name: 'Microsoft Corp.', sector: 'Technology', basePrice: 428.80 },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Technology', basePrice: 175.20 },
  AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', basePrice: 197.30 },
  NVDA: { name: 'NVIDIA Corp.', sector: 'Technology', basePrice: 135.40 },
  TSLA: { name: 'Tesla Inc.', sector: 'Consumer Cyclical', basePrice: 248.90 },
  META: { name: 'Meta Platforms Inc.', sector: 'Technology', basePrice: 520.10 },
  JPM: { name: 'JPMorgan Chase & Co.', sector: 'Financial Services', basePrice: 205.60 },
  V: { name: 'Visa Inc.', sector: 'Financial Services', basePrice: 285.40 },
  JNJ: { name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 156.80 },
  WMT: { name: 'Walmart Inc.', sector: 'Consumer Defensive', basePrice: 172.30 },
  PG: { name: 'Procter & Gamble Co.', sector: 'Consumer Defensive', basePrice: 168.90 },
  UNH: { name: 'UnitedHealth Group Inc.', sector: 'Healthcare', basePrice: 532.40 },
  HD: { name: 'Home Depot Inc.', sector: 'Consumer Cyclical', basePrice: 370.20 },
  BAC: { name: 'Bank of America Corp.', sector: 'Financial Services', basePrice: 39.80 },
  DIS: { name: 'Walt Disney Co.', sector: 'Communication Services', basePrice: 112.50 },
  NFLX: { name: 'Netflix Inc.', sector: 'Communication Services', basePrice: 685.30 },
  AMD: { name: 'Advanced Micro Devices', sector: 'Technology', basePrice: 162.70 },
  CRM: { name: 'Salesforce Inc.', sector: 'Technology', basePrice: 268.40 },
  INTC: { name: 'Intel Corp.', sector: 'Technology', basePrice: 31.20 },
  PYPL: { name: 'PayPal Holdings Inc.', sector: 'Financial Services', basePrice: 72.80 },
  UBER: { name: 'Uber Technologies Inc.', sector: 'Technology', basePrice: 78.50 },
  SQ: { name: 'Block Inc.', sector: 'Technology', basePrice: 85.60 },
  SNAP: { name: 'Snap Inc.', sector: 'Communication Services', basePrice: 16.40 },
  COIN: { name: 'Coinbase Global Inc.', sector: 'Financial Services', basePrice: 258.90 },
};

function getVariation(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getStockPrice(symbol: string): number {
  const stock = STOCKS[symbol];
  if (!stock) return 0;
  const now = Date.now();
  const variation = getVariation(now / 60000 + symbol.charCodeAt(0));
  const pctChange = (variation - 0.5) * 0.06;
  return Math.round((stock.basePrice * (1 + pctChange)) * 100) / 100;
}

export function getStockQuote(symbol: string) {
  const stock = STOCKS[symbol.toUpperCase()];
  if (!stock) return null;

  const sym = symbol.toUpperCase();
  const price = getStockPrice(sym);
  const prevClose = STOCKS[sym].basePrice;
  const change = Math.round((price - prevClose) * 100) / 100;
  const changePercent = Math.round((change / prevClose) * 10000) / 100;

  const dayVar = getVariation(Date.now() / 3600000 + sym.charCodeAt(0));
  const volume = Math.round((5 + dayVar * 45) * 1000000);
  const marketCap = Math.round(price * (volume * 100 + 1000000000));

  return {
    symbol: sym,
    name: stock.name,
    sector: stock.sector,
    price,
    change,
    changePercent,
    previousClose: prevClose,
    open: Math.round((prevClose + (price - prevClose) * 0.3) * 100) / 100,
    dayHigh: Math.round((Math.max(price, prevClose) * 1.012) * 100) / 100,
    dayLow: Math.round((Math.min(price, prevClose) * 0.988) * 100) / 100,
    volume,
    marketCap,
    pe: Math.round((15 + dayVar * 30) * 100) / 100,
    eps: Math.round((price / (15 + dayVar * 30)) * 100) / 100,
    dividendYield: Math.round((dayVar * 3) * 100) / 100,
    week52High: Math.round((price * 1.25) * 100) / 100,
    week52Low: Math.round((price * 0.72) * 100) / 100,
  };
}

export function searchStocks(query: string) {
  const q = query.toLowerCase();
  return Object.entries(STOCKS)
    .filter(([sym, s]) => sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .map(([sym]) => getStockQuote(sym)!)
    .slice(0, 10);
}

export function getTrendingStocks() {
  const symbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'NFLX'];
  return symbols.map(s => getStockQuote(s)!);
}

export function getTopMovers() {
  return Object.keys(STOCKS)
    .map(s => getStockQuote(s)!)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);
}

export function getMarketIndices() {
  const now = Date.now();
  return [
    {
      name: 'S&P 500',
      value: Math.round((5420 + (getVariation(now / 60000) - 0.5) * 80) * 100) / 100,
      change: Math.round(((getVariation(now / 60000 + 1) - 0.5) * 40) * 100) / 100,
      changePercent: Math.round(((getVariation(now / 60000 + 1) - 0.5) * 0.8) * 100) / 100,
    },
    {
      name: 'NASDAQ',
      value: Math.round((17180 + (getVariation(now / 60000 + 2) - 0.5) * 200) * 100) / 100,
      change: Math.round(((getVariation(now / 60000 + 3) - 0.5) * 120) * 100) / 100,
      changePercent: Math.round(((getVariation(now / 60000 + 3) - 0.5) * 0.9) * 100) / 100,
    },
    {
      name: 'DOW',
      value: Math.round((39850 + (getVariation(now / 60000 + 4) - 0.5) * 300) * 100) / 100,
      change: Math.round(((getVariation(now / 60000 + 5) - 0.5) * 200) * 100) / 100,
      changePercent: Math.round(((getVariation(now / 60000 + 5) - 0.5) * 0.6) * 100) / 100,
    },
  ];
}

export function getAllSymbols() {
  return Object.keys(STOCKS);
}
