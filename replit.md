# WOLFBOT Session Generator

## Overview

WOLFBOT Session Generator is a full-stack web application that generates WhatsApp session IDs through two connection methods: 8-digit pairing codes and QR codes. The app features a dark, cyberpunk-themed UI with neon green accents and glass-morphism effects. After linking, it automatically joins a WhatsApp group, follows a channel, and sends session credentials in `WOLF-BOT:~{base64_creds}` format.

The application includes a real-time analytics dashboard that tracks active/inactive sessions, daily connections, and monthly connections with live auto-refresh.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Feb 2026**: Added real-time analytics dashboard at `/analytics` route
  - PostgreSQL database with `connection_logs` and `daily_stats` tables
  - Tracks active sessions, inactive sessions, daily & monthly connection counts
  - Auto-refreshes every 5 seconds with LIVE indicator
  - Cyberpunk-themed stat cards with color-coded metrics
  - Recent connections list with status indicators
  - Fixed server port to use PORT env var (default 5000)

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **Pages**:
  - `/` — Home page with session generator
  - `/analytics` — Real-time analytics dashboard
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode by default
- **Visual Theme**: Cyberpunk/hacker aesthetic — black backgrounds, neon green (`#00ff00`) accents, glass-morphism cards with `backdrop-blur-sm`, glow effects via box shadows
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (server/)
- **Framework**: Express.js running on Node with TypeScript (tsx for dev, esbuild for production)
- **HTTP Server**: Node's `createServer` wrapping Express (supports WebSocket upgrade)
- **API Pattern**: REST endpoints under `/api/` prefix
- **Key Endpoints**:
  - `POST /api/generate-session` — Creates a new session with pairing code or QR code
  - `GET /api/session/:sessionId/status` — Get session status
  - `POST /api/terminate-session` — Terminate a session
  - `GET /api/analytics` — Real-time analytics data
- **WhatsApp Integration**: Uses `@whiskeysockets/baileys` library in `server/whatsapp.ts` for real WhatsApp connections
- **QR Code Generation**: Uses the `qrcode` npm package to generate data URLs server-side
- **Dev Server**: Vite dev server middleware integrated into Express during development
- **Production**: Static files served from `dist/public`

### Shared (shared/)
- **Schema**: `shared/schema.ts` defines Drizzle ORM tables, TypeScript interfaces, and Zod validation schemas
- **Database Tables**:
  - `connection_logs` — Tracks each session attempt with session ID, method, status, timestamps (indexed on session_id, created_at, status)
  - `daily_stats` — Aggregated daily connection counts (total, successful, failed)
- **Key Types**: `Session`, `SessionStatus`, `AnalyticsData`, `ConnectionLog`, `DailyStats`

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM with `pg` driver
- **Storage Layer**: `server/storage.ts` — `DatabaseStorage` class implementing `IStorage` interface
- **Session IDs**: Generated as `wolf_` + 4 random hex bytes
- **Analytics**: Connection logs stored in PostgreSQL with indexed queries for real-time stats

### Build System
- **Dev**: `tsx server/index.ts` with Vite middleware for HMR
- **Build**: Custom `script/build.ts` runs Vite build for client, esbuild for server
- **Output**: `dist/` directory with `dist/public/` for static assets and `dist/index.cjs` for server
- **DB Migrations**: `drizzle-kit push` via `npm run db:push`

## External Dependencies

- **PostgreSQL**: Required database (connection via `DATABASE_URL` env var)
- **@whiskeysockets/baileys**: WhatsApp Web API client for real connections
- **QRCode (npm)**: Server-side QR code generation as data URLs
- **Replit Plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`
- **react-icons**: Used for WhatsApp icon (`SiWhatsapp`) and GitHub icon (`SiGithub`)
