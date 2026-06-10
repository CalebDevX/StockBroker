# StockBroker NG

StockBroker NG is a full-stack brokerage platform built for the Nigerian Exchange (NGX). It combines a customer-facing trading portal with an OMS backend for SEC-licensed stockbrokers.

## Local development

```bash
# Start the API server on port 8080
pnpm --filter @workspace/api-server run dev

# Start the web portal on port 25516
pnpm --filter @workspace/client-portal run dev

# Push database schema updates in development
pnpm --filter @workspace/db run push

# Seed the database with instruments and an admin user
DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx lib/db/src/seed.ts
```

## Environment variables

| Variable          | Used by       | Description                                         |
|-------------------|---------------|-----------------------------------------------------|
| `DATABASE_URL`     | API server    | PostgreSQL connection string                        |
| `JWT_SECRET`       | API server    | 48-byte random base64 string for token signing      |
| `BROKER_CODE`      | API server    | SEC-assigned 4-digit broker code (default: `0001`)  |
| `PORT`             | Both          | Server port (API default: 8080, portal default: 3000)|
| `ALLOWED_ORIGINS`  | API server    | Comma-separated CORS origins (default: `*`)         |
| `BASE_PATH`        | Client portal | URL base path (default: `/`)                        |
| `TRADING_MODE`     | API server    | `demo` or `live` for demo vs NGX ATS live mode      |
| `FIX_HOST`         | API server    | NGX ATS FIX host                                        |
| `FIX_PORT`         | API server    | NGX ATS FIX port                                        |
| `FIX_SENDER_COMP_ID` | API server  | Broker CompID for FIX logon                            |
| `FIX_TARGET_COMP_ID` | API server | NGX ATS target CompID                                   |
| `FIX_PASSWORD`     | API server    | FIX logon password                                      |
| `CSCS_API_URL`     | API server    | CSCS A2A REST base URL                                  |
| `CSCS_API_KEY`     | API server    | CSCS API key                                            |
| `CSCS_BROKER_CODE` | API server    | CSCS broker CHN prefix                                   |
| `CSCS_WEBHOOK_SECRET` | API server | HMAC secret for inbound CSCS webhooks                    |
| `EMAIL_PROVIDER`   | API server    | `sendgrid`, `smtp`, or `console`                        |
| `EMAIL_FROM`       | API server    | Sender address for system emails                         |
| `SENDGRID_API_KEY` | API server    | SendGrid API key for email delivery                     |
| `SMTP_HOST`        | API server    | SMTP server host name (Brevo example: `smtp-relay.brevo.com`) |
| `SMTP_PORT`        | API server    | SMTP port (e.g. `587`)                                   |
| `SMTP_USER`        | API server    | SMTP username                                            |
| `SMTP_PASS`        | API server    | SMTP password                                            |
| `SMTP_SECURE`      | API server    | `true` for SSL/TLS port 465, `false` for STARTTLS port 587 |
| `APP_NAME`         | API server    | Optional branding fallback when admin settings are unset |
| `APP_URL`          | API server    | Optional app URL fallback when admin settings are unset  |
| `SUPPORT_EMAIL`    | API server    | Optional support email fallback                         |

> `app_name` and `app_url` are persisted in the database settings table and editable via the admin settings API. `APP_NAME` / `APP_URL` are fallback values only.

Copy `.env.example` to `.env` and update values as needed.

## Tech stack

- Monorepo with pnpm workspaces
- Node.js 24 and TypeScript 5.9
- React + Vite + Tailwind CSS for the client portal
- Express 5 + Drizzle ORM + PostgreSQL for the API
- JWT-based authentication with access and refresh tokens
- Zod v3 validation
- WebSocket order status updates via `/api/ws`

## Key project areas

```
lib/db/src/schema/index.ts   — database schema (7 tables, values stored in kobo)
lib/db/src/seed.ts           — seed script for instruments and admin user
artifacts/api-server/src/    — server routes, services, middleware, websocket logic
artifacts/client-portal/src/ — front-end pages, shared layout, UI components
```

## Important design choices

- Store all money values in kobo using BIGINT to avoid floating-point problems
- Include NGX brokerage and regulatory fee calculations in the order engine
- Enforce NGX circuit breaker limits at order placement
- Hash refresh tokens in the database so stolen tokens cannot be reused
- Use `ALLOWED_ORIGINS` in production to restrict CORS to your domains

## Deployment

1. Provision a PostgreSQL database and set `DATABASE_URL`
2. Generate `JWT_SECRET` with `openssl rand -base64 48`
3. Copy `.env.example` to `.env` and fill in required values
4. Push the database schema: `pnpm --filter @workspace/db run push`
5. Seed the DB: `npx tsx lib/db/src/seed.ts`
6. Build the API: `pnpm --filter @workspace/api-server run build`
7. Start the API: `node artifacts/api-server/dist/index.mjs`
8. Build the portal: `pnpm --filter @workspace/client-portal run build`
9. Serve the built portal from `artifacts/client-portal/dist/public/`

## Notes

- This repo is designed for standard Node deployments on platforms like Railway, Render, or AWS.
- A mobile app is planned for a later phase.
- An administrative broker/operations panel can be added as a future enhancement.
