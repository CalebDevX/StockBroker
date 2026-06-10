import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  getPortfolioSummary,
  getHoldings,
  getTransactionHistory,
} from "../services/portfolio-service.js";
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

export default router;
