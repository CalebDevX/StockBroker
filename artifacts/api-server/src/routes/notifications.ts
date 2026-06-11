import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getClientNotifPrefs, setClientNotifPrefs } from "../services/whatsapp-alerts.js";

const router = Router();

router.use(requireAuth);

// GET /api/notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.clientId, req.auth.sub))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.clientId, req.auth.sub));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, req.params.id),
          eq(notificationsTable.clientId, req.auth.sub),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/notifications/prefs
router.get("/prefs", async (req, res) => {
  try {
    const prefs = await getClientNotifPrefs(req.auth.sub);
    res.json({ prefs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const prefsSchema = z.object({
  prefs: z.record(z.boolean()),
});

// PATCH /api/notifications/prefs
router.patch("/prefs", validateBody(prefsSchema), async (req, res) => {
  try {
    const { prefs } = req.body as { prefs: Record<string, boolean> };
    const updated = await setClientNotifPrefs(req.auth.sub, prefs);
    res.json({ prefs: updated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
