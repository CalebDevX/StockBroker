import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getPortfolioSummary,
  getHoldings,
  getTransactionHistory,
} from "../services/portfolio-service.js";
import { db } from "@workspace/db";
import {
  transactionsTable, positionsTable, instrumentsTable, clientsTable,
} from "@workspace/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { validateQuery } from "../middlewares/validate.js";

const router = Router();

router.use(requireAuth);

const paginationSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/portfolio
router.get("/", async (req, res) => {
  try {
    const summary = await getPortfolioSummary(req.auth.sub);
    res.json(summary);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// GET /api/portfolio/holdings
router.get("/holdings", async (req, res) => {
  try {
    const holdings = await getHoldings(req.auth.sub);
    res.json({ holdings });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/portfolio/transactions
router.get("/transactions", validateQuery(paginationSchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof paginationSchema> }).validQuery;
    const txs = await getTransactionHistory(req.auth.sub, q.limit, q.offset);
    res.json({ transactions: txs, count: txs.length, offset: q.offset });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/portfolio/chart
// Returns cash balance history from transaction records as chart data points.
router.get("/chart", async (req, res) => {
  try {
    const clientId = req.auth.sub;

    const txs = await db
      .select({
        createdAt:        transactionsTable.createdAt,
        balanceAfterKobo: transactionsTable.balanceAfterKobo,
        type:             transactionsTable.type,
      })
      .from(transactionsTable)
      .where(eq(transactionsTable.clientId, clientId))
      .orderBy(asc(transactionsTable.createdAt))
      .limit(90);

    // Current equity value (used to show current portfolio value as last point)
    const positions = await db
      .select({ marketValueKobo: positionsTable.marketValueKobo })
      .from(positionsTable)
      .where(and(eq(positionsTable.clientId, clientId), sql`${positionsTable.quantity} > 0`));
    const equityKobo = positions.reduce((s, p) => s + p.marketValueKobo, 0);

    const [client] = await db
      .select({ cashBalanceKobo: clientsTable.cashBalanceKobo })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    // Build chart: each transaction becomes a data point (cash at that moment)
    // We add current equity to every point to approximate total portfolio value.
    // Note: historical equity is approximated using today's market prices.
    const seen = new Set<string>();
    const points: { date: string; valueKobo: number }[] = [];
    for (const tx of txs) {
      const date = tx.createdAt.toISOString().split("T")[0];
      if (!seen.has(date)) {
        seen.add(date);
        points.push({ date, valueKobo: tx.balanceAfterKobo + equityKobo });
      } else {
        // Update the same-day point to the latest balance of that day
        const last = points[points.length - 1];
        if (last && last.date === date) {
          last.valueKobo = tx.balanceAfterKobo + equityKobo;
        }
      }
    }

    // Add today as final data point if not already present
    const today = new Date().toISOString().split("T")[0];
    if (!seen.has(today) || points[points.length - 1]?.date !== today) {
      points.push({ date: today, valueKobo: (client?.cashBalanceKobo ?? 0) + equityKobo });
    }

    res.json({ points, hasData: txs.length > 0 });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/portfolio/sector-allocation
router.get("/sector-allocation", async (req, res) => {
  try {
    const clientId = req.auth.sub;

    const rows = await db
      .select({
        symbol:          positionsTable.symbol,
        marketValueKobo: positionsTable.marketValueKobo,
        sector:          instrumentsTable.sector,
      })
      .from(positionsTable)
      .leftJoin(instrumentsTable, eq(positionsTable.symbol, instrumentsTable.symbol))
      .where(and(
        eq(positionsTable.clientId, clientId),
        sql`${positionsTable.quantity} > 0`,
      ));

    const sectorMap = new Map<string, number>();
    for (const row of rows) {
      const sector = row.sector ?? "Other";
      sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + row.marketValueKobo);
    }

    const total = Array.from(sectorMap.values()).reduce((a, b) => a + b, 0);
    const sectors = Array.from(sectorMap.entries())
      .map(([name, valueKobo]) => ({
        name,
        valueKobo,
        percentage: total > 0 ? Number(((valueKobo / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.valueKobo - a.valueKobo);

    res.json({ sectors, totalEquityKobo: total, hasPositions: rows.length > 0 });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
