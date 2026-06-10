/**
 * FIX 4.4 Session Manager — connects to NGX Automated Trading System
 *
 * Required env vars (live mode only):
 *   FIX_HOST            — NGX ATS hostname (e.g. ats.ngxgroup.com)
 *   FIX_PORT            — TCP port (e.g. 4849)
 *   FIX_SENDER_COMP_ID  — Your broker's CompID (e.g. BROKER001)
 *   FIX_TARGET_COMP_ID  — NGX ATS CompID (e.g. NGXATS)
 *   FIX_PASSWORD        — Broker logon password
 *   FIX_HEART_BT_INT    — Heartbeat interval in seconds (default 30)
 */

import net from "net";
import { EventEmitter } from "events";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import {
  ordersTable, clientsTable, positionsTable, transactionsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getWsServer } from "../websocket.js";

const SOH = "\x01";

// ── FIX 4.4 message helpers ──────────────────────────────────────────────────

function fixChecksum(msg: string): string {
  let sum = 0;
  for (let i = 0; i < msg.length; i++) sum += msg.charCodeAt(i);
  return (sum % 256).toString().padStart(3, "0");
}

function buildFix(fields: [number, string][]): string {
  const body = fields.map(([tag, val]) => `${tag}=${val}${SOH}`).join("");
  const bodyLen = Buffer.byteLength(body, "utf8");
  const header = `8=FIX.4.4${SOH}9=${bodyLen}${SOH}`;
  const trailer = `10=${fixChecksum(header + body)}${SOH}`;
  return header + body + trailer;
}

function parseFix(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  raw.split(SOH).filter(Boolean).forEach((field) => {
    const eq = field.indexOf("=");
    if (eq > 0) result[field.slice(0, eq)] = field.slice(eq + 1);
  });
  return result;
}

function utcNow(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 21);
}

// ── ExecType → order status mapping ─────────────────────────────────────────

type OrderStatus = "submitted" | "partial" | "filled" | "cancelled" | "rejected" | "expired";

function execTypeToStatus(execType: string, ordStatus: string): OrderStatus | null {
  // execType (tag 150) takes precedence for terminal states
  switch (execType) {
    case "0": return "submitted";   // New
    case "1": return "partial";     // Partial fill
    case "2": return "filled";      // Fill
    case "4": return "cancelled";   // Cancelled
    case "8": return "rejected";    // Rejected
    case "C": return "expired";     // Expired
    default: break;
  }
  // Fallback to OrdStatus (tag 39)
  switch (ordStatus) {
    case "0": return "submitted";
    case "1": return "partial";
    case "2": return "filled";
    case "4": return "cancelled";
    case "8": return "rejected";
    case "C": return "expired";
    default: return null;
  }
}

// ── FIX Session ──────────────────────────────────────────────────────────────

export class FixSession extends EventEmitter {
  private socket: net.Socket | null = null;
  private buf = "";
  private seqNum = 1;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 5_000;
  private _connected = false;
  private _loggedOn = false;
  private _destroyed = false;

  private readonly host:         string;
  private readonly port:         number;
  private readonly senderCompId: string;
  private readonly targetCompId: string;
  private readonly password:     string;
  private readonly heartBtInt:   number;

  constructor() {
    super();
    this.host         = process.env["FIX_HOST"]           ?? "";
    this.port         = parseInt(process.env["FIX_PORT"]  ?? "4849", 10);
    this.senderCompId = process.env["FIX_SENDER_COMP_ID"] ?? "";
    this.targetCompId = process.env["FIX_TARGET_COMP_ID"] ?? "NGXATS";
    this.password     = process.env["FIX_PASSWORD"]       ?? "";
    this.heartBtInt   = parseInt(process.env["FIX_HEART_BT_INT"] ?? "30", 10);
  }

  get isConnected(): boolean  { return this._connected; }
  get isLoggedOn(): boolean   { return this._loggedOn;  }

  // ── Public API ─────────────────────────────────────────────────────────────

