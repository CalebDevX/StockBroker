import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { db } from "@workspace/db";
import { clientsTable, transactionsTable, auditLogTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { alertDeposit, alertWithdrawal } from "../services/whatsapp-alerts.js";

const router = Router();

router.use(requireAuth);

const depositSchema = z.object({
  amountNaira:   z.number().positive().max(500_000_000),
  bankReference: z.string().min(5).max(80),
  bankName:      z.string().min(2).max(80),
});

const withdrawSchema = z.object({
  amountNaira: z.number().positive().max(5_000_000),
  bankName:    z.string().min(2).max(80),
});

// POST /api/funds/deposit
router.post("/deposit", validateBody(depositSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof depositSchema>;
    const amountKobo = Math.round(body.amountNaira * 100);

    const [client] = await db
      .select({ cashBalanceKobo: clientsTable.cashBalanceKobo })
      .from(clientsTable)
      .where(eq(clientsTable.id, req.auth.sub))
      .limit(1);

    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const balanceAfterKobo = client.cashBalanceKobo + amountKobo;
    const reference = `DEP-${uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    await db.update(clientsTable)
      .set({ cashBalanceKobo: balanceAfterKobo })
      .where(eq(clientsTable.id, req.auth.sub));

    await db.insert(transactionsTable).values({
      id:              uuidv4(),
      clientId:        req.auth.sub,
      type:            "deposit",
      amountKobo,
      balanceAfterKobo,
      reference,
      description:     `Bank deposit via ${body.bankName}`,
      bankReference:   body.bankReference,
      bankName:        body.bankName,
    });

    await db.insert(auditLogTable).values({
      id:        uuidv4(),
      clientId:  req.auth.sub,
      actorId:   req.auth.sub,
      action:    "funds.deposit",
      details:   { amountKobo, balanceAfterKobo, reference },
      ipAddress: req.ip,
    });

    // WhatsApp alert (fire-and-forget)
    void alertDeposit({
      clientId:         req.auth.sub,
      amountKobo,
      balanceAfterKobo,
      bankName:         body.bankName,
      reference,
    });

    res.status(201).json({
      reference,
      amountNaira:     amountKobo / 100,
      newBalanceNaira: balanceAfterKobo / 100,
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// POST /api/funds/withdraw
router.post("/withdraw", validateBody(withdrawSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof withdrawSchema>;
    const amountKobo = Math.round(body.amountNaira * 100);

    const [client] = await db
      .select({ cashBalanceKobo: clientsTable.cashBalanceKobo, dailyWithdrawLimitKobo: clientsTable.dailyWithdrawLimitKobo })
      .from(clientsTable)
      .where(eq(clientsTable.id, req.auth.sub))
      .limit(1);

    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    if (amountKobo > client.cashBalanceKobo) {
      res.status(422).json({ error: `Insufficient balance. Available: ₦${(client.cashBalanceKobo / 100).toFixed(2)}` });
      return;
    }

    if (amountKobo > client.dailyWithdrawLimitKobo) {
      res.status(422).json({
        error: `Amount exceeds daily withdrawal limit of ₦${(client.dailyWithdrawLimitKobo / 100).toLocaleString()}`,
      });
      return;
    }

    const balanceAfterKobo = client.cashBalanceKobo - amountKobo;
    const reference = `WTH-${uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    await db.update(clientsTable)
      .set({ cashBalanceKobo: balanceAfterKobo })
      .where(eq(clientsTable.id, req.auth.sub));

    await db.insert(transactionsTable).values({
      id:              uuidv4(),
      clientId:        req.auth.sub,
      type:            "withdrawal",
      amountKobo:      -amountKobo,
      balanceAfterKobo,
      reference,
      description:     `Withdrawal to ${body.bankName} — pending processing`,
      bankName:        body.bankName,
    });

    await db.insert(auditLogTable).values({
      id:        uuidv4(),
      clientId:  req.auth.sub,
      actorId:   req.auth.sub,
      action:    "funds.withdrawal_request",
      details:   { amountKobo, balanceAfterKobo, reference },
      ipAddress: req.ip,
    });

    // WhatsApp alert (fire-and-forget)
    void alertWithdrawal({
      clientId:         req.auth.sub,
      amountKobo,
      balanceAfterKobo,
      bankName:         body.bankName,
      reference,
    });

    res.status(201).json({
      reference,
      amountNaira:     amountKobo / 100,
      newBalanceNaira: balanceAfterKobo / 100,
      status:          "pending_approval",
      message:         "Withdrawal request submitted. Processing within 1 business day.",
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// GET /api/funds/balance
router.get("/balance", async (req, res) => {
  try {
    const [client] = await db
      .select({ cashBalanceKobo: clientsTable.cashBalanceKobo, dailyWithdrawLimitKobo: clientsTable.dailyWithdrawLimitKobo })
      .from(clientsTable)
      .where(eq(clientsTable.id, req.auth.sub))
      .limit(1);

    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    res.json({
      cashBalanceKobo:         client.cashBalanceKobo,
      cashBalanceNaira:        client.cashBalanceKobo / 100,
      dailyWithdrawLimitNaira: client.dailyWithdrawLimitKobo / 100,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
