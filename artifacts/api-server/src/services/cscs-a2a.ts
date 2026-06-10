/**
 * CSCS A2A (Account-to-Account) REST Client
 *
 * The Central Securities Clearing System is Nigeria's sole central securities
 * depository. This client fetches real-time position data via their REST API.
 *
 * Required env vars (live mode only):
 *   CSCS_API_URL       — Base URL (e.g. https://a2a.cscsnigeria.com/v1)
 *   CSCS_API_KEY       — API key issued to broker
 *   CSCS_BROKER_CODE   — Broker CHN prefix code
 *   CSCS_WEBHOOK_SECRET — HMAC secret for validating inbound webhooks (optional)
 */

import { createHmac } from "crypto";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { positionsTable, instrumentsTable, clientsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface CscsPosition {
  isin:            string;
  symbol:          string;
  quantity:        number;
  availableQty:    number;
  marketValueNgn:  number;
  currentPriceNgn: number;
  chn:             string;
}

interface CscsAccountSummary {
  chn:           string;
  brokerCode:    string;
  totalValueNgn: number;
  positions:     CscsPosition[];
  asAt:          string;
}

const TIMEOUT_MS = 10_000;

async function cscsGet<T>(path: string): Promise<T> {
  const base   = process.env["CSCS_API_URL"] ?? "";
  const apiKey = process.env["CSCS_API_KEY"] ?? "";

  if (!base || !apiKey) {
    throw new Error("CSCS_API_URL and CSCS_API_KEY must be set in live mode");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept":        "application/json",
        "X-Broker-Code": process.env["CSCS_BROKER_CODE"] ?? "",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CSCS API ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch live positions from CSCS and sync them into the local positions table.
 * Called on every portfolio page load in live mode.
 */
export async function syncPositionsFromCscs(
  clientId: string,
  chn: string,
): Promise<CscsPosition[]> {
  try {
    const summary = await cscsGet<CscsAccountSummary>(`/accounts/${chn}/positions`);

    for (const pos of summary.positions) {
      const priceKobo = Math.round(pos.currentPriceNgn * 100);
      const valueKobo = Math.round(pos.marketValueNgn * 100);

      // Resolve local symbol if we only have ISIN
      let symbol = pos.symbol;
      if (!symbol && pos.isin) {
        const [inst] = await db
          .select({ symbol: instrumentsTable.symbol })
          .from(instrumentsTable)
          .where(eq(instrumentsTable.isin, pos.isin))
          .limit(1);
        symbol = inst?.symbol ?? pos.isin;
      }

      const [existing] = await db
        .select()
        .from(positionsTable)
        .where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)))
        .limit(1);

      if (existing) {
        await db.update(positionsTable).set({
          quantity:         pos.quantity,
          currentPriceKobo: priceKobo,
          marketValueKobo:  valueKobo,
          updatedAt:        new Date(),
        }).where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)));
      } else if (pos.quantity > 0) {
        await db.insert(positionsTable).values({
          id:               uuidv4(),
          clientId,
          symbol,
          quantity:         pos.quantity,
          reservedQuantity: 0,
          avgCostKobo:      priceKobo,
          currentPriceKobo: priceKobo,
          marketValueKobo:  valueKobo,
          unrealisedPnlKobo: 0,
        }).onConflictDoNothing();
      }
    }

    logger.info({ clientId, chn, count: summary.positions.length }, "CSCS: positions synced");
    return summary.positions;
  } catch (err) {
    logger.warn({ err: (err as Error).message, clientId, chn }, "CSCS: position sync failed — using cached data");
    return [];
  }
}

async function resolveWebhookSymbol(payload: CscsWebhookPayload): Promise<string> {
  if (payload.symbol) return payload.symbol;
  if (!payload.isin) return "";

  const [instrument] = await db
    .select({ symbol: instrumentsTable.symbol })
    .from(instrumentsTable)
    .where(eq(instrumentsTable.isin, payload.isin))
    .limit(1);

  return instrument?.symbol ?? payload.isin;
}

export async function processCscsWebhookEvent(payload: CscsWebhookPayload) {
  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.chn, payload.chn))
    .limit(1);

  if (!client) {
    throw new Error(`Unknown CSCS CHN: ${payload.chn}`);
  }

  if (payload.eventType === "settlement.failed") {
    logger.warn({ chn: payload.chn, tradeRef: payload.tradeRef }, "CSCS: settlement failed");
    return;
  }

  const symbol = await resolveWebhookSymbol(payload);
  if (!symbol) {
    throw new Error("CSCS webhook payload must include symbol or ISIN");
  }

  const priceKobo = Math.round(payload.priceNgn * 100);
  const marketValueKobo = payload.quantity * priceKobo;

  const [existing] = await db
    .select()
    .from(positionsTable)
    .where(and(eq(positionsTable.clientId, client.id), eq(positionsTable.symbol, symbol)))
    .limit(1);

  if (existing) {
    await db.update(positionsTable).set({
      quantity:         payload.quantity,
      currentPriceKobo: priceKobo,
      marketValueKobo,
      updatedAt:        new Date(),
    }).where(and(eq(positionsTable.clientId, client.id), eq(positionsTable.symbol, symbol)));
  } else if (payload.quantity > 0) {
    await db.insert(positionsTable).values({
      id:               uuidv4(),
      clientId:         client.id,
      symbol,
      quantity:         payload.quantity,
      reservedQuantity: 0,
      avgCostKobo:      priceKobo,
      currentPriceKobo: priceKobo,
      marketValueKobo,
      unrealisedPnlKobo: 0,
      updatedAt:        new Date(),
    }).onConflictDoNothing();
  }

  logger.info({ chn: payload.chn, symbol, quantity: payload.quantity }, "CSCS: webhook event processed");
}

/**
 * Handle inbound CSCS settlement webhook (POST /api/cscs/webhook).
 * CSCS pushes settlement confirmations after T+3 settlement cycle.
 */
export interface CscsWebhookPayload {
  eventType:    "settlement.confirmed" | "settlement.failed" | "position.update";
  chn:          string;
  tradeRef:     string;
  symbol:       string;
  isin?:        string;
  quantity:     number;
  priceNgn:     number;
  side:         "buy" | "sell";
  settlementAt: string;
}

export function isValidCscsSignature(rawBody: string, signature: string): boolean {
  const secret = process.env["CSCS_WEBHOOK_SECRET"] ?? "";
  if (!secret) return true; // no secret configured → accept all (dev/demo)

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expected;
}