  connect(): void {
    if (this._destroyed) return;
    if (!this.host) {
      logger.warn("FIX: FIX_HOST not set — session will not connect");
      return;
    }

    logger.info({ host: this.host, port: this.port }, "FIX: connecting…");
    const sock = new net.Socket();
    this.socket = sock;

    sock.connect(this.port, this.host, () => {
      this._connected = true;
      this.reconnectDelay = 5_000;
      logger.info("FIX: TCP connected — sending Logon");
      this.sendLogon();
    });

    sock.on("data", (data: Buffer) => {
      this.buf += data.toString("utf8");
      this.processBuffer();
    });

    sock.on("close", () => {
      this._connected = false;
      this._loggedOn  = false;
      logger.warn("FIX: connection closed");
      this.clearHeartbeat();
      this.scheduleReconnect();
      this.emit("disconnected");
    });

    sock.on("error", (err) => {
      logger.warn({ err: err.message }, "FIX: socket error");
    });
  }

  destroy(): void {
    this._destroyed = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) { this.socket.destroy(); this.socket = null; }
  }

  sendNewOrderSingle(params: {
    clOrdId:    string;
    symbol:     string;
    side:       "buy" | "sell";
    orderType:  "market" | "limit";
    quantity:   number;
    limitPriceKobo?: number;
    validity?:  "day" | "gtc" | "ioc" | "fok";
  }): void {
    if (!this._loggedOn) {
      logger.error("FIX: cannot send order — not logged on");
      return;
    }

    const sideCode  = params.side === "buy" ? "1" : "2";
    const typeCode  = params.orderType === "market" ? "1" : "2";
    const tifCode   = { day: "0", gtc: "1", ioc: "3", fok: "4" }[params.validity ?? "day"];

    const fields: [number, string][] = [
      [35,  "D"],
      [49,  this.senderCompId],
      [56,  this.targetCompId],
      [34,  String(this.seqNum++)],
      [52,  utcNow()],
      [11,  params.clOrdId],
      [55,  params.symbol],
      [54,  sideCode],
      [60,  utcNow()],
      [38,  String(params.quantity)],
      [40,  typeCode],
      [59,  tifCode],
    ];

    if (params.orderType === "limit" && params.limitPriceKobo) {
      // NGX expects price in Naira with 2 decimal places
      const priceNaira = (params.limitPriceKobo / 100).toFixed(2);
      fields.push([44, priceNaira]);
    }

    this.send(buildFix(fields));
    logger.info({ clOrdId: params.clOrdId, symbol: params.symbol, side: params.side }, "FIX: sent NewOrderSingle");
  }

  sendOrderCancelRequest(params: {
    origClOrdId: string;
    clOrdId:     string;
    symbol:      string;
    side:        "buy" | "sell";
  }): void {
    if (!this._loggedOn) return;

    const fields: [number, string][] = [
      [35,  "F"],
      [49,  this.senderCompId],
      [56,  this.targetCompId],
      [34,  String(this.seqNum++)],
      [52,  utcNow()],
      [41,  params.origClOrdId],
      [11,  params.clOrdId],
      [55,  params.symbol],
      [54,  params.side === "buy" ? "1" : "2"],
      [60,  utcNow()],
    ];

    this.send(buildFix(fields));
    logger.info({ origClOrdId: params.origClOrdId }, "FIX: sent OrderCancelRequest");
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private send(msg: string): void {
    if (!this.socket || !this._connected) return;
    this.socket.write(msg, "utf8");
  }

  private sendLogon(): void {
    const fields: [number, string][] = [
      [35,  "A"],
      [49,  this.senderCompId],
      [56,  this.targetCompId],
      [34,  String(this.seqNum++)],
      [52,  utcNow()],
      [98,  "0"],                        // EncryptMethod = None
      [108, String(this.heartBtInt)],
      [554, this.password],
    ];
    this.send(buildFix(fields));
  }

  private sendHeartbeat(testReqId?: string): void {
    const fields: [number, string][] = [
      [35,  "0"],
      [49,  this.senderCompId],
      [56,  this.targetCompId],
      [34,  String(this.seqNum++)],
      [52,  utcNow()],
    ];
    if (testReqId) fields.push([112, testReqId]);
    this.send(buildFix(fields));
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartBtInt * 1000);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private scheduleReconnect(): void {
    if (this._destroyed) return;
    logger.info({ delayMs: this.reconnectDelay }, "FIX: scheduling reconnect");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60_000);
      this.connect();
    }, this.reconnectDelay);
  }

  private processBuffer(): void {
    // FIX messages end with 10=XXX\x01
    const msgEnd = /10=\d{3}\x01/;
    let match: RegExpExecArray | null;
    while ((match = msgEnd.exec(this.buf)) !== null) {
      const end = match.index + match[0].length;
      const raw = this.buf.slice(0, end);
      this.buf = this.buf.slice(end);
      try { this.handleMessage(parseFix(raw)); } catch {}
    }
  }

  private handleMessage(msg: Record<string, string>): void {
    const msgType = msg["35"] ?? "";

    switch (msgType) {
      case "A": {
        this._loggedOn = true;
        this.startHeartbeat();
        logger.info("FIX: Logon accepted — session established");
        this.emit("logon");
        break;
      }
      case "0": {
        // Heartbeat — nothing needed
        break;
      }
      case "1": {
        // TestRequest — echo back as Heartbeat with TestReqID
        this.sendHeartbeat(msg["112"]);
        break;
      }
      case "5": {
        // Logout — server-initiated; disconnect and reconnect
        this._loggedOn = false;
        logger.warn({ text: msg["58"] }, "FIX: received Logout");
        this.socket?.destroy();
        break;
      }
      case "8": {
        // Execution Report
        void this.handleExecReport(msg);
        break;
      }
      case "9": {
        // Order Cancel Reject
        logger.warn({ clOrdId: msg["11"], reason: msg["58"] }, "FIX: OrderCancelReject");
        break;
      }
      default:
        break;
    }
  }

  private async handleExecReport(msg: Record<string, string>): Promise<void> {
    const clOrdId    = msg["11"] ?? "";
    const ngxOrderId = msg["37"] ?? "";
    const execType   = msg["150"] ?? "";
    const ordStatus  = msg["39"] ?? "";
    const lastQty    = parseInt(msg["32"] ?? "0", 10);
    const lastPx     = parseFloat(msg["31"] ?? "0");   // Naira
    const cumQty     = parseInt(msg["14"] ?? "0", 10);
    const rejectText = msg["58"] ?? "";

    const status = execTypeToStatus(execType, ordStatus);
    if (!status) return;

    const lastPxKobo = Math.round(lastPx * 100);

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.clOrdId, clOrdId))
        .limit(1);

      if (!order) { logger.warn({ clOrdId }, "FIX: ExecReport for unknown clOrdId"); return; }

      const updates: Partial<typeof ordersTable.$inferSelect> = {
        status,
        ngxOrderId: ngxOrderId || order.ngxOrderId,
        filledQuantity: cumQty,
        updatedAt: new Date(),
      };

      if (lastPxKobo > 0) updates.avgFillPriceKobo = lastPxKobo;
      if (status === "filled" || status === "partial") updates.filledAt = new Date();
      if (status === "rejected") updates.rejectReason = rejectText;

      await db.update(ordersTable)
        .set(updates)
        .where(eq(ordersTable.clOrdId, clOrdId));

      if ((status === "filled" || status === "partial") && lastQty > 0) {
        await this.applyFill(order.clientId, order.symbol, order.side, lastQty, lastPxKobo, order.id);
      }

      // Release reserved funds if rejected/cancelled
      if (["rejected", "cancelled", "expired"].includes(status)) {
        await this.releaseReserved(order);
      }

      // Broadcast to client via WebSocket
      try {
        getWsServer().broadcast(clOrdId, {
          type:        "execution",
          orderId:     order.id,
          clOrdId,
          ngxOrderId,
          symbol:      order.symbol,
          side:        order.side,
          status,
          fillQty:     lastQty,
          fillPriceNaira: lastPx,
          cumQty,
          rejectReason: rejectText || undefined,
          timestamp:   new Date().toISOString(),
          mode:        "live",
        });
      } catch {}

    } catch (err) {
      logger.error({ err, clOrdId }, "FIX: failed to process ExecReport");
    }
  }

  private async applyFill(
    clientId: string, symbol: string, side: "buy" | "sell",
    qty: number, fillPriceKobo: number, orderId: string,
  ): Promise<void> {
    if (side === "buy") {
      // Upsert position
      const [existing] = await db
        .select().from(positionsTable)
        .where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)))
        .limit(1);

      const totalQty = (existing?.quantity ?? 0) + qty;
      const newAvgKobo = existing
        ? Math.round(((existing.avgCostKobo * existing.quantity) + (fillPriceKobo * qty)) / totalQty)
        : fillPriceKobo;

      if (existing) {
        await db.update(positionsTable).set({
          quantity: totalQty,
          avgCostKobo: newAvgKobo,
          currentPriceKobo: fillPriceKobo,
          marketValueKobo: totalQty * fillPriceKobo,
          updatedAt: new Date(),
        }).where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)));
      } else {
        await db.insert(positionsTable).values({
          id: uuidv4(), clientId, symbol,
          quantity: qty, reservedQuantity: 0,
          avgCostKobo: newAvgKobo,
          currentPriceKobo: fillPriceKobo,
          marketValueKobo: qty * fillPriceKobo,
          unrealisedPnlKobo: 0,
        });
      }

      await db.insert(transactionsTable).values({
        id: uuidv4(), clientId, orderId,
        type: "buy",
        amountKobo: -(qty * fillPriceKobo),
        balanceAfterKobo: 0,
        reference: `FILL-${orderId.slice(0, 8)}`,
        description: `Buy fill: ${qty} × ${symbol} @ ₦${(fillPriceKobo / 100).toFixed(2)}`,
      });

    } else {
      // Sell — decrease position, credit cash
      const [pos] = await db
        .select().from(positionsTable)
        .where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)))
        .limit(1);

      if (pos) {
        const newQty = Math.max(0, pos.quantity - qty);
        await db.update(positionsTable).set({
          quantity: newQty,
          reservedQuantity: Math.max(0, (pos.reservedQuantity ?? 0) - qty),
          marketValueKobo: newQty * fillPriceKobo,
          updatedAt: new Date(),
        }).where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)));
      }

      // Credit proceeds to cash
      const proceeds = qty * fillPriceKobo;
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
      if (client) {
        const newBalance = client.cashBalanceKobo + proceeds;
        await db.update(clientsTable)
          .set({ cashBalanceKobo: newBalance })
          .where(eq(clientsTable.id, clientId));

        await db.insert(transactionsTable).values({
          id: uuidv4(), clientId, orderId,
          type: "sell",
          amountKobo: proceeds,
          balanceAfterKobo: newBalance,
          reference: `FILL-${orderId.slice(0, 8)}`,
          description: `Sell fill: ${qty} × ${symbol} @ ₦${(fillPriceKobo / 100).toFixed(2)}`,
        });
      }
    }
  }

  private async releaseReserved(order: { id: string; clientId: string; symbol: string; side: string; totalCostKobo?: number | null }): Promise<void> {
    if (order.side === "buy" && order.totalCostKobo) {
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, order.clientId)).limit(1);
      if (client) {
        await db.update(clientsTable)
          .set({ cashBalanceKobo: client.cashBalanceKobo + order.totalCostKobo })
          .where(eq(clientsTable.id, order.clientId));
      }
    } else if (order.side === "sell") {
      await db.update(positionsTable)
        .set({ reservedQuantity: 0 })
        .where(and(eq(positionsTable.clientId, order.clientId), eq(positionsTable.symbol, order.symbol)));
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let _session: FixSession | null = null;

export function getFixSession(): FixSession {
  if (!_session) _session = new FixSession();
  return _session;
}

export function startFixSession(): void {
  getFixSession().connect();
}
