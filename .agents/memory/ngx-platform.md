---
name: NGX Platform Architecture
description: Monorepo layout, build/restart pattern, schema facts, and production-readiness decisions for StockBroker NG.
---

## Monorepo layout
- `artifacts/client-portal` — React 19 + Vite, port 5000, HMR active (no rebuild needed for frontend changes)
- `artifacts/api-server` — Express 5 + Drizzle ORM, port 8080, **must `pnpm run build` then restart "Backend API" workflow** after any TypeScript change
- `lib/db` — Drizzle schema + migrations. Run `cd lib/db && pnpm drizzle-kit push` to apply schema changes.

## Schema facts
- All monetary values stored in **kobo** (1 Naira = 100 kobo). PostgreSQL NUMERIC returns as string — cast with `Number()` in frontend.
- `transactionsTable` has `balanceAfterKobo` + `createdAt` — used for portfolio chart history.
- `notificationsTable` added — triggers on order fill (demo-fill-engine) and KYC update (admin route).

## Key decisions
- Demo account fully removed — no `/api/auth/demo`, no `seedDemoAccount`, no demo DB row.
- Trading mode "demo" = simulated fills via `demo-fill-engine.ts`; still uses real DB, real prices.
- `ModeBadge` kept exported from `dashboard-sidebar.tsx` for admin panel use; removed from client-facing pages.
- Separate `MobileBottomNav` component in `App.tsx` handles mobile nav globally — do NOT add another bottom nav inside `DashboardSidebar`.
- CSCS/FIX integration stubs present but `FIX_HOST` not set → demo mode auto-activates on startup.
- Support chat: `support_chats` + `support_messages` tables. Bot reply is synchronous (returned in same POST). Gemini key: env `GEMINI_API_KEY` first, then settings table `dev_api_keys.gemini_api_key`. Admin inbox polls every 4s (React Query refetchInterval). `SupportChatWidget` renders in App.tsx for all authenticated non-admin users.
- Developer Panel at `/admin/developer` saves all API keys under settings key `dev_api_keys` (JSONB). Services check env first, then `dev_api_keys` setting. Admin only.
- Role management: fully built in `admin/client-detail.tsx` — Role dropdown + Change Role button visible in the client detail page.
- `ClientSupportWidget` in App.tsx wraps `SupportChatWidget` (hides for admin/broker/compliance roles via widget-internal guard).

**Why:** Backend requires explicit rebuild because it's compiled TypeScript (esbuild). Frontend is Vite HMR. Forgetting to rebuild causes the old bundle to serve stale routes even after code edits.
