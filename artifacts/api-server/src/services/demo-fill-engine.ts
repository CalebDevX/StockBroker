/**
 * Demo Fill Engine — simulates NGX ATS order execution for DEMO mode.
 *
 * In demo mode orders are filled by this engine after a realistic delay,
 * with a small random price variation to mimic market spread.
 * The fill logic (position updates, transaction records, WebSocket broadcast)
 * is identical to what the live FIX session does so the client sees the same
 * execution flow regardless of mode.
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  ordersTable, clientsTable, positionsTable, transactionsTable, instrumentsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getWsServer } from "../websocket.js";

// Simulate realistic execution delay
function fillDelayMs(orderType: "market" | "limit"): number {
  return orderType === "market"
    ? 800  + Math.random() * 2_200   // 0.8 – 3 s
    : 2_000 + Math.random() * 8_000; // 2 – 10 s
}

// Small random slippage (±0.5%) to mimic market spread
function jitterPrice(priceKobo: number): number {
  const slippage = 1 + (Math.random() * 0.01 - 0.005);
  return Math.round(priceKobo * slippage);
}

export function scheduleDemoFill(params: {
  orderId:      string;
  clOrdId:      string;
  clientId:     string;
  symbol:       string;
  side:         "buy" | "sell";
  orderType:    "market" | "limit";
  quantity:     number;
  priceKobo:    number; // fill reference price
}): void {
  const delay = fillDelayMs(params.orderType);

  setTimeout(() => {
    void executeDemoFill(params);
  }, delay);

  logger.info(
    { clOrdId: params.clOrdId, delayMs: Math.round(delay) },
    "DEMO: fill scheduled",
  );
}

async function executeDemoFill(params: {
  orderId:   string;
  clOrdId:   string;
  clientId:  string;
  symbol:    string;
  side:      "buy" | "sell";
  orderType: "market" | "limit";
  quantity:  number;
  priceKobo: number;
}): Promise<void> {
  try {
    // Refresh current price from DB for market orders
    let fillPriceKobo = params.priceKobo;
    if (params.orderType === "market") {
      const [inst] = await db
        .select({ lastPriceKobo: instrumentsTable.lastPriceKobo })
        .from(instrumentsTable)
        .where(eq(instrumentsTable.symbol, params.symbol))
        .limit(1);
      if (inst) fillPriceKobo = jitterPrice(inst.lastPriceKobo);
    } else {
      fillPriceKobo = jitterPrice(params.priceKobo);
    }

    // 1. Mark order filled
    await db.update(ordersTable).set({
      status:          "filled",
      filledQuantity:  params.quantity,
      avgFillPriceKobo: fillPriceKobo,
      filledAt:        new Date(),
      updatedAt:       new Date(),
    }).where(eq(ordersTable.id, params.orderId));

    // 2. Apply fill to position + transactions
    if (params.side === "buy") {
      await applyBuyFill(params.clientId, params.symbol, params.quantity, fillPriceKobo, params.orderId);
    } else {
      await applySellFill(params.clientId, params.symbol, params.quantity, fillPriceKobo, params.orderId);
    }

    logger.info(
      { clOrdId: params.clOrdId, fillPriceKobo, qty: params.quantity },
      "DEMO: order filled",
    );

    // 3. Broadcast execution event via WebSocket
    try {
      getWsServer().broadcast(params.clOrdId, {
        type:           "execution",
        orderId:        params.orderId,
        clOrdId:        params.clOrdId,
        symbol:         params.symbol,
        side:           params.side,
        status:         "filled",
        fillQty:        params.quantity,
        fillPriceNaira: fillPriceKobo / 100,
        cumQty:         params.quantity,
        timestamp:      new Date().toISOString(),
        mode:           "demo",
      });
    } catch {
      // WS server may not be set up yet — non-fatal
    }

  } catch (err) {
    logger.error({ err, orderId: params.orderId }, "DEMO: fill failed");
  }
}

async function applyBuyFill(
  clientId: string, symbol: string, qty: number, fillPriceKobo: number, orderId: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(positionsTable)
    .where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)))
    .limit(1);

  const totalQty = (existing?.quantity ?? 0) + qty;
  const newAvgKobo = existing
    ? Math.round(
        ((existing.avgCostKobo * existing.quantity) + (fillPriceKobo * qty)) / totalQty,
      )
    : fillPriceKobo;

  if (existing) {
    await db.update(positionsTable).set({
      quantity:         totalQty,
      avgCostKobo:      newAvgKobo,
      currentPriceKobo: fillPriceKobo,
      marketValueKobo:  totalQty * fillPriceKobo,
      unrealisedPnlKobo: (fillPriceKobo - newAvgKobo) * totalQty,
      updatedAt:        new Date(),
    }).where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)));
  } else {
    await db.insert(positionsTable).values({
      id:               uuidv4(),
      clientId,
      symbol,
      quantity:         qty,
      reservedQuantity: 0,
      avgCostKobo:      fillPriceKobo,
      currentPriceKobo: fillPriceKobo,
      marketValueKobo:  qty * fillPriceKobo,
      unrealisedPnlKobo: 0,
    }).onConflictDoNothing();
  }

  const [client] = await db.select({ cashBalanceKobo: clientsTable.cashBalanceKobo })
    .from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);

  await db.insert(transactionsTable).values({
    id:              uuidv4(),
    clientId,
    orderId,
    type:            "buy",
    amountKobo:      -(qty * fillPriceKobo),
    balanceAfterKobo: client?.cashBalanceKobo ?? 0,
    reference:       `DEMOFILL-${orderId.slice(0, 8).toUpperCase()}`,
    description:     `[DEMO] Buy fill: ${qty} × ${symbol} @ ₦${(fillPriceKobo / 100).toFixed(2)}`,
  });
}

async function applySellFill(
  clientId: string, symbol: string, qty: number, fillPriceKobo: number, orderId: string,
): Promise<void> {
  const [pos] = await db
    .select()
    .from(positionsTable)
    .where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)))
    .limit(1);

  if (pos) {
    const newQty = Math.max(0, pos.quantity - qty);
    await db.update(positionsTable).set({
      quantity:         newQty,
      reservedQuantity: Math.max(0, (pos.reservedQuantity ?? 0) - qty),
      currentPriceKobo: fillPriceKobo,
      marketValueKobo:  newQty * fillPriceKobo,
      unrealisedPnlKobo: newQty > 0 ? (fillPriceKobo - pos.avgCostKobo) * newQty : 0,
      updatedAt:        new Date(),
    }).where(and(eq(positionsTable.clientId, clientId), eq(positionsTable.symbol, symbol)));
  }

  // Credit proceeds to cash balance
  const proceeds = qty * fillPriceKobo;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
  if (client) {
    const newBalance = client.cashBalanceKobo + proceeds;
    await db.update(clientsTable)
      .set({ cashBalanceKobo: newBalance })
      .where(eq(clientsTable.id, clientId));

    await db.insert(transactionsTable).values({
      id:               uuidv4(),
      clientId,
      orderId,
      type:             "sell",
      amountKobo:       proceeds,
      balanceAfterKobo: newBalance,
      reference:        `DEMOFILL-${orderId.slice(0, 8).toUpperCase()}`,
      description:      `[DEMO] Sell fill: ${qty} × ${symbol} @ ₦${(fillPriceKobo / 100).toFixed(2)}`,
    });
  }
}
