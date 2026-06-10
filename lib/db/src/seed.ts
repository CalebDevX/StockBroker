/**
 * StockBroker NG — Database Seed Script
 *
 * Run against any PostgreSQL database:
 *   DATABASE_URL=postgresql://user:pass@host/db npx tsx lib/db/src/seed.ts
 *
 * Or via workspace:
 *   pnpm --filter @workspace/db run seed
 *
 * What this seeds:
 *   1. All required PostgreSQL enums (idempotent — skips if exist)
 *   2. 25 real NGX-listed equities with 2025 prices
 *   3. One admin account for the broker back-office
 *
 * Environment variables:
 *   DATABASE_URL   — required, PostgreSQL connection string
 *   ADMIN_EMAIL    — optional, default: admin@stockbroker.ng
 *   ADMIN_PASSWORD — optional, default: Admin1234!  (change in production!)
 *   BROKER_CODE    — optional, default: 0001
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import {
  clientsTable,
  instrumentsTable,
  settingsTable,
} from "./schema/index.js";
import { eq } from "drizzle-orm";

// ── Config ──────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL environment variable is required");
  process.exit(1);
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@stockbroker.ng";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";
const BROKER_CODE    = process.env.BROKER_CODE    ?? "0001";

// ── NGX Instruments (prices in Naira; converted to kobo below) ──────────────

const NGX_INSTRUMENTS = [
  { symbol: "GTCO",      name: "Guaranty Trust Holding Co",          sector: "Banking",            lastNaira: 48.50,   prevNaira: 47.80 },
  { symbol: "DANGCEM",   name: "Dangote Cement PLC",                 sector: "Building Materials", lastNaira: 425.00,  prevNaira: 420.00 },
  { symbol: "MTNN",      name: "MTN Nigeria Communications",          sector: "Telecoms",           lastNaira: 215.00,  prevNaira: 210.50 },
  { symbol: "ZENITHBANK",name: "Zenith Bank PLC",                    sector: "Banking",            lastNaira: 29.50,   prevNaira: 28.75 },
  { symbol: "ACCESSCORP",name: "Access Holdings PLC",                sector: "Banking",            lastNaira: 14.20,   prevNaira: 14.55 },
  { symbol: "SEPLAT",    name: "Seplat Energy PLC",                  sector: "Oil & Gas",          lastNaira: 850.00,  prevNaira: 835.00 },
  { symbol: "FBNH",      name: "FBN Holdings PLC",                   sector: "Banking",            lastNaira: 18.90,   prevNaira: 19.35 },
  { symbol: "STANBIC",   name: "Stanbic IBTC Holdings",              sector: "Banking",            lastNaira: 45.20,   prevNaira: 43.00 },
  { symbol: "UBA",       name: "United Bank for Africa PLC",         sector: "Banking",            lastNaira: 21.50,   prevNaira: 21.20 },
  { symbol: "AIRTELAFRI",name: "Airtel Africa PLC",                  sector: "Telecoms",           lastNaira: 1620.00, prevNaira: 1600.00 },
  { symbol: "BUACEMENT", name: "BUA Cement PLC",                     sector: "Building Materials", lastNaira: 78.50,   prevNaira: 80.00 },
  { symbol: "BUAFOODS",  name: "BUA Foods PLC",                      sector: "Food & Beverages",   lastNaira: 325.00,  prevNaira: 320.00 },
  { symbol: "NB",        name: "Nigerian Breweries PLC",             sector: "Food & Beverages",   lastNaira: 24.00,   prevNaira: 24.50 },
  { symbol: "PRESCO",    name: "Presco PLC",                         sector: "Agriculture",        lastNaira: 315.00,  prevNaira: 310.00 },
  { symbol: "OANDO",     name: "Oando PLC",                          sector: "Oil & Gas",          lastNaira: 52.00,   prevNaira: 50.50 },
  { symbol: "TRANSCORP", name: "Transnational Corporation PLC",      sector: "Conglomerates",      lastNaira: 13.50,   prevNaira: 13.20 },
  { symbol: "FIDELITYBK",name: "Fidelity Bank PLC",                  sector: "Banking",            lastNaira: 8.20,    prevNaira: 8.10 },
  { symbol: "FLOURMILL", name: "Flour Mills of Nigeria PLC",         sector: "Food & Beverages",   lastNaira: 37.00,   prevNaira: 36.50 },
  { symbol: "CONOIL",    name: "Conoil PLC",                         sector: "Oil & Gas",          lastNaira: 125.00,  prevNaira: 122.00 },
  { symbol: "NESTLE",    name: "Nestle Nigeria PLC",                 sector: "Food & Beverages",   lastNaira: 810.00,  prevNaira: 800.00 },
  { symbol: "TOTAL",     name: "TotalEnergies Marketing Nigeria",    sector: "Oil & Gas",          lastNaira: 335.00,  prevNaira: 330.00 },
  { symbol: "CADBURY",   name: "Cadbury Nigeria PLC",                sector: "Food & Beverages",   lastNaira: 17.50,   prevNaira: 17.20 },
  { symbol: "WAPCO",     name: "Lafarge Africa PLC",                 sector: "Building Materials", lastNaira: 35.00,   prevNaira: 34.50 },
  { symbol: "STERLING",  name: "Sterling Financial Holdings",        sector: "Banking",            lastNaira: 4.50,    prevNaira: 4.45 },
  { symbol: "DANGSUGAR", name: "Dangote Sugar Refinery PLC",         sector: "Food & Beverages",   lastNaira: 22.10,   prevNaira: 21.30 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const toKobo = (naira: number) => Math.round(naira * 100);

// NGX circuit breaker: ±10% of previous close
const upperLimit = (prevNaira: number) => Math.round(prevNaira * 1.10 * 100);
const lowerLimit = (prevNaira: number) => Math.round(prevNaira * 0.90 * 100);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  StockBroker NG — seed starting...\n");

  const shouldDisableSslVerification = /(?:\?|&)sslmode=(?:require|prefer|allow)(?:&|$)/.test(
    DATABASE_URL,
  );

  if (shouldDisableSslVerification) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: shouldDisableSslVerification ? { rejectUnauthorized: false } : undefined,
  });
  const db   = drizzle(pool);

  // ── 1. Instruments ──────────────────────────────────────────────────────────
  console.log("📈  Seeding NGX instruments...");
  let instrumentsSeeded = 0;
  let instrumentsSkipped = 0;

  for (const inst of NGX_INSTRUMENTS) {
    const existing = await db
      .select({ id: instrumentsTable.id })
      .from(instrumentsTable)
      .where(eq(instrumentsTable.symbol, inst.symbol))
      .limit(1);

    if (existing.length > 0) {
      // Update price data for existing records
      await db
        .update(instrumentsTable)
        .set({
          lastPriceKobo:      toKobo(inst.lastNaira),
          prevClosePriceKobo: toKobo(inst.prevNaira),
          openPriceKobo:      toKobo(inst.prevNaira),
          highPriceKobo:      toKobo(inst.lastNaira),
          lowPriceKobo:       toKobo(inst.prevNaira),
          upperLimitKobo:     upperLimit(inst.prevNaira),
          lowerLimitKobo:     lowerLimit(inst.prevNaira),
          updatedAt:          new Date(),
        })
        .where(eq(instrumentsTable.symbol, inst.symbol));
      instrumentsSkipped++;
    } else {
      await db.insert(instrumentsTable).values({
        id:                 uuidv4(),
        symbol:             inst.symbol,
        name:               inst.name,
        sector:             inst.sector,
        type:               "equity",
        lastPriceKobo:      toKobo(inst.lastNaira),
        prevClosePriceKobo: toKobo(inst.prevNaira),
        openPriceKobo:      toKobo(inst.prevNaira),
        highPriceKobo:      toKobo(inst.lastNaira),
        lowPriceKobo:       toKobo(inst.prevNaira),
        upperLimitKobo:     upperLimit(inst.prevNaira),
        lowerLimitKobo:     lowerLimit(inst.prevNaira),
        volume:             0,
        isActive:           true,
        isTradingSuspended: false,
        priceUpdatedAt:     new Date(),
        createdAt:          new Date(),
        updatedAt:          new Date(),
      });
      instrumentsSeeded++;
    }
  }

  console.log(`   ✓ ${instrumentsSeeded} inserted, ${instrumentsSkipped} updated\n`);

  // ── 2. Platform settings ──────────────────────────────────────────────────
  console.log("⚙️  Seeding default platform settings...");

  const defaultSettings = [
    {
      key: "email_provider",
      value: {
        provider: "console",
        fromEmail: "noreply@stockbroker.ng",
        supportEmail: "support@stockbroker.ng",
      },
    },
    {
      key: "sms_provider",
      value: {
        provider: "console",
        fromNumber: "+2340000000000",
      },
    },
    {
      key: "app_name",
      value: "StockBroker NG",
    },
    {
      key: "app_url",
      value: "https://app.stockbroker.ng",
    },
    {
      key: "email_templates",
      value: {
        passwordResetSubject: "Reset your {{appName}} password",
        passwordResetBody:
          "Hello {{fullName}},\n\nA password reset request was received for your {{appName}} account.\n\nReset your password using the link below:\n{{resetLink}}\n\nIf you did not request this, contact {{supportEmail}}.\n\nThank you,\n{{appName}}",
        kycApprovedSubject: "Your {{appName}} KYC is approved",
        kycApprovedBody:
          "Hello {{fullName}},\n\nGood news — your KYC has been approved. Your account is now cleared for trading.\nVisit {{appUrl}} to continue.\n\nThank you,\n{{appName}}",
        kycRejectedSubject: "{{appName}} KYC review requires action",
        kycRejectedBody:
          "Hello {{fullName}},\n\nYour KYC review is not complete. Please update your documents or contact support at {{supportEmail}}.\n\nThank you,\n{{appName}}",
      },
    },
    {
      key: "sms_templates",
      value: {
        kycApproved: "Your StockBroker KYC is approved. You may now trade on the platform.",
        kycRejected: "Your StockBroker KYC requires more information. Please review your submission.",
      },
    },
  ];

  for (const setting of defaultSettings) {
    const existing = await db
      .select({ id: settingsTable.id })
      .from(settingsTable)
      .where(eq(settingsTable.key, setting.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(settingsTable).values({
        id: uuidv4(),
        key: setting.key,
        value: setting.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log("   ✓ Default platform settings seeded\n");

  // ── 3. Admin account ────────────────────────────────────────────────────────
  console.log("👤  Seeding admin account...");

  const existingAdmin = await db
    .select({ id: clientsTable.id, role: clientsTable.role })
    .from(clientsTable)
    .where(eq(clientsTable.email, ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin.length > 0) {
    await db
      .update(clientsTable)
      .set({
        role:              "admin",
        kycStatus:         "verified",
        kycTier:           "tier3",
        cashBalanceKobo:   50_000_000_000, // ₦500,000,000 (operational float)
        updatedAt:         new Date(),
      })
      .where(eq(clientsTable.email, ADMIN_EMAIL));
    console.log(`   ✓ Existing account promoted to admin: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(clientsTable).values({
      id:               uuidv4(),
      email:            ADMIN_EMAIL,
      passwordHash,
      fullName:         "Broker Admin",
      phone:            "+2340000000000",
      brokerCode:       BROKER_CODE,
      role:             "admin",
      kycStatus:        "verified",
      kycTier:          "tier3",
      cashBalanceKobo:  50_000_000_000,
      isActive:         true,
      isSuspended:      false,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    });
    console.log(`   ✓ Admin account created: ${ADMIN_EMAIL}`);
    console.log(`   ⚠️  Default password: ${ADMIN_PASSWORD} — CHANGE THIS IN PRODUCTION`);
  }

  console.log("\n✅  Seed complete.\n");
  console.log("─────────────────────────────────────────────────");
  console.log("Next steps:");
  console.log("  1. Change the admin password via /api/auth/change-password");
  console.log("  2. Set up your market data feed to update instrument prices");
  console.log("  3. Register your first broker staff via /api/auth/register");
  console.log("─────────────────────────────────────────────────\n");

  await pool.end();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
