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

// GET /api/market/orderbook/:symbol
// Generates a realistic simulated order book (L2 depth) around the last price.
// In demo mode NGX does not provide live L2 data, so we synthesise it deterministically
// per symbol+time-window so it evolves smoothly rather than flickering on every request.
router.get("/orderbook/:symbol", async (req, res) => {
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

    const midKobo = instrument.lastPriceKobo;
    if (midKobo <= 0) {
      res.json({ symbol, bids: [], asks: [], spreadKobo: 0, spreadPct: 0 });
      return;
    }

    // Determine tick size in kobo based on price level
    let tickKobo: number;
    if (midKobo < 100)        tickKobo = 1;
    else if (midKobo < 1_000) tickKobo = 10;
    else if (midKobo < 10_000) tickKobo = 50;
    else                      tickKobo = 100;

    // Seed a pseudo-random sequence from symbol + current 5-second window so
    // the book evolves naturally rather than regenerating every request.
    const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      + Math.floor(Date.now() / 5_000);

    function lcg(s: number): () => number {
      let state = s;
      return () => {
        state = (1_664_525 * state + 1_013_904_223) & 0x7fff_ffff;
        return state / 0x7fff_ffff;
      };
    }
    const rng = lcg(seed);

    const LEVELS = 8;

    const asks: { priceKobo: number; priceNaira: number; quantity: number; total: number }[] = [];
    const bids: { priceKobo: number; priceNaira: number; quantity: number; total: number }[] = [];

    // Best ask is 1 tick above mid; best bid is 1 tick below
    let askPrice = midKobo + tickKobo;
    let bidPrice = midKobo - tickKobo;

    // Clamp to exchange limits if they exist
    const upper = instrument.upperLimitKobo ?? midKobo * 1.1;
    const lower = Math.max(instrument.lowerLimitKobo ?? Math.round(midKobo * 0.9), tickKobo);

    // Base lot is roughly 1/1000th of total daily volume, clamped to 1k–100k
    const baseLot = Math.min(Math.max(Math.round((instrument.volume ?? 100_000) / 1_000), 1_000), 100_000);

    for (let i = 0; i < LEVELS; i++) {
      if (askPrice <= upper) {
        const qty = Math.round(baseLot * (0.4 + rng() * 1.8));
        asks.push({ priceKobo: askPrice, priceNaira: askPrice / 100, quantity: qty, total: 0 });
      }
      if (bidPrice >= lower) {
        const qty = Math.round(baseLot * (0.4 + rng() * 1.8));
        bids.push({ priceKobo: bidPrice, priceNaira: bidPrice / 100, quantity: qty, total: 0 });
      }
      askPrice += tickKobo;
      bidPrice -= tickKobo;
    }

    // Compute cumulative totals
    let cumAsk = 0;
    for (const level of asks) { cumAsk += level.quantity; level.total = cumAsk; }
    let cumBid = 0;
    for (const level of bids) { cumBid += level.quantity; level.total = cumBid; }

    const spreadKobo = asks.length && bids.length ? asks[0].priceKobo - bids[0].priceKobo : 0;
    const spreadPct  = midKobo > 0 ? Number(((spreadKobo / midKobo) * 100).toFixed(3)) : 0;

    res.json({ symbol, bids, asks, spreadKobo, spreadNaira: spreadKobo / 100, spreadPct, midKobo, midNaira: midKobo / 100 });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
