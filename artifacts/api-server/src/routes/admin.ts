import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validateBody, validateQuery } from "../middlewares/validate.js";
import { db } from "@workspace/db";
import { getMode, setMode, type TradingMode } from "../services/trading-mode.js";
import { startFixSession, getFixSession } from "../services/fix-session.js";
import { sendKycStatusNotification } from "../services/notification.js";
import { createNotification } from "../services/notifications-service.js";
import { logger } from "../lib/logger.js";
import {
  ordersTable, clientsTable, instrumentsTable,
  auditLogTable, positionsTable, transactionsTable, settingsTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(requireAuth, requireRole("admin", "broker", "compliance"));

// ── Shared query schemas ─────────────────────────────────────────────────────

const pageSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const ordersQuerySchema = pageSchema.extend({
  status: z.enum(["pending","submitted","partial","filled","cancelled","rejected","expired"]).optional(),
});

const clientsQuerySchema = pageSchema.extend({
  kycStatus: z.enum(["pending","under_review","verified","rejected"]).optional(),
  suspended: z.coerce.boolean().optional(),
  search:    z.string().optional(),
});

const auditQuerySchema = pageSchema.extend({
  action: z.string().optional(),
});

const updateOrderSchema = z.object({
  status:       z.enum(["submitted","partial","filled","cancelled","rejected"]),
  rejectReason: z.string().optional(),
  ngxOrderId:   z.string().optional(),
});

const seedInstrumentSchema = z.object({
  symbol:              z.string().min(2).max(12),
  name:                z.string().min(2).max(200),
  isin:                z.string().optional(),
  sector:              z.string().optional(),
  lastPriceNaira:      z.number().positive(),
  prevClosePriceNaira: z.number().positive().optional(),
  isActive:            z.boolean().default(true),
});

// ── Orders ───────────────────────────────────────────────────────────────────

router.get("/orders", validateQuery(ordersQuerySchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof ordersQuerySchema> }).validQuery;
    const where = q.status ? sql`${ordersTable.status} = ${q.status}` : sql`1=1`;

    const orders = await db
      .select({
        orderId:        ordersTable.id,
        clOrdId:        ordersTable.clOrdId,
        ngxOrderId:     ordersTable.ngxOrderId,
        clientId:       ordersTable.clientId,
        clientName:     clientsTable.fullName,
        clientEmail:    clientsTable.email,
        symbol:         ordersTable.symbol,
        side:           ordersTable.side,
        orderType:      ordersTable.orderType,
        quantity:       ordersTable.quantity,
        filledQty:      ordersTable.filledQuantity,
        limitPriceKobo: ordersTable.limitPriceKobo,
        totalCostKobo:  ordersTable.totalCostKobo,
        status:         ordersTable.status,
        rejectReason:   ordersTable.rejectReason,
        createdAt:      ordersTable.createdAt,
        submittedAt:    ordersTable.submittedAt,
        filledAt:       ordersTable.filledAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(where)
      .orderBy(desc(ordersTable.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    res.json({ orders, count: orders.length, offset: q.offset });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/orders/:id", validateBody(updateOrderSchema), async (req, res) => {
  try {
    const body    = req.body as z.infer<typeof updateOrderSchema>;
    const orderId = String(req.params["id"] ?? "");

    await db.update(ordersTable).set({
      status:       body.status,
      ngxOrderId:   body.ngxOrderId,
      rejectReason: body.rejectReason,
      filledAt:     body.status === "filled" ? new Date() : undefined,
      updatedAt:    new Date(),
    }).where(eq(ordersTable.id, orderId));

    await db.insert(auditLogTable).values({
      id: uuidv4(), actorId: req.auth.sub,
      action: "admin.order.status_override", entityType: "order", entityId: orderId,
      details: body as Record<string, unknown>, ipAddress: req.ip,
    });

    res.json({ id: orderId, status: body.status });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Clients ──────────────────────────────────────────────────────────────────

router.get("/clients", validateQuery(clientsQuerySchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof clientsQuerySchema> }).validQuery;

    const conditions: ReturnType<typeof sql>[] = [];
    if (q.kycStatus)           conditions.push(sql`${clientsTable.kycStatus} = ${q.kycStatus}`);
    if (q.suspended !== undefined) conditions.push(sql`${clientsTable.isSuspended} = ${q.suspended}`);
    if (q.search)              conditions.push(
      sql`(${clientsTable.fullName} ILIKE ${'%' + q.search + '%'} OR ${clientsTable.email} ILIKE ${'%' + q.search + '%'})`
    );

    const where = conditions.length > 0
      ? and(...(conditions as Parameters<typeof and>))
      : sql`1=1`;

    const clients = await db
      .select({
        id:              clientsTable.id,
        email:           clientsTable.email,
        fullName:        clientsTable.fullName,
        phone:           clientsTable.phone,
        role:            clientsTable.role,
        bvn:             clientsTable.bvn,
        nin:             clientsTable.nin,
        kycTier:         clientsTable.kycTier,
        kycStatus:       clientsTable.kycStatus,
        cashBalanceKobo: clientsTable.cashBalanceKobo,
        isActive:        clientsTable.isActive,
        isSuspended:     clientsTable.isSuspended,
        createdAt:       clientsTable.createdAt,
        lastLoginAt:     clientsTable.lastLoginAt,
      })
      .from(clientsTable)
      .where(where)
      .orderBy(desc(clientsTable.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    res.json({ clients: clients.map(c => ({ ...c, cashBalanceNaira: c.cashBalanceKobo / 100 })), count: clients.length });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const clientId = String(req.params["id"] ?? "");

    const [client] = await db
      .select({
        id: clientsTable.id, email: clientsTable.email, fullName: clientsTable.fullName,
        phone: clientsTable.phone, role: clientsTable.role,
        bvn: clientsTable.bvn, nin: clientsTable.nin, chn: clientsTable.chn,
        kycTier: clientsTable.kycTier, kycStatus: clientsTable.kycStatus,
        cashBalanceKobo: clientsTable.cashBalanceKobo,
        isActive: clientsTable.isActive, isSuspended: clientsTable.isSuspended,
        brokerCode: clientsTable.brokerCode,
        createdAt: clientsTable.createdAt, updatedAt: clientsTable.updatedAt, lastLoginAt: clientsTable.lastLoginAt,
      })
      .from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);

    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const [orderStats] = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'filled')::int AS filled,
        COUNT(*) FILTER (WHERE status IN ('pending','submitted','partial'))::int AS active,
        COALESCE(SUM(total_cost_kobo) FILTER (WHERE status = 'filled'), 0)::bigint AS total_volume_kobo
      FROM orders WHERE client_id = ${clientId}
    `)).rows;

    const recentOrders = await db.select({
      orderId: ordersTable.id, symbol: ordersTable.symbol,
      side: ordersTable.side, orderType: ordersTable.orderType,
      quantity: ordersTable.quantity, filledQty: ordersTable.filledQuantity,
      status: ordersTable.status, totalCostKobo: ordersTable.totalCostKobo,
      createdAt: ordersTable.createdAt,
    }).from(ordersTable).where(eq(ordersTable.clientId, clientId))
      .orderBy(desc(ordersTable.createdAt)).limit(10);

    const positions = await db.select().from(positionsTable)
      .where(eq(positionsTable.clientId, clientId));

    const recentTransactions = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.clientId, clientId))
      .orderBy(desc(transactionsTable.createdAt)).limit(10);

    const kycLogs = await db.select().from(auditLogTable)
      .where(sql`${auditLogTable.clientId} = ${clientId} AND ${auditLogTable.action} LIKE 'kyc.%'`)
      .orderBy(desc(auditLogTable.createdAt)).limit(5);

    res.json({
      client: { ...client, cashBalanceNaira: client.cashBalanceKobo / 100 },
      orderStats: orderStats ?? {},
      recentOrders,
      positions,
      recentTransactions,
      kycLogs,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/clients/:id/kyc",
  requireRole("admin", "compliance"),
  validateBody(z.object({
    kycStatus: z.enum(["verified", "rejected", "under_review"]),
    kycTier:   z.enum(["tier1", "tier2", "tier3"]).optional(),
    notes:     z.string().optional(),
  })),
  async (req, res) => {
    try {
      const clientId = String(req.params["id"] ?? "");
      const body = req.body as { kycStatus: "verified" | "rejected" | "under_review"; kycTier?: "tier1" | "tier2" | "tier3"; notes?: string };

      await db.update(clientsTable).set({
        kycStatus: body.kycStatus,
        kycTier:   body.kycTier ?? (body.kycStatus === "verified" ? "tier2" : undefined),
        updatedAt: new Date(),
      }).where(eq(clientsTable.id, clientId));

      await db.insert(auditLogTable).values({
        id: uuidv4(), actorId: req.auth.sub, clientId,
        action: "admin.kyc.update", entityType: "client", entityId: clientId,
        details: body as Record<string, unknown>, ipAddress: req.ip,
      });

      res.json({ id: clientId, kycStatus: body.kycStatus });

      const client = await db
        .select({ email: clientsTable.email, fullName: clientsTable.fullName, phone: clientsTable.phone })
        .from(clientsTable)
        .where(eq(clientsTable.id, clientId))
        .limit(1);

      if (client[0]) {
        if (body.kycStatus !== 'under_review') {
          sendKycStatusNotification(client[0].email, client[0].phone, client[0].fullName, body.kycStatus)
            .catch((err) => logger.error({ err, clientId, status: body.kycStatus }, "KYC notification delivery failed"));
        }
        const kycTitle = body.kycStatus === 'verified'
          ? 'KYC approved — account verified'
          : body.kycStatus === 'rejected'
            ? 'KYC rejected — action required'
            : 'KYC under review';
        const kycMsg = body.kycStatus === 'verified'
          ? 'Your identity verification is complete. Your account is fully activated for trading.'
          : body.kycStatus === 'rejected'
            ? 'Your KYC submission was not approved. Please re-submit with valid documents or contact support.'
            : 'Your documents have been received and are under review by our compliance team.';
        createNotification({ clientId, type: 'kyc_update', title: kycTitle, message: kycMsg })
          .catch((err) => logger.error({ err, clientId }, "KYC in-app notification failed"));
      }
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

router.patch("/clients/:id/suspend",
  requireRole("admin"),
  validateBody(z.object({ isSuspended: z.boolean(), reason: z.string().optional() })),
  async (req, res) => {
    try {
      const clientId = String(req.params["id"] ?? "");
      const body = req.body as { isSuspended: boolean; reason?: string };

      await db.update(clientsTable).set({ isSuspended: body.isSuspended, updatedAt: new Date() })
        .where(eq(clientsTable.id, clientId));

      await db.insert(auditLogTable).values({
        id: uuidv4(), actorId: req.auth.sub, clientId,
        action: body.isSuspended ? "admin.client.suspend" : "admin.client.unsuspend",
        entityType: "client", entityId: clientId,
        details: body as Record<string, unknown>, ipAddress: req.ip,
      });

      res.json({ id: clientId, isSuspended: body.isSuspended });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

router.patch("/clients/:id/role",
  requireRole("admin"),
  validateBody(z.object({ role: z.enum(["client","broker","admin","compliance"]) })),
  async (req, res) => {
    try {
      const clientId = String(req.params["id"] ?? "");
      const { role } = req.body as { role: "client" | "broker" | "admin" | "compliance" };

      await db.update(clientsTable).set({ role, updatedAt: new Date() })
        .where(eq(clientsTable.id, clientId));

      await db.insert(auditLogTable).values({
        id: uuidv4(), actorId: req.auth.sub, clientId,
        action: "admin.client.role_change", entityType: "client", entityId: clientId,
        details: { role } as Record<string, unknown>, ipAddress: req.ip,
      });

      res.json({ id: clientId, role });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

// ── KYC Queue ────────────────────────────────────────────────────────────────

router.get("/kyc-queue", async (_req, res) => {
  try {
    const queue = await db
      .select({
        id: clientsTable.id, email: clientsTable.email,
        fullName: clientsTable.fullName, phone: clientsTable.phone,
        bvn: clientsTable.bvn, nin: clientsTable.nin,
        kycStatus: clientsTable.kycStatus, kycTier: clientsTable.kycTier,
        createdAt: clientsTable.createdAt, updatedAt: clientsTable.updatedAt,
      })
      .from(clientsTable)
      .where(and(
        isNotNull(clientsTable.bvn),
        sql`${clientsTable.kycStatus} IN ('pending','under_review')`
      ))
      .orderBy(clientsTable.updatedAt);

    res.json({ queue, count: queue.length });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Metrics ──────────────────────────────────────────────────────────────────

router.get("/metrics", async (_req, res) => {
  try {
    const orderResult = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                AS total_orders,
        COUNT(*) FILTER (WHERE status = 'filled')::int              AS filled_orders,
        COUNT(*) FILTER (WHERE status IN ('pending','submitted'))::int AS active_orders,
        COUNT(*) FILTER (WHERE status = 'rejected')::int            AS rejected_orders,
        COALESCE(SUM(total_cost_kobo) FILTER (WHERE status = 'filled'), 0)::bigint AS total_volume_kobo
      FROM orders WHERE created_at > NOW() - INTERVAL '1 day'
    `);

    const clientResult = await db.execute(sql`
      SELECT
        COUNT(*)::int                                              AS total_clients,
        COUNT(*) FILTER (WHERE kyc_status = 'verified')::int      AS verified_clients,
        COUNT(*) FILTER (WHERE kyc_status = 'pending')::int       AS pending_kyc,
        COUNT(*) FILTER (WHERE kyc_status = 'under_review')::int  AS under_review_kyc,
        COUNT(*) FILTER (WHERE is_suspended = true)::int          AS suspended_clients,
        COALESCE(SUM(cash_balance_kobo), 0)::bigint               AS total_cash_kobo
      FROM clients WHERE role = 'client'
    `);

    const portfolioResult = await db.execute(sql`
      SELECT COALESCE(SUM(market_value_kobo), 0)::bigint AS total_portfolio_kobo
      FROM positions
    `);

    res.json({
      orders:    orderResult.rows[0]    ?? {},
      clients:   clientResult.rows[0]   ?? {},
      portfolio: portfolioResult.rows[0] ?? {},
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Instruments ──────────────────────────────────────────────────────────────

router.get("/instruments", async (_req, res) => {
  try {
    const instruments = await db.select().from(instrumentsTable)
      .orderBy(instrumentsTable.symbol);
    res.json({ instruments });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/instruments", requireRole("admin"), validateBody(seedInstrumentSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof seedInstrumentSchema>;
    const lastPriceKobo      = Math.round(body.lastPriceNaira * 100);
    const prevClosePriceKobo = body.prevClosePriceNaira ? Math.round(body.prevClosePriceNaira * 100) : lastPriceKobo;

    const [instrument] = await db
      .insert(instrumentsTable)
      .values({
        id: uuidv4(), symbol: body.symbol.toUpperCase(), name: body.name,
        isin: body.isin, sector: body.sector,
        lastPriceKobo, prevClosePriceKobo,
        openPriceKobo: lastPriceKobo, highPriceKobo: lastPriceKobo, lowPriceKobo: lastPriceKobo,
        upperLimitKobo: Math.round(lastPriceKobo * 1.1), lowerLimitKobo: Math.round(lastPriceKobo * 0.9),
        isActive: body.isActive, priceUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: instrumentsTable.symbol,
        set: {
          name: body.name, lastPriceKobo, prevClosePriceKobo,
          upperLimitKobo: Math.round(lastPriceKobo * 1.1), lowerLimitKobo: Math.round(lastPriceKobo * 0.9),
          priceUpdatedAt: new Date(), updatedAt: new Date(),
        },
      })
      .returning();

    res.status(201).json({ instrument });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/instruments/:symbol",
  requireRole("admin"),
  validateBody(z.object({
    isActive:           z.boolean().optional(),
    isTradingSuspended: z.boolean().optional(),
    lastPriceNaira:     z.number().positive().optional(),
    name:               z.string().optional(),
    sector:             z.string().optional(),
  })),
  async (req, res) => {
    try {
      const symbol = String(req.params["symbol"] ?? "").toUpperCase();
      const body   = req.body as Record<string, unknown>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (body["isActive"]           !== undefined) updateData["isActive"]           = body["isActive"];
      if (body["isTradingSuspended"] !== undefined) updateData["isTradingSuspended"] = body["isTradingSuspended"];
      if (body["name"]               !== undefined) updateData["name"]               = body["name"];
      if (body["sector"]             !== undefined) updateData["sector"]             = body["sector"];
      if (body["lastPriceNaira"]     !== undefined) {
        const kobo = Math.round((body["lastPriceNaira"] as number) * 100);
        updateData["lastPriceKobo"]  = kobo;
        updateData["upperLimitKobo"] = Math.round(kobo * 1.1);
        updateData["lowerLimitKobo"] = Math.round(kobo * 0.9);
        updateData["priceUpdatedAt"] = new Date();
      }

      await db.update(instrumentsTable).set(updateData).where(eq(instrumentsTable.symbol, symbol));

      const [instrument] = await db.select().from(instrumentsTable)
        .where(eq(instrumentsTable.symbol, symbol)).limit(1);

      res.json({ instrument: instrument ?? null });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

// ── Transactions ─────────────────────────────────────────────────────────────

router.get("/transactions", validateQuery(pageSchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof pageSchema> }).validQuery;

    const transactions = await db
      .select({
        id:               transactionsTable.id,
        clientId:         transactionsTable.clientId,
        clientName:       clientsTable.fullName,
        clientEmail:      clientsTable.email,
        orderId:          transactionsTable.orderId,
        type:             transactionsTable.type,
        amountKobo:       transactionsTable.amountKobo,
        balanceAfterKobo: transactionsTable.balanceAfterKobo,
        reference:        transactionsTable.reference,
        description:      transactionsTable.description,
        bankName:         transactionsTable.bankName,
        createdAt:        transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(clientsTable, eq(transactionsTable.clientId, clientsTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    res.json({ transactions, count: transactions.length });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Audit Log ────────────────────────────────────────────────────────────────

router.get("/settings", async (_req, res) => {
  try {
    const settings = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable);

    res.json({ settings: Object.fromEntries(settings.map((item) => [item.key, item.value])) });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/settings", validateBody(z.object({ settings: z.record(z.any()) })), async (req, res) => {
  try {
    const body = req.body as { settings: Record<string, unknown> };
    const updates = Object.entries(body.settings);

    for (const [key, value] of updates) {
      await db.insert(settingsTable).values({
        id: uuidv4(), key, value, createdAt: new Date(), updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: settingsTable.key,
        set: { value, updatedAt: new Date() },
      });
    }

    const settings = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable);

    res.json({ settings: Object.fromEntries(settings.map((item) => [item.key, item.value])) });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Audit Log ────────────────────────────────────────────────────────────────

router.get("/audit-log", validateQuery(auditQuerySchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof auditQuerySchema> }).validQuery;
    const where = q.action
      ? sql`${auditLogTable.action} LIKE ${'%' + q.action + '%'}`
      : sql`1=1`;

    const logs = await db
      .select({
        id: auditLogTable.id, clientId: auditLogTable.clientId, actorId: auditLogTable.actorId,
        actorName: clientsTable.fullName,
        action: auditLogTable.action, entityType: auditLogTable.entityType, entityId: auditLogTable.entityId,
        details: auditLogTable.details, ipAddress: auditLogTable.ipAddress, createdAt: auditLogTable.createdAt,
      })
      .from(auditLogTable)
      .leftJoin(clientsTable, eq(auditLogTable.actorId, clientsTable.id))
      .where(where)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    res.json({ logs, count: logs.length });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Trading Mode ─────────────────────────────────────────────────────────────

router.post("/mode", requireRole("admin"), validateBody(z.object({ mode: z.enum(["demo","live"]) })), (req, res) => {
  const { mode } = req.body as { mode: TradingMode };
  const prev = getMode();
  setMode(mode);
  if (mode === "live" && prev !== "live") startFixSession();
  const sess = mode === "live" ? getFixSession() : null;
  res.json({ mode, prev, fixConnected: sess?.isConnected ?? false, fixLoggedOn: sess?.isLoggedOn ?? false });
});

router.get("/mode", (_req, res) => {
  const mode = getMode();
  const sess = mode === "live" ? getFixSession() : null;
  res.json({ mode, fixConnected: sess?.isConnected ?? false, fixLoggedOn: sess?.isLoggedOn ?? false });
});

export default router;
