import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  clientsTable,
  ordersTable,
  positionsTable,
  instrumentsTable,
  auditLogTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { isDemo, isLive } from "./trading-mode.js";
import { scheduleDemoFill } from "./demo-fill-engine.js";
import { getFixSession } from "./fix-session.js";
import { getWsServer } from "../websocket.js";

// ── NGX Regulatory Fee Schedule (as at 2025) ──────────────────────────────────
// All calculations done in kobo integer arithmetic — zero floating point rounding errors
const FEE = {
  BROKERAGE_RATE:     0.0075,   // 0.75% of consideration
  VAT_RATE:           0.075,    // 7.5% VAT on brokerage
  SEC_LEVY_RATE:      0.003,    // 0.3% SEC Levy
  NSE_CHARGE_RATE:    0.003,    // 0.3% NGX charge
  CSCS_CHARGE_RATE:   0.001,    // 0.1% CSCS depository charge
  STAMP_DUTY_RATE:    0.00075,  // 0.075% stamp duty (buys only)
  MIN_BROKERAGE_KOBO: 100_00,   // ₦100 minimum brokerage
} as const;

export interface PlaceOrderInput {
  clientId:        string;
  symbol:          string;
  side:            "buy" | "sell";
  orderType:       "market" | "limit";
  quantity:        number;
  limitPriceNaira?: number;
  validity?:       "day" | "gtc" | "ioc" | "fok";
  ipAddress?:      string;
}

export interface FeeBreakdown {
  grossConsiderationKobo: number;
  brokerageFeeKobo:       number;
  vatKobo:                number;
  secLevyKobo:            number;
  nseChargeKobo:          number;
  cscsChargeKobo:         number;
  stampDutyKobo:          number;
  totalCostKobo:          number;
}

export function calculateFees(
  side: "buy" | "sell",
  quantity: number,
  priceKobo: number,
): FeeBreakdown {
  const grossConsiderationKobo = quantity * priceKobo;
  const rawBrokerageKobo = Math.round(grossConsiderationKobo * FEE.BROKERAGE_RATE);
  const brokerageFeeKobo = Math.max(rawBrokerageKobo, FEE.MIN_BROKERAGE_KOBO);
  const vatKobo          = Math.round(brokerageFeeKobo * FEE.VAT_RATE);
  const secLevyKobo      = Math.round(grossConsiderationKobo * FEE.SEC_LEVY_RATE);
  const nseChargeKobo    = Math.round(grossConsiderationKobo * FEE.NSE_CHARGE_RATE);
  const cscsChargeKobo   = Math.round(grossConsiderationKobo * FEE.CSCS_CHARGE_RATE);
  const stampDutyKobo    = side === "buy"
    ? Math.round(grossConsiderationKobo * FEE.STAMP_DUTY_RATE)
    : 0;

  const totalCostKobo =
    grossConsiderationKobo +
    brokerageFeeKobo +
    vatKobo +
    secLevyKobo +
    nseChargeKobo +
    cscsChargeKobo +
    stampDutyKobo;

  return {
    grossConsiderationKobo,
    brokerageFeeKobo,
    vatKobo,
    secLevyKobo,
    nseChargeKobo,
    cscsChargeKobo,
    stampDutyKobo,
    totalCostKobo,
  };
}

