import { fetch } from 'expo/fetch';
import { getApiUrl } from './query-client';

export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  pe: number;
  eps: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const base = getApiUrl();
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const stockApi = {
  getQuote: (symbol: string) => apiFetch<StockQuote>(`/api/stocks/quote/${symbol}`),
  search: (q: string) => apiFetch<StockQuote[]>(`/api/stocks/search?q=${encodeURIComponent(q)}`),
  trending: () => apiFetch<StockQuote[]>('/api/stocks/trending'),
  movers: () => apiFetch<StockQuote[]>('/api/stocks/movers'),
  indices: () => apiFetch<MarketIndex[]>('/api/stocks/indices'),
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChat(
  message: string,
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const base = getApiUrl();
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
      onError('Failed to connect to AI');
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done) { onDone(); return; }
          if (data.error) { onError(data.error); return; }
          if (data.content) onChunk(data.content);
        } catch {}
      }
    }
    onDone();
  } catch (err: any) {
    onError(err.message || 'Network error');
  }
}
