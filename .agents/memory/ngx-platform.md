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

**Why:** Backend requires explicit rebuild because it's compiled TypeScript (esbuild). Frontend is Vite HMR. Forgetting to rebuild causes the old bundle to serve stale routes even after code edits.
