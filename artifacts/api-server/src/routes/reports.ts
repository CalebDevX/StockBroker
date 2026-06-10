import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { transactionsTable, ordersTable } from "@workspace/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { validateQuery } from "../middlewares/validate.js";

const router = Router();

router.use(requireAuth);

const querySchema = z.object({
  from:   z.string().optional(),
  to:     z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
  limit:  z.coerce.number().int().min(1).max(500).default(200),
});

// GET /api/reports/transactions
router.get("/transactions", validateQuery(querySchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof querySchema> }).validQuery;

    const conditions = [eq(transactionsTable.clientId, req.auth.sub)];
    if (q.from) conditions.push(gte(transactionsTable.createdAt, new Date(q.from)));
    if (q.to)   conditions.push(lte(transactionsTable.createdAt, new Date(q.to)));

    const txs = await db
      .select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(q.limit);

    if (q.format === "csv") {
      const header = "Date,Type,Description,Amount (₦),Balance After (₦),Reference";
      const rows = txs.map((tx) =>
        [
          tx.createdAt.toISOString().replace("T", " ").slice(0, 19),
          tx.type,
          `"${(tx.description ?? tx.reference).replace(/"/g, '""')}"`,
          (tx.amountKobo / 100).toFixed(2),
          (tx.balanceAfterKobo / 100).toFixed(2),
          tx.reference,
        ].join(","),
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
      return res.send([header, ...rows].join("\n"));
    }

    res.json({ transactions: txs, count: txs.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reports/orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.clientId, req.auth.sub))
      .orderBy(desc(ordersTable.createdAt))
      .limit(200);

    const q = req.query as { format?: string };
    if (q.format === "csv") {
      const header = "Date,Symbol,Side,Type,Qty,Filled,Price (₦),Status,Reference";
      const rows = orders.map((o) =>
        [
          o.createdAt.toISOString().replace("T", " ").slice(0, 19),
          o.symbol,
          o.side,
          o.orderType,
          o.quantity,
          o.filledQuantity,
          o.avgFillPriceKobo ? (o.avgFillPriceKobo / 100).toFixed(2) : "",
          o.status,
          o.clOrdId,
        ].join(","),
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
      return res.send([header, ...rows].join("\n"));
    }

    res.json({ orders, count: orders.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
