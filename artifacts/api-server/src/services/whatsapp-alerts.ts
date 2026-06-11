/**
 * WhatsApp transaction alerts — sends Achek WhatsApp messages to clients for
 * order fills, deposits and withdrawals, gated by per-client notification prefs.
 *
 * Preferences are stored in settingsTable under key `client_notif_prefs:{clientId}`.
 * Every function is fire-and-forget from the caller's perspective (void return).
 */

import { v4 as uuidv4 } from "uuid";
import AchekConnect from "achek";
import { db } from "@workspace/db";
import { clientsTable, settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ── Prefs schema ─────────────────────────────────────────────────────────────

export interface NotifPrefs {
  app_trade_fills:   boolean;
  app_price_alerts:  boolean;
  app_deposits:      boolean;
  app_kyc_updates:   boolean;
  app_market_news:   boolean;
  wa_order_filled:   boolean;
  wa_deposit:        boolean;
  wa_withdrawal:     boolean;
  wa_order_rejected: boolean;
}

const DEFAULTS: NotifPrefs = {
  app_trade_fills:   true,
  app_price_alerts:  true,
  app_deposits:      true,
  app_kyc_updates:   true,
  app_market_news:   false,
  wa_order_filled:   true,
  wa_deposit:        true,
  wa_withdrawal:     true,
  wa_order_rejected: true,
};

// ── Settings helpers ──────────────────────────────────────────────────────────

async function getDevApiKeys(): Promise<Record<string, string>> {
  try {
    const [row] = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, "dev_api_keys"))
      .limit(1);
    return (row?.value as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

export async function getClientNotifPrefs(clientId: string): Promise<NotifPrefs> {
  try {
    const [row] = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, `client_notif_prefs:${clientId}`))
      .limit(1);
    const stored = (row?.value as Partial<NotifPrefs>) ?? {};
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setClientNotifPrefs(
  clientId: string,
  patch: Partial<NotifPrefs>,
): Promise<NotifPrefs> {
  const current = await getClientNotifPrefs(clientId);
  const merged  = { ...current, ...patch };
  await db
    .insert(settingsTable)
    .values({
      id:        uuidv4(),
      key:       `client_notif_prefs:${clientId}`,
      value:     merged,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set:    { value: merged, updatedAt: new Date() },
    });
  return merged;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getClientPhone(clientId: string): Promise<string | null> {
  try {
    const [c] = await db
      .select({ phone: clientsTable.phone })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);
    return c?.phone ?? null;
  } catch {
    return null;
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  try {
    const devKeys = await getDevApiKeys();
    const apiKey  = process.env["ACHEK_API_KEY"] ?? devKeys["achek_api_key"] ?? "";
    if (!apiKey) {
      logger.warn("WhatsApp alerts: ACHEK_API_KEY not configured — skipping");
      return;
    }
    const client = new AchekConnect({ apiKey });
    await client.alerts.send({ phoneNumber: phone, message, category: "notification" });
    logger.debug({ phone: phone.slice(0, 6) + "****" }, "WhatsApp alert sent");
  } catch (err) {
    logger.warn({ err }, "WhatsApp alert: send failed (non-fatal)");
  }
}

function fmt(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Public alert functions ────────────────────────────────────────────────────

export async function alertOrderFilled(params: {
  clientId:      string;
  symbol:        string;
  side:          "buy" | "sell";
  quantity:      number;
  fillPriceKobo: number;
  clOrdId:       string;
}): Promise<void> {
  const prefs = await getClientNotifPrefs(params.clientId);
  if (!prefs.wa_order_filled) return;
  const phone = await getClientPhone(params.clientId);
  if (!phone) return;

  const emoji = params.side === "buy" ? "✅" : "💰";
  const dir   = params.side === "buy" ? "BUY" : "SELL";
  const msg   = [
    `${emoji} *Order Filled*`,
    ``,
    `${dir} *${params.quantity.toLocaleString()} ${params.symbol}* @ ${fmt(params.fillPriceKobo)}`,
    ``,
    `Ref: ${params.clOrdId.slice(0, 12).toUpperCase()}`,
    `_Log in to the portal to view your updated portfolio._`,
  ].join("\n");

  void sendWhatsApp(phone, msg);
}

export async function alertDeposit(params: {
  clientId:         string;
  amountKobo:       number;
  balanceAfterKobo: number;
  bankName:         string;
  reference:        string;
}): Promise<void> {
  const prefs = await getClientNotifPrefs(params.clientId);
  if (!prefs.wa_deposit) return;
  const phone = await getClientPhone(params.clientId);
  if (!phone) return;

  const msg = [
    `💵 *Deposit Received*`,
    ``,
    `*${fmt(params.amountKobo)}* credited via ${params.bankName}.`,
    `Balance: *${fmt(params.balanceAfterKobo)}*`,
    `Ref: ${params.reference}`,
  ].join("\n");

  void sendWhatsApp(phone, msg);
}

export async function alertWithdrawal(params: {
  clientId:         string;
  amountKobo:       number;
  balanceAfterKobo: number;
  bankName:         string;
  reference:        string;
}): Promise<void> {
  const prefs = await getClientNotifPrefs(params.clientId);
  if (!prefs.wa_withdrawal) return;
  const phone = await getClientPhone(params.clientId);
  if (!phone) return;

  const msg = [
    `🏦 *Withdrawal Requested*`,
    ``,
    `*${fmt(params.amountKobo)}* withdrawal to ${params.bankName} is pending processing.`,
    `Balance: *${fmt(params.balanceAfterKobo)}*`,
    `Ref: ${params.reference}`,
    `_Allow 1 business day for settlement._`,
  ].join("\n");

  void sendWhatsApp(phone, msg);
}
