import { Router, type Request, type Response } from "express";
import { AchekWebhookHelper } from "achek";
import { handleIncomingMessage } from "../services/whatsapp-bot.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function getDevApiKeys(): Promise<Record<string, string>> {
  try {
    const [row] = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, "dev_api_keys"))
      .limit(1);
    return (row?.value as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

const router = Router();

interface AchekEvent {
  event: string;
  data: Record<string, unknown>;
}

// POST /api/webhooks/achek
// Receives signed webhook events from Achek (WhatsApp bot incoming messages, handoffs, etc.)
// Requires express.raw() to be mounted BEFORE express.json() in app.ts so we
// receive the raw Buffer for HMAC signature verification.
router.post("/achek", async (req: Request, res: Response) => {
  const devKeys = await getDevApiKeys();
  const webhookSecret = process.env["ACHEK_WEBHOOK_SECRET"] ?? devKeys["achek_webhook_secret"] ?? "";

  // ── Signature verification ───────────────────────────────────────────
  if (webhookSecret) {
    const sig = req.headers["x-achek-signature"] as string | undefined;
    if (!sig) {
      logger.warn("Achek webhook: missing x-achek-signature header");
      res.status(400).json({ error: "Missing signature header" });
      return;
    }
    const helper = new AchekWebhookHelper(webhookSecret);
    if (!helper.verify(sig, req.body as Buffer)) {
      logger.warn("Achek webhook: signature mismatch — rejecting");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  } else {
    // In development without a secret configured, accept but log a warning
    logger.warn("Achek webhook: ACHEK_WEBHOOK_SECRET not set — signature check skipped (set it in the Developer panel for production)");
  }

  // ── Parse payload ────────────────────────────────────────────────────
  let event: AchekEvent;
  try {
    const raw = req.body instanceof Buffer
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);
    event = JSON.parse(raw) as AchekEvent;
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  // Acknowledge immediately — Achek retries on non-2xx or slow responses
  res.sendStatus(200);

  // ── Dispatch asynchronously ──────────────────────────────────────────
  void (async () => {
    try {
      logger.debug({ event: event.event }, "Achek webhook: received");

      switch (event.event) {
        case "message.incoming": {
          const phone   = String(event.data["phone"]   ?? "").trim();
          const message = String(event.data["message"] ?? "").trim();
          if (phone && message) {
            await handleIncomingMessage(phone, message);
          } else {
            logger.warn({ data: event.data }, "Achek webhook: message.incoming missing phone or message");
          }
          break;
        }

        case "handoff.requested": {
          // Bot depth reached — a human agent may need to pick this up
          logger.info(
            { phone: event.data["phone"], reason: event.data["reason"], exchanges: event.data["exchanges"] },
            "Achek webhook: handoff requested",
          );
          // Future enhancement: create a support ticket or notify an internal channel
          break;
        }

        case "spam.quarantine": {
          logger.warn(
            { phone: event.data["phone"], until: event.data["quarantined_until"] },
            "Achek webhook: sender quarantined for spam",
          );
          break;
        }

        case "lead.captured":
        case "ticket.created":
          logger.info({ event: event.event, data: event.data }, "Achek webhook: ticket/lead event");
          break;

        default:
          logger.debug({ event: event.event }, "Achek webhook: unhandled event type");
      }
    } catch (err) {
      logger.error({ err, event: event.event }, "Achek webhook: handler threw");
    }
  })();
});

export default router;
