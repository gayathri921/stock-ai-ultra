import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { getStockQuote, searchStocks, getTrendingStocks, getTopMovers, getMarketIndices, getAllSymbols } from "./stockData";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/stocks/quote/:symbol", (req: Request, res: Response) => {
    const quote = getStockQuote(req.params.symbol);
    if (!quote) return res.status(404).json({ error: "Stock not found" });
    res.json(quote);
  });

  app.get("/api/stocks/search", (req: Request, res: Response) => {
    const q = (req.query.q as string) || "";
    res.json(searchStocks(q));
  });

  app.get("/api/stocks/trending", (_req: Request, res: Response) => {
    res.json(getTrendingStocks());
  });

  app.get("/api/stocks/movers", (_req: Request, res: Response) => {
    res.json(getTopMovers());
  });

  app.get("/api/stocks/indices", (_req: Request, res: Response) => {
    res.json(getMarketIndices());
  });

  app.get("/api/stocks/symbols", (_req: Request, res: Response) => {
    res.json(getAllSymbols());
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, history = [] } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const symbols = getAllSymbols();
      const mentionedStocks = symbols.filter(s =>
        message.toUpperCase().includes(s)
      );
      let stockContext = "";
      if (mentionedStocks.length > 0) {
        const quotes = mentionedStocks.map(s => {
          const q = getStockQuote(s);
          return q ? `${q.symbol}: $${q.price} (${q.change >= 0 ? '+' : ''}${q.changePercent}%), Volume: ${(q.volume / 1000000).toFixed(1)}M, P/E: ${q.pe}, Market Cap: $${(q.marketCap / 1000000000).toFixed(1)}B` : '';
        }).filter(Boolean).join('\n');
        stockContext = `\n\nCurrent market data:\n${quotes}`;
      }

      const indices = getMarketIndices();
      const indexContext = indices.map(i => `${i.name}: ${i.value} (${i.change >= 0 ? '+' : ''}${i.changePercent}%)`).join(', ');

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are StockAI, an expert financial analyst and stock market advisor. You provide insightful analysis of stocks, market trends, and investment strategies.

Current market indices: ${indexContext}${stockContext}

When analyzing stocks, provide:
1. A brief summary of the stock's current position
2. A clear BUY, HOLD, or SELL recommendation
3. A confidence percentage (e.g., 75%)
4. Risk level (Low, Medium, High)
5. Simple explanation of your reasoning
6. Always include a disclaimer that this is AI-generated analysis, not financial advice

Keep responses concise and well-structured. Use bullet points for clarity. Be specific with data points.`
        },
        ...history.map((h: { role: string; content: string }) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: message },
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        stream: true,
        max_completion_tokens: 8192,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process chat" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