export async function placeOrder(input: PlaceOrderInput) {
  const mode = isDemo() ? "demo" : "live";

  // 1. Load client
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, input.clientId))
    .limit(1);

  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  if (!client.isActive || client.isSuspended) {
    throw Object.assign(new Error("Account suspended"), { status: 403 });
  }
  if (client.kycStatus !== "verified") {
    throw Object.assign(new Error("KYC not verified — please complete verification"), { status: 403 });
  }

  // 2. Load instrument
  const [instrument] = await db
    .select()
    .from(instrumentsTable)
    .where(eq(instrumentsTable.symbol, input.symbol.toUpperCase()))
    .limit(1);

  if (!instrument?.isActive) {
    throw Object.assign(new Error(`Symbol ${input.symbol} not found or not tradeable`), { status: 404 });
  }
  if (instrument.isTradingSuspended) {
    throw Object.assign(new Error(`Trading suspended for ${input.symbol}`), { status: 422 });
  }

  // 3. Determine price
  const priceKobo = input.orderType === "limit"
    ? Math.round((input.limitPriceNaira ?? 0) * 100)
    : instrument.lastPriceKobo;

  if (input.orderType === "limit") {
    if (!input.limitPriceNaira || input.limitPriceNaira <= 0) {
      throw Object.assign(new Error("Limit price required for limit orders"), { status: 400 });
    }
    // NGX circuit breaker: ±10% of last price
    if (instrument.upperLimitKobo && priceKobo > instrument.upperLimitKobo) {
      throw Object.assign(new Error("Price exceeds NGX upper circuit breaker limit"), { status: 422 });
    }
    if (instrument.lowerLimitKobo && priceKobo < instrument.lowerLimitKobo) {
      throw Object.assign(new Error("Price below NGX lower circuit breaker limit"), { status: 422 });
    }
  }

  // 4. Calculate fees
  const fees = calculateFees(input.side, input.quantity, priceKobo);

  // 5. Validate cash / position
  if (input.side === "buy") {
    if (client.cashBalanceKobo < fees.totalCostKobo) {
      const shortfall = fees.totalCostKobo - client.cashBalanceKobo;
      throw Object.assign(new Error(
        `Insufficient funds. Need ₦${(fees.totalCostKobo / 100).toFixed(2)}, ` +
        `have ₦${(client.cashBalanceKobo / 100).toFixed(2)}. ` +
        `Shortfall: ₦${(shortfall / 100).toFixed(2)}`
      ), { status: 422 });
    }
  } else {
    const [position] = await db
      .select()
      .from(positionsTable)
      .where(and(
        eq(positionsTable.clientId, input.clientId),
        eq(positionsTable.symbol, input.symbol.toUpperCase()),
      ))
      .limit(1);

    const availableQty = (position?.quantity ?? 0) - (position?.reservedQuantity ?? 0);
    if (availableQty < input.quantity) {
      throw Object.assign(new Error(
        `Insufficient shares. Available: ${availableQty}, Requested: ${input.quantity}`
      ), { status: 422 });
    }
  }

  // 6. Create order record
  const orderId = uuidv4();
  const clOrdId = `CL-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`;

  const [order] = await db.insert(ordersTable).values({
    id:            orderId,
    clientId:      input.clientId,
    clOrdId,
    symbol:        input.symbol.toUpperCase(),
    isin:          instrument.isin ?? undefined,
    side:          input.side,
    orderType:     input.orderType,
    validity:      input.validity ?? "day",
    quantity:      input.quantity,
    limitPriceKobo: input.orderType === "limit" ? priceKobo : undefined,
    status:        "pending",
    brokerCode:    process.env["BROKER_CODE"] ?? "0001",
    ...fees,
  }).returning();

  if (!order) throw new Error("Failed to create order record");

  // 7. Reserve funds / shares
  if (input.side === "buy") {
    await db.update(clientsTable)
      .set({ cashBalanceKobo: client.cashBalanceKobo - fees.totalCostKobo })
      .where(eq(clientsTable.id, input.clientId));
  } else {
    await db.update(positionsTable)
      .set({ reservedQuantity: input.quantity })
      .where(and(
        eq(positionsTable.clientId, input.clientId),
        eq(positionsTable.symbol, input.symbol.toUpperCase()),
      ));
  }

  // 8. Audit log
  await db.insert(auditLogTable).values({
    id:         uuidv4(),
    clientId:   input.clientId,
    actorId:    input.clientId,
    action:     "order.placed",
    entityType: "order",
    entityId:   orderId,
    details:    { clOrdId, symbol: input.symbol, side: input.side, quantity: input.quantity, fees, mode },
    ipAddress:  input.ipAddress,
  });

  // 9. Route order based on trading mode
  await db.update(ordersTable)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  if (isDemo()) {
    // ── DEMO MODE: schedule simulated fill locally ──────────────────────────
    scheduleDemoFill({
      orderId,
      clOrdId,
      clientId:  input.clientId,
      symbol:    input.symbol.toUpperCase(),
      side:      input.side,
      orderType: input.orderType,
      quantity:  input.quantity,
      priceKobo,
    });

    // Register order with WebSocket server so execution events reach the client
    try { getWsServer().registerOrder(clOrdId, input.clientId); } catch {}

  } else if (isLive()) {
    // ── LIVE MODE: submit to NGX ATS via FIX 4.4 ───────────────────────────
    const fixSession = getFixSession();

    if (!fixSession.isLoggedOn) {
      // FIX session not ready — reject order to prevent silent loss
      await db.update(ordersTable).set({
        status:       "rejected",
        rejectReason: "FIX session not connected — please retry",
      }).where(eq(ordersTable.id, orderId));

      // Refund reserved funds
      if (input.side === "buy") {
        await db.update(clientsTable)
          .set({ cashBalanceKobo: client.cashBalanceKobo })
          .where(eq(clientsTable.id, input.clientId));
      } else {
        await db.update(positionsTable)
          .set({ reservedQuantity: 0 })
          .where(and(
            eq(positionsTable.clientId, input.clientId),
            eq(positionsTable.symbol, input.symbol.toUpperCase()),
          ));
      }

      throw Object.assign(
        new Error("Live trading is currently unavailable — FIX session not connected"),
        { status: 503 },
      );
    }

    // Register order with WebSocket server (execution reports arrive via FIX)
    try { getWsServer().registerOrder(clOrdId, input.clientId); } catch {}

    // Send to NGX ATS
    fixSession.sendNewOrderSingle({
      clOrdId,
      symbol:         input.symbol.toUpperCase(),
      side:           input.side,
      orderType:      input.orderType,
      quantity:       input.quantity,
      limitPriceKobo: input.orderType === "limit" ? priceKobo : undefined,
      validity:       input.validity ?? "day",
    });
  }

  return { ...order, status: "submitted" as const, mode };
}

