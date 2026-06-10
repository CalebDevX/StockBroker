import { db } from "@workspace/db";
import {
  positionsTable,
  transactionsTable,
  ordersTable,
  clientsTable,
  instrumentsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { syncPositionsFromCscs } from "./cscs-a2a.js";
import { isLive } from "./trading-mode.js";

export async function getPortfolioSummary(clientId: string) {
  const [client] = await db
    .select({ cashBalanceKobo: clientsTable.cashBalanceKobo, fullName: clientsTable.fullName, chn: clientsTable.chn })
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });

  if (isLive() && client.chn) {
    await syncPositionsFromCscs(clientId, client.chn).catch(() => {});
  }

  const positions = await db
    .select()
    .from(positionsTable)
    .where(eq(positionsTable.clientId, clientId));

  const totalMarketValueKobo   = positions.reduce((sum, p) => sum + p.marketValueKobo, 0);
  const totalCostKobo          = positions.reduce((sum, p) => sum + (p.avgCostKobo * p.quantity), 0);
  const totalUnrealisedPnlKobo = positions.reduce((sum, p) => sum + p.unrealisedPnlKobo, 0);
  const totalPortfolioKobo     = client.cashBalanceKobo + totalMarketValueKobo;
  const pnlPercent             = totalCostKobo > 0
    ? (totalUnrealisedPnlKobo / totalCostKobo) * 100
    : 0;

  return {
    clientName:           client.fullName,
    cashBalanceKobo:      client.cashBalanceKobo,
    cashBalanceNaira:     client.cashBalanceKobo / 100,
    totalEquityValueKobo: totalMarketValueKobo,
    totalPortfolioKobo,
    totalPortfolioNaira:  totalPortfolioKobo / 100,
    unrealisedPnlKobo:    totalUnrealisedPnlKobo,
    unrealisedPnlNaira:   totalUnrealisedPnlKobo / 100,
    pnlPercent:           Number(pnlPercent.toFixed(2)),
    holdingsCount:        positions.length,
  };
}

export async function getHoldings(clientId: string) {
  const rows = await db
    .select({
      symbol:            positionsTable.symbol,
      quantity:          positionsTable.quantity,
      reservedQuantity:  positionsTable.reservedQuantity,
      avgCostKobo:       positionsTable.avgCostKobo,
      currentPriceKobo:  positionsTable.currentPriceKobo,
      marketValueKobo:   positionsTable.marketValueKobo,
      unrealisedPnlKobo: positionsTable.unrealisedPnlKobo,
      updatedAt:         positionsTable.updatedAt,
      instrumentName:    instrumentsTable.name,
      sector:            instrumentsTable.sector,
    })
    .from(positionsTable)
    .leftJoin(instrumentsTable, eq(positionsTable.symbol, instrumentsTable.symbol))
    .where(and(
      eq(positionsTable.clientId, clientId),
      sql`${positionsTable.quantity} > 0`,
    ));

  return rows.map((r) => ({
    ...r,
    avgCostNaira:       r.avgCostKobo / 100,
    currentPriceNaira:  r.currentPriceKobo / 100,
    marketValueNaira:   r.marketValueKobo / 100,
    unrealisedPnlNaira: r.unrealisedPnlKobo / 100,
    pnlPercent:         r.avgCostKobo > 0
      ? Number((((r.currentPriceKobo - r.avgCostKobo) / r.avgCostKobo) * 100).toFixed(2))
      : 0,
    availableQty: r.quantity - r.reservedQuantity,
  }));
}

export async function getTransactionHistory(clientId: string, limit = 50, offset = 0) {
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.clientId, clientId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    ...r,
    amountNaira:       r.amountKobo / 100,
    balanceAfterNaira: r.balanceAfterKobo / 100,
  }));
}

export async function getOrderHistory(clientId: string, limit = 50, offset = 0) {
  return db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.clientId, clientId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);
}
