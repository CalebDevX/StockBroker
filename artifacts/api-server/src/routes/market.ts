import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { instrumentsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

// GET /api/market/quote/:symbol
router.get("/quote/:symbol", async (req, res) => {
  try {
    const symbol = (req.params["symbol"] ?? "").toUpperCase();
    const [instrument] = await db
      .select()
      .from(instrumentsTable)
      .where(eq(instrumentsTable.symbol, symbol))
      .limit(1);

    if (!instrument) {
      res.status(404).json({ error: `Symbol ${symbol} not found` });
      return;
    }

    res.json({
      symbol:             instrument.symbol,
      name:               instrument.name,
      lastPriceNaira:     instrument.lastPriceKobo / 100,
      openPriceNaira:     instrument.openPriceKobo / 100,
      highPriceNaira:     instrument.highPriceKobo / 100,
      lowPriceNaira:      instrument.lowPriceKobo / 100,
      prevCloseNaira:     instrument.prevClosePriceKobo / 100,
      changeNaira:        (instrument.lastPriceKobo - instrument.prevClosePriceKobo) / 100,
      changePct:          instrument.prevClosePriceKobo > 0
        ? Number((((instrument.lastPriceKobo - instrument.prevClosePriceKobo) / instrument.prevClosePriceKobo) * 100).toFixed(2))
        : 0,
      volume:             instrument.volume,
      isTradingSuspended: instrument.isTradingSuspended,
      priceUpdatedAt:     instrument.priceUpdatedAt,
      lastPriceKobo:      instrument.lastPriceKobo,
      upperLimitKobo:     instrument.upperLimitKobo,
      lowerLimitKobo:     instrument.lowerLimitKobo,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/market/movers
router.get("/movers", async (_req, res) => {
  try {
    const all = await db
      .select({
        symbol:             instrumentsTable.symbol,
        name:               instrumentsTable.name,
        lastPriceKobo:      instrumentsTable.lastPriceKobo,
        prevClosePriceKobo: instrumentsTable.prevClosePriceKobo,
        volume:             instrumentsTable.volume,
      })
      .from(instrumentsTable)
      .where(sql`${instrumentsTable.isActive} = true AND ${instrumentsTable.prevClosePriceKobo} > 0`);

    const withChange = all.map((r) => ({
      ...r,
      lastPriceNaira: r.lastPriceKobo / 100,
      changePct: Number(
        (((r.lastPriceKobo - r.prevClosePriceKobo) / r.prevClosePriceKobo) * 100).toFixed(2)
      ),
    }));

    withChange.sort((a, b) => b.changePct - a.changePct);
    const gainers = withChange.slice(0, 5);
    const losers  = [...withChange].reverse().slice(0, 5);

    res.json({ gainers, losers });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/market/search?q=dangote
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query["q"] ?? "").trim().toUpperCase();
    if (q.length < 2) { res.json({ instruments: [] }); return; }

    const results = await db
      .select({
        symbol:             instrumentsTable.symbol,
        name:               instrumentsTable.name,
        sector:             instrumentsTable.sector,
        lastPriceNaira:     sql<number>`${instrumentsTable.lastPriceKobo} / 100.0`,
        isActive:           instrumentsTable.isActive,
        isTradingSuspended: instrumentsTable.isTradingSuspended,
      })
      .from(instrumentsTable)
      .where(sql`
        (UPPER(${instrumentsTable.symbol}) LIKE ${`%${q}%`}
        OR UPPER(${instrumentsTable.name}) LIKE ${`%${q}%`})
        AND ${instrumentsTable.isActive} = true
      `)
      .limit(20);

    res.json({ instruments: results });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/market/summary — advancers / decliners / unchanged + volume
router.get("/summary", async (_req, res) => {
  try {
    const rows = await db
      .select({
        lastPriceKobo:      instrumentsTable.lastPriceKobo,
        prevClosePriceKobo: instrumentsTable.prevClosePriceKobo,
        volume:             instrumentsTable.volume,
      })
      .from(instrumentsTable)
      .where(sql`${instrumentsTable.isActive} = true`);

    let advancers = 0, decliners = 0, unchanged = 0, totalVolume = 0;
    for (const r of rows) {
      totalVolume += r.volume ?? 0;
      if (r.prevClosePriceKobo <= 0) { unchanged++; continue; }
      const diff = r.lastPriceKobo - r.prevClosePriceKobo;
      if (diff > 0) advancers++;
      else if (diff < 0) decliners++;
      else unchanged++;
    }

    res.json({
      total:       rows.length,
      advancers,
      decliners,
      unchanged,
      totalVolume,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/market/instruments
router.get("/instruments", async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query["limit"]  ?? 100), 500);
    const offset = Number(req.query["offset"] ?? 0);

    const instruments = await db
      .select({
        symbol:             instrumentsTable.symbol,
        name:               instrumentsTable.name,
        isin:               instrumentsTable.isin,
        sector:             instrumentsTable.sector,
        type:               instrumentsTable.type,
        lastPriceNaira:     sql<number>`${instrumentsTable.lastPriceKobo} / 100.0`,
        volume:             instrumentsTable.volume,
        isActive:           instrumentsTable.isActive,
        isTradingSuspended: instrumentsTable.isTradingSuspended,
      })
      .from(instrumentsTable)
      .where(sql`${instrumentsTable.isActive} = true`)
      .orderBy(instrumentsTable.symbol)
      .limit(limit)
      .offset(offset);

    res.json({ instruments, count: instruments.length, offset });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
