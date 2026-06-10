# StockBroker NG

A full-stack brokerage platform built for the Nigerian Exchange (NGX). It's a complete client portal + OMS backend that a licensed stockbroker can deploy, white-label, and hand to their clients the same day.

The impetus was straightforward: most Nigerian retail brokers either use painfully outdated desktop software or a generic international platform that doesn't understand NGX fee structures, circuit breakers, or the BVN/NIN KYC requirements that the SEC and CBN actually enforce. This project fixes that.

## What's inside

**Client portal** — a React/Vite SPA (port 5000) that covers the full client lifecycle: onboarding with SEC-compliant KYC (BVN + NIN), a real-time NGX order book, portfolio tracking, account statements, and a support chat backed by Gemini AI with a keyword fallback.

**OMS API** — an Express 5 server (port 8080) handling auth, order routing, fee calculation, WebSocket pushes, KYC review, and admin operations. In `demo` mode it simulates the NGX ATS locally. In `live` mode it routes orders over FIX 4.4 to the actual NGX ATS.

**Admin panel** — a full operations dashboard inside the client portal for brokers and compliance staff. Role-based (client / broker / compliance / admin), with a KYC queue, client management, settings, SMS/email template management, and a developer panel for storing API credentials.

---

## Getting started locally

```bash
# 1. Install everything
pnpm install

# 2. Set up your .env
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET (see below)

# 3. Push the schema and seed
pnpm --filter @workspace/db run push
DATABASE_URL=<your-url> ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=changeme npx tsx lib/db/src/seed.ts

# 4. Start the API (port 8080)
pnpm --filter @workspace/api-server run dev

# 5. Start the portal (port 5000)
pnpm --filter @workspace/client-portal run dev
```

`JWT_SECRET` needs to be a random 48-byte base64 string — `openssl rand -base64 48` works.

---

## Environment variables

| Variable             | Service       | Purpose                                                                 |
|----------------------|---------------|-------------------------------------------------------------------------|
| `DATABASE_URL`       | API           | PostgreSQL connection string                                            |
| `JWT_SECRET`         | API           | 48-byte base64 secret for token signing                                 |
| `BROKER_CODE`        | API           | SEC-assigned 4-digit broker code (default `0001`)                       |
| `PORT`               | Both          | Server port (API: 8080, portal: 3000 by default)                        |
| `ALLOWED_ORIGINS`    | API           | Comma-separated CORS origins — lock this down in production             |
| `TRADING_MODE`       | API           | `demo` (default) or `live` for live NGX ATS routing                     |
| `FIX_HOST`           | API           | NGX ATS FIX host                                                        |
| `FIX_PORT`           | API           | NGX ATS FIX port                                                        |
| `FIX_SENDER_COMP_ID` | API           | Your broker's FIX CompID                                                |
| `FIX_TARGET_COMP_ID` | API           | NGX ATS target CompID                                                   |
| `FIX_PASSWORD`       | API           | FIX session password                                                    |
| `CSCS_API_URL`       | API           | CSCS A2A REST base URL                                                  |
| `CSCS_API_KEY`       | API           | CSCS API key                                                            |
| `CSCS_BROKER_CODE`   | API           | CSCS broker CHN prefix                                                  |
| `CSCS_WEBHOOK_SECRET`| API           | HMAC secret for inbound CSCS webhooks                                   |
| `EMAIL_PROVIDER`     | API           | `sendgrid`, `smtp`, or `console`                                        |
| `EMAIL_FROM`         | API           | Sender address for system emails                                        |
| `SENDGRID_API_KEY`   | API           | SendGrid API key                                                        |
| `SMTP_HOST`          | API           | SMTP hostname (e.g. `smtp-relay.brevo.com`)                             |
| `SMTP_PORT`          | API           | SMTP port (`587` for STARTTLS, `465` for TLS)                           |
| `SMTP_USER`          | API           | SMTP username                                                           |
| `SMTP_PASS`          | API           | SMTP password                                                           |
| `SMTP_SECURE`        | API           | `true` for SSL/TLS on 465, `false` for STARTTLS on 587                  |
| `APP_NAME`           | API           | Branding fallback when admin settings are unset                         |
| `APP_URL`            | API           | App URL fallback                                                        |
| `SUPPORT_EMAIL`      | API           | Support email fallback                                                  |

Most of these can also be set via the Admin → Developer Panel inside the running app, which stores them in the database. Environment variables take priority over database values.

---

## Tech stack and why

- **pnpm workspaces monorepo** — three packages: `api-server`, `client-portal`, and `db`. Keeps the schema, migrations, and seed in one place that both the server and any future tools can share.
- **Node.js 24 + TypeScript 5.9** — stable LTS, strict mode throughout. No transpilation surprises.
- **Express 5** — the RC has been solid for this use case. Async error propagation works properly without `next(err)` boilerplate.
- **Drizzle ORM + PostgreSQL** — schema-first, generates types automatically, and the migration/push workflow is simple enough for a team without a dedicated DBA.
- **React 18 + Vite + Tailwind CSS** — fast dev loop, sensible defaults.
- **JWT auth** — 15-minute access tokens, 30-day refresh tokens. Refresh tokens are hashed in the database so a stolen token can't be reused.
- **WebSocket for order updates** — `/api/ws` pushes order status changes to the client in real time so they don't have to poll.
- **Zod v3 validation** — all request bodies are validated at the route level before they hit service logic.

---

## Money handling

Everything is stored in **kobo** (integer × 100) using `BIGINT`. No floats anywhere near money. NGX brokerage fees, SEC levies, CSCS charges, and stamp duty are all calculated server-side at order placement. This matters — getting the fee math wrong is a compliance issue.

---

## Project layout

```
lib/db/src/schema/index.ts      database schema (7 tables)
lib/db/src/seed.ts              seed script for instruments + admin user
artifacts/api-server/src/       Express routes, services, middleware, WS
artifacts/client-portal/src/    React pages, shared layout, UI components
```

---

## Deploying

1. Provision a PostgreSQL database and note the connection string
2. `openssl rand -base64 48` → use as `JWT_SECRET`
3. Copy `.env.example` to `.env` and fill in required values
4. `pnpm --filter @workspace/db run push` — applies the schema
5. `DATABASE_URL=... npx tsx lib/db/src/seed.ts` — seeds instruments and the first admin
6. `pnpm --filter @workspace/api-server run build && node artifacts/api-server/dist/index.mjs` — builds and starts the API
7. `pnpm --filter @workspace/client-portal run build` — produces a static build in `artifacts/client-portal/dist/public/`
8. Serve the static build from any CDN, nginx, or a static hosting service; set `VITE_API_BASE` (or configure CORS) so the portal can reach the API

The API is a single Node process, no workers needed for demo mode. For live trading you'll want to pin to a single instance since the FIX session is in-process.

Works on any standard Node host — Railway, Render, Fly, AWS, whatever you prefer.

---

## Roles

| Role         | Access                                                                 |
|--------------|------------------------------------------------------------------------|
| `client`     | Trading portal only — no admin access                                  |
| `broker`     | Admin panel: view clients, manage orders, see positions                |
| `compliance` | Admin panel: KYC queue, document review, approval/rejection            |
| `admin`      | Full access — settings, developer keys, user roles, system mode        |

The seed creates a single `admin` account. Create broker/compliance accounts from the Admin → Clients panel.

---

## Roadmap

- Mobile app (React Native) — same API, different shell
- Fractional share support once NGX approves it
- Direct bank debit for funding (Paystack/Flutterwave integration)
