# StockAI Ultra

## Overview

StockAI Ultra is an AI-powered real-time stock intelligence mobile application. It provides stock market data (quotes, trending stocks, market indices), a portfolio tracker, an AI chat assistant for stock analysis, and user authentication. The app is built as a cross-platform React Native (Expo) frontend with a Node.js/Express backend API server.

The frontend runs as an Expo app (targeting iOS, Android, and web), while the backend serves stock data APIs and an AI-powered chat endpoint. Stock data is simulated using deterministic price variations (not pulling from a real market data API). The AI chat uses OpenAI (via Replit AI Integrations) to provide stock analysis and recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: React Native with Expo SDK 54, TypeScript, using the new architecture
- **Routing**: Expo Router v6 with file-based routing. Tab navigation with 4 tabs: Markets, Portfolio, AI Chat, Settings. Dynamic route for stock detail at `app/stock/[symbol].tsx`
- **State Management**: React Context for auth (`AuthContext`), theme (`ThemeContext`), and portfolio (`PortfolioContext`). React Query (`@tanstack/react-query`) for server data fetching with automatic refetching
- **Authentication**: Client-side only authentication using AsyncStorage. Passwords are hashed with SHA-256 (via `expo-crypto`) and stored locally. There is no server-side auth — user accounts are stored in AsyncStorage on-device
- **Theme System**: Dark/light mode support with theme persistence in AsyncStorage. Colors defined in `constants/colors.ts`
- **Data Persistence**: AsyncStorage for user data, portfolio holdings, watchlist, theme preferences, and biometric settings
- **UI Libraries**: `expo-linear-gradient`, `expo-blur`, `expo-haptics` for tactile feedback, `expo-image`, `@expo/vector-icons` (Ionicons), Inter font family from Google Fonts
- **Keyboard Handling**: `react-native-keyboard-controller` with a compat wrapper (`KeyboardAwareScrollViewCompat`) that falls back to regular ScrollView on web

### Backend (Express Server)

- **Runtime**: Node.js with Express 5, TypeScript compiled via `tsx` (dev) or `esbuild` (prod)
- **Entry Point**: `server/index.ts` — sets up CORS, JSON parsing, routes, and serves static files in production
- **API Routes** (defined in `server/routes.ts`):
  - `GET /api/stocks/quote/:symbol` — individual stock quote
  - `GET /api/stocks/search?q=` — search stocks by symbol/name
  - `GET /api/stocks/trending` — trending stocks list
  - `GET /api/stocks/movers` — top market movers
  - `GET /api/stocks/indices` — market indices (S&P 500, NASDAQ, etc.)
  - `GET /api/stocks/symbols` — all available symbols
  - `POST /api/chat` — AI chat with streaming SSE response
- **Stock Data** (`server/stockData.ts`): Simulated/mock stock data with 25 major stocks. Prices vary deterministically using sine-based variation seeded by current time, producing realistic-looking but fake price movements
- **AI Integration**: OpenAI client configured via Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`). The chat endpoint enriches user messages with real-time stock context before sending to the LLM
- **CORS**: Dynamic CORS based on Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`) plus localhost origins for development

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema** (`shared/schema.ts`): A `users` table with `id` (UUID), `username`, and `password` fields. Additional chat models in `shared/models/chat.ts` define `conversations` and `messages` tables
- **Config**: `drizzle.config.ts` uses `DATABASE_URL` environment variable. Migrations output to `./migrations`
- **Current Storage**: The server currently uses `MemStorage` (in-memory) in `server/storage.ts` rather than the database. The Drizzle-based chat storage in `server/replit_integrations/chat/storage.ts` does use the database via a `db` import from `server/db`
- **Schema Push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database

### Replit Integrations

Located in `server/replit_integrations/`, these are pre-built modules:
- **Chat**: Conversation CRUD with database persistence, SSE streaming
- **Audio**: Voice recording, speech-to-text, text-to-speech, voice chat with AudioWorklet playback
- **Image**: Image generation using `gpt-image-1` model
- **Batch**: Rate-limited batch processing with retry logic using `p-limit` and `p-retry`

### Build & Deployment

- **Development**: Two processes — `npm run expo:dev` (Expo dev server) and `npm run server:dev` (Express API)
- **Production Build**: `npm run expo:static:build` creates a static web build via custom script (`scripts/build.js`), `npm run server:build` bundles the server with esbuild, `npm run server:prod` runs the production server
- **Environment Variables**: `EXPO_PUBLIC_DOMAIN` for API URL resolution, `DATABASE_URL` for PostgreSQL, `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` for OpenAI
- **Post-install**: Uses `patch-package` for dependency patching

### Key Design Decisions

1. **Mock stock data instead of real API**: Avoids API rate limits and costs; prices look realistic with deterministic variation. Trade-off: no real market data
2. **Client-side auth with AsyncStorage**: Simple to implement, no server auth needed. Trade-off: not secure for production, accounts are device-local
3. **SSE streaming for AI chat**: Provides real-time token-by-token response display rather than waiting for full completion
4. **Shared schema between client and server**: The `shared/` directory contains Drizzle schemas and Zod validators usable by both sides

## External Dependencies

- **PostgreSQL**: Database via `DATABASE_URL` environment variable, managed through Drizzle ORM
- **OpenAI API** (via Replit AI Integrations): Powers the AI chat assistant. Configured with `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Replit Environment**: Uses `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN` for CORS and build configuration
- **NPM packages of note**: `openai` (AI client), `drizzle-orm` + `drizzle-zod` (ORM/validation), `pg` (PostgreSQL driver), `@tanstack/react-query` (data fetching), `expo-router` (navigation), `express` (API server), `p-limit`/`p-retry` (batch processing)