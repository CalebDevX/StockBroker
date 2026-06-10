import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody, validateQuery } from "../middlewares/validate.js";
import { placeOrder, cancelOrder, calculateFees } from "../services/order-engine.js";
import { getOrderHistory } from "../services/portfolio-service.js";
import { getWsServer } from "../websocket.js";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

const placeOrderSchema = z.object({
  symbol:          z.string().min(2).max(12).toUpperCase(),
  side:            z.enum(["buy", "sell"]),
  orderType:       z.enum(["market", "limit"]),
  quantity:        z.number().int().positive().max(500_000),
  limitPriceNaira: z.number().positive().optional(),
  validity:        z.enum(["day", "gtc", "ioc", "fok"]).optional(),
});

const listOrdersSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["pending","submitted","partial","filled","cancelled","rejected","expired"]).optional(),
});

const quoteSchema = z.object({
  symbol:          z.string().min(2).max(12).toUpperCase(),
  side:            z.enum(["buy", "sell"]),
  orderType:       z.enum(["market", "limit"]),
  quantity:        z.coerce.number().int().positive(),
  limitPriceNaira: z.coerce.number().positive().optional(),
});

// GET /api/orders/quote — fee preview before placing
router.get("/quote", validateQuery(quoteSchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof quoteSchema> }).validQuery;
    const priceKobo = q.orderType === "limit"
      ? Math.round((q.limitPriceNaira ?? 0) * 100)
      : 25000;

    const fees = calculateFees(q.side, q.quantity, priceKobo);
    res.json({
      ...fees,
      grossConsiderationNaira: fees.grossConsiderationKobo / 100,
      brokerageFeeNaira:       fees.brokerageFeeKobo / 100,
      vatNaira:                fees.vatKobo / 100,
      totalCostNaira:          fees.totalCostKobo / 100,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/orders
router.get("/", validateQuery(listOrdersSchema), async (req, res) => {
  try {
    const q = (req as typeof req & { validQuery: z.infer<typeof listOrdersSchema> }).validQuery;
    const orders = await getOrderHistory(req.auth.sub, q.limit, q.offset);
    res.json({ orders, count: orders.length, offset: q.offset });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/orders
router.post("/", validateBody(placeOrderSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof placeOrderSchema>;
    const order = await placeOrder({
      clientId:        req.auth.sub,
      symbol:          body.symbol,
      side:            body.side,
      orderType:       body.orderType,
      quantity:        body.quantity,
      limitPriceNaira: body.limitPriceNaira,
      validity:        body.validity,
      ipAddress:       req.ip,
    });
    try { getWsServer().registerOrder(order.clOrdId, req.auth.sub); } catch { /* WS not yet init */ }
    res.status(202).json({ order });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, req.params["id"]!),
        eq(ordersTable.clientId, req.auth.sub),
      ))
      .limit(1);

    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ order });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await cancelOrder(req.auth.sub, req.params["id"]!);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
