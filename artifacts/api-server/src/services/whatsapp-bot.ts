import AchekConnect from "achek";
import { db } from "@workspace/db";
import {
  clientsTable,
  ordersTable,
  positionsTable,
  instrumentsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ── Session store ────────────────────────────────────────────────────────────
// In-memory session keyed by E.164 phone number.
// Each session has a 30-minute inactivity TTL.

interface BotSession {
  clientId: string;
  name: string;
  pendingOtpRequestId?: string;
  verifiedAt?: Date;
}

const sessions = new Map<string, BotSession>();
const SESSION_TTL_MS = 30 * 60 * 1_000; // 30 minutes

function isVerified(session: BotSession): boolean {
  return (
    !!session.verifiedAt &&
    Date.now() - session.verifiedAt.getTime() < SESSION_TTL_MS
  );
}

function touchSession(phone: string, session: BotSession): void {
  session.verifiedAt = new Date();
  sessions.set(phone, session);
}

// ── Achek client ─────────────────────────────────────────────────────────────

function achekClient(): AchekConnect {
  const apiKey = process.env["ACHEK_API_KEY"];
  if (!apiKey) throw new Error("ACHEK_API_KEY is not configured");
  return new AchekConnect({ apiKey });
}

async function sendReply(phone: string, message: string): Promise<void> {
  try {
    await achekClient().alerts.send({
      phoneNumber: phone,
      message,
      category: "notification",
    });
  } catch (err) {
    logger.error({ err, phone }, "WhatsApp bot: failed to send reply");
  }
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function lookupByPhone(phone: string) {
  // Normalise — try both with and without leading + so we match however
  // the number was stored at registration time.
  const withPlus    = phone.startsWith("+") ? phone : `+${phone}`;
  const withoutPlus = withPlus.replace(/^\+/, "");

  const [row] = await db
    .select({
      id:           clientsTable.id,
      fullName:     clientsTable.fullName,
      kycStatus:    clientsTable.kycStatus,
      kycTier:      clientsTable.kycTier,
      cashBalanceKobo: clientsTable.cashBalanceKobo,
      isActive:     clientsTable.isActive,
      isSuspended:  clientsTable.isSuspended,
    })
    .from(clientsTable)
    .where(
      sql`${clientsTable.phone} = ${withPlus} OR ${clientsTable.phone} = ${withoutPlus}`
    )
    .limit(1);

  return row ?? null;
}

function fmt(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function cmdBalance(phone: string, session: BotSession): Promise<void> {
  const [c] = await db
    .select({ cashBalanceKobo: clientsTable.cashBalanceKobo })
    .from(clientsTable)
    .where(eq(clientsTable.id, session.clientId))
    .limit(1);

  if (!c) { await sendReply(phone, "❌ Account not found."); return; }

  await sendReply(
    phone,
    `💰 *Cash Balance*\n\nAvailable: *${fmt(c.cashBalanceKobo)}*\n\n_NGX settlement is T+2 — funds from recent sells may be pending._`,
  );
}

interface PositionRow {
  symbol: string;
  quantity: number;
  marketValueKobo: number;
  unrealisedPnlKobo: number;
  instrumentName: string | null;
}

interface OrderRow {
  symbol: string;
  side: string;
  quantity: number;
  status: string;
  createdAt: Date;
}

async function cmdPortfolio(phone: string, session: BotSession): Promise<void> {
  const rows = await db
    .select({
      symbol:            positionsTable.symbol,
      quantity:          positionsTable.quantity,
      marketValueKobo:   positionsTable.marketValueKobo,
      unrealisedPnlKobo: positionsTable.unrealisedPnlKobo,
      instrumentName:    instrumentsTable.name,
    })
    .from(positionsTable)
    .leftJoin(instrumentsTable, eq(positionsTable.symbol, instrumentsTable.symbol))
    .where(
      and(
        eq(positionsTable.clientId, session.clientId),
        sql`${positionsTable.quantity} > 0`,
      ),
    ) as PositionRow[];

  if (rows.length === 0) {
    await sendReply(phone, "📊 *Portfolio*\n\nYou have no open positions.");
    return;
  }

  const totalValue = rows.reduce((s: number, r: PositionRow) => s + r.marketValueKobo, 0);
  const totalPnl   = rows.reduce((s: number, r: PositionRow) => s + r.unrealisedPnlKobo, 0);
  const pnlSign    = totalPnl >= 0 ? "+" : "";
  const pnlEmoji   = totalPnl >= 0 ? "📈" : "📉";

  const lines = rows.slice(0, 8).map((r: PositionRow) =>
    `• *${r.symbol}* — ${r.quantity.toLocaleString()} units · ${fmt(r.marketValueKobo)}`,
  );

  if (rows.length > 8) lines.push(`_…and ${rows.length - 8} more positions_`);

  await sendReply(
    phone,
    `📊 *Portfolio*\n\n${lines.join("\n")}\n\n💼 Equity value: *${fmt(totalValue)}*\n${pnlEmoji} Unrealised P&L: *${pnlSign}${fmt(totalPnl)}*`,
  );
}

async function cmdOrders(phone: string, session: BotSession): Promise<void> {
  const orders = await db
    .select({
      symbol:    ordersTable.symbol,
      side:      ordersTable.side,
      quantity:  ordersTable.quantity,
      status:    ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.clientId, session.clientId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5) as OrderRow[];

  if (orders.length === 0) {
    await sendReply(phone, "📋 *Recent Orders*\n\nNo orders found.");
    return;
  }

  const STATUS_EMOJI: Record<string, string> = {
    filled: "✅", pending: "⏳", submitted: "📤", partial: "🔄",
    cancelled: "❌", rejected: "🚫", expired: "⌛",
  };

  const lines = orders.map((o: OrderRow) => {
    const emoji = STATUS_EMOJI[o.status] ?? "•";
    const date  = o.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
    return `${emoji} *${o.side.toUpperCase()} ${o.quantity.toLocaleString()} ${o.symbol}* · ${o.status.toUpperCase()} (${date})`;
  });

  await sendReply(
    phone,
    `📋 *Recent Orders* (last 5)\n\n${lines.join("\n")}\n\n_Visit the portal to see all orders._`,
  );
}

async function cmdStatus(phone: string, session: BotSession): Promise<void> {
  const [c] = await db
    .select({ kycStatus: clientsTable.kycStatus, kycTier: clientsTable.kycTier })
    .from(clientsTable)
    .where(eq(clientsTable.id, session.clientId))
    .limit(1);

  const KYC_EMOJI: Record<string, string> = {
    verified: "✅", pending: "⏳", under_review: "🔍", rejected: "❌",
  };

  const kycStatus = c?.kycStatus ?? "pending";
  const kycTier   = c?.kycTier   ?? "tier1";
  const emoji     = KYC_EMOJI[kycStatus] ?? "•";
  const appName   = process.env["APP_NAME"] ?? "StockBroker NG";

  await sendReply(
    phone,
    `🪪 *Account Status*\n\nKYC: ${emoji} ${kycStatus.replace("_", " ").toUpperCase()}\nTier: ${kycTier.toUpperCase()}\n\nUpgrade KYC on the *${appName}* portal to unlock higher limits.`,
  );
}

async function cmdHelp(phone: string): Promise<void> {
  const appName = process.env["APP_NAME"] ?? "StockBroker NG";
  await sendReply(
    phone,
    `📱 *${appName} — WhatsApp Commands*\n\n` +
    `💰 *BAL* — Available cash balance\n` +
    `📊 *PORT* — Portfolio & holdings\n` +
    `📋 *ORDERS* — Recent 5 orders\n` +
    `🪪 *STATUS* — KYC & account status\n` +
    `🚪 *LOGOUT* — End this session\n` +
    `❓ *HELP* — Show this menu\n\n` +
    `_Your session expires after 30 minutes of inactivity._`,
  );
}

async function dispatchCommand(
  phone: string,
  session: BotSession,
  text: string,
): Promise<void> {
  const cmd = text.trim().toUpperCase().split(/\s+/)[0] ?? "";

  switch (cmd) {
    case "BAL":
    case "BALANCE":    return cmdBalance(phone, session);
    case "PORT":
    case "PORTFOLIO":  return cmdPortfolio(phone, session);
    case "ORDERS":
    case "ORDER":      return cmdOrders(phone, session);
    case "STATUS":
    case "KYC":        return cmdStatus(phone, session);
    case "HELP":
    case "MENU":       return cmdHelp(phone);
    case "LOGOUT":
    case "EXIT": {
      sessions.delete(phone);
      await sendReply(phone, `👋 You've been logged out. Reply *HELP* anytime to start again.`);
      return;
    }
    default:
      await sendReply(phone, `❓ I didn't understand that.\n\nReply *HELP* to see available commands.`);
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  phone: string,
  message: string,
): Promise<void> {
  const text    = message.trim();
  const appName = process.env["APP_NAME"] ?? "StockBroker NG";
  const appUrl  = process.env["APP_URL"]  ?? "https://app.stockbroker.ng";

  logger.info({ phone, textSnippet: text.slice(0, 60) }, "WhatsApp bot: incoming");

  // ── 1. Resolve account ───────────────────────────────────────────────
  const client = await lookupByPhone(phone);

  if (!client) {
    await sendReply(
      phone,
      `👋 Welcome to *${appName}*!\n\nWe couldn't find an account linked to this number.\n\nRegister at ${appUrl} to get started.`,
    );
    return;
  }

  if (!client.isActive || client.isSuspended) {
    await sendReply(
      phone,
      `⚠️ Your ${appName} account is currently suspended. Please contact support.`,
    );
    return;
  }

  // ── 2. Check existing verified session ───────────────────────────────
  const session = sessions.get(phone);

  if (session && isVerified(session)) {
    touchSession(phone, session);
    await dispatchCommand(phone, session, text);
    return;
  }

  // ── 3. Check if user is replying with an OTP code ────────────────────
  if (session?.pendingOtpRequestId && /^\d{6}$/.test(text)) {
    try {
      const result = await achekClient().otp.verify(session.pendingOtpRequestId, text);
      if (result.valid) {
        session.verifiedAt = new Date();
        delete session.pendingOtpRequestId;
        sessions.set(phone, session);
        logger.info({ phone, clientId: session.clientId }, "WhatsApp bot: OTP verified");
        await sendReply(
          phone,
          `✅ Verified! Welcome, *${client.fullName.split(" ")[0]}*.\n\nReply *HELP* to see what I can do for you.`,
        );
      } else {
        await sendReply(phone, `❌ Incorrect code. Please try again, or reply *VERIFY* to request a new code.`);
      }
    } catch (err) {
      logger.error({ err }, "WhatsApp bot: OTP verify error");
      await sendReply(phone, `⚠️ Could not verify that code. Reply *VERIFY* to get a new one.`);
    }
    return;
  }

  // Allow "VERIFY" keyword to re-trigger OTP even mid-flow
  if (text.toUpperCase() === "VERIFY") {
    sessions.delete(phone);
  }

  // ── 4. Start a new verification flow ─────────────────────────────────
  try {
    const firstName = client.fullName.split(" ")[0];
    const { requestId } = await achekClient().otp.send(phone);
    sessions.set(phone, {
      clientId: client.id,
      name: client.fullName,
      pendingOtpRequestId: requestId,
    });
    logger.info({ phone, clientId: client.id }, "WhatsApp bot: OTP sent");
    await sendReply(
      phone,
      `👋 Hi *${firstName}*!\n\nTo protect your account, please enter the 6-digit code we just sent to your WhatsApp.`,
    );
  } catch (err) {
    logger.error({ err }, "WhatsApp bot: OTP send failed");
    await sendReply(
      phone,
      `⚠️ We couldn't send a verification code right now. Please try again later or use the *${appName}* app at ${appUrl}.`,
    );
  }
}