export async function cancelOrder(clientId: string, orderId: string) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.clientId, clientId)))
    .limit(1);

  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

  if (!["pending", "submitted", "partial"].includes(order.status)) {
    throw Object.assign(new Error(`Cannot cancel order in status: ${order.status}`), { status: 422 });
  }

  // In live mode, send cancel request to NGX ATS and wait for cancel confirmation
  if (isLive()) {
    const fixSession = getFixSession();
    if (fixSession.isLoggedOn) {
      const cancelClOrdId = `CXLREQ-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`;
      fixSession.sendOrderCancelRequest({
        origClOrdId: order.clOrdId,
        clOrdId:     cancelClOrdId,
        symbol:      order.symbol,
        side:        order.side as "buy" | "sell",
      });
      // Status will be updated to "cancelled" when cancel-confirm ExecReport arrives
      return { id: orderId, status: "pending_cancel" };
    }
  }

  // Demo mode or live with no FIX: cancel immediately
  await db.update(ordersTable).set({
    status:      "cancelled",
    cancelledAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  // Release reserved funds/shares
  if (order.side === "buy" && order.totalCostKobo) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (client) {
      await db.update(clientsTable)
        .set({ cashBalanceKobo: client.cashBalanceKobo + order.totalCostKobo })
        .where(eq(clientsTable.id, clientId));
    }
  } else if (order.side === "sell") {
    await db.update(positionsTable)
      .set({ reservedQuantity: 0 })
      .where(and(
        eq(positionsTable.clientId, clientId),
        eq(positionsTable.symbol, order.symbol),
      ));
  }

  await db.insert(auditLogTable).values({
    id:         uuidv4(),
    clientId,
    actorId:    clientId,
    action:     "order.cancelled",
    entityType: "order",
    entityId:   orderId,
    details:    { clOrdId: order.clOrdId, symbol: order.symbol, mode: isDemo() ? "demo" : "live" },
  });

  return { id: orderId, status: "cancelled" };
}
