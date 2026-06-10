import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { db } from "@workspace/db";
import {
  supportChatsTable,
  supportMessagesTable,
  clientsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateBotReply } from "../services/gemini-service.js";
import { getWsServer } from "../websocket.js";

const router = Router();
router.use(requireAuth);

const ADMIN_ROLES = ["admin", "broker", "compliance"];

function isAdmin(role: string) {
  return ADMIN_ROLES.includes(role);
}

// ── Create or reopen a chat ──────────────────────────────────────────────────

router.post("/chats", async (req, res) => {
  try {
    const clientId = req.auth.sub;

    const [existing] = await db
      .select()
      .from(supportChatsTable)
      .where(
        and(
          eq(supportChatsTable.clientId, clientId),
          sql`${supportChatsTable.status} IN ('open', 'active')`,
        ),
      )
      .orderBy(desc(supportChatsTable.createdAt))
      .limit(1);

    if (existing) {
      const messages = await db
        .select()
        .from(supportMessagesTable)
        .where(eq(supportMessagesTable.chatId, existing.id))
        .orderBy(supportMessagesTable.createdAt);
      return res.json({ chat: existing, messages });
    }

    const chatId = uuidv4();
    const [chat] = await db
      .insert(supportChatsTable)
      .values({
        id: chatId,
        clientId,
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const welcomeId = uuidv4();
    const welcomeContent =
      "Hello! I'm the StockBroker NG support assistant. How can I help you today?\n\nI can assist with KYC verification, trading, funds, fees, account issues, and more. If you need a human agent at any time, just click **Talk to an Agent**.";

    await db.insert(supportMessagesTable).values({
      id: welcomeId,
      chatId,
      senderId: null,
      senderRole: "bot",
      content: welcomeContent,
      createdAt: new Date(),
    });

    return res.status(201).json({
      chat,
      messages: [
        {
          id: welcomeId,
          chatId,
          senderId: null,
          senderRole: "bot",
          content: welcomeContent,
          createdAt: new Date(),
        },
      ],
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ── Get client's own chats ───────────────────────────────────────────────────

router.get("/chats", async (req, res) => {
  try {
    const clientId = req.auth.sub;
    const role = (req.auth as { role?: string }).role ?? "client";

    if (isAdmin(role)) {
      const chats = await db
        .select({
          id: supportChatsTable.id,
          clientId: supportChatsTable.clientId,
          clientName: clientsTable.fullName,
          clientEmail: clientsTable.email,
          agentId: supportChatsTable.agentId,
          status: supportChatsTable.status,
          subject: supportChatsTable.subject,
          createdAt: supportChatsTable.createdAt,
          updatedAt: supportChatsTable.updatedAt,
        })
        .from(supportChatsTable)
        .leftJoin(clientsTable, eq(supportChatsTable.clientId, clientsTable.id))
        .orderBy(desc(supportChatsTable.updatedAt))
        .limit(100);

      const chatsWithLastMessage = await Promise.all(
        chats.map(async (c) => {
          const [last] = await db
            .select()
            .from(supportMessagesTable)
            .where(eq(supportMessagesTable.chatId, c.id))
            .orderBy(desc(supportMessagesTable.createdAt))
            .limit(1);
          return { ...c, lastMessage: last ?? null };
        }),
      );

      return res.json({ chats: chatsWithLastMessage });
    }

    const chats = await db
      .select()
      .from(supportChatsTable)
      .where(eq(supportChatsTable.clientId, clientId))
      .orderBy(desc(supportChatsTable.createdAt))
      .limit(20);

    return res.json({ chats });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ── Get messages for a chat ──────────────────────────────────────────────────

router.get("/chats/:id/messages", async (req, res) => {
  try {
    const chatId = String(req.params["id"] ?? "");
    const clientId = req.auth.sub;
    const role = (req.auth as { role?: string }).role ?? "client";

    const [chat] = await db
      .select()
      .from(supportChatsTable)
      .where(eq(supportChatsTable.id, chatId))
      .limit(1);

    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!isAdmin(role) && chat.clientId !== clientId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.chatId, chatId))
      .orderBy(supportMessagesTable.createdAt);

    return res.json({ chat, messages });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ── Send a message ───────────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  escalate: z.boolean().optional(),
});

router.post(
  "/chats/:id/messages",
  validateBody(sendMessageSchema),
  async (req, res) => {
    try {
      const chatId = String(req.params["id"] ?? "");
      const clientId = req.auth.sub;
      const senderRole = (req.auth as { role?: string }).role ?? "client";
      const body = req.body as z.infer<typeof sendMessageSchema>;

      const [chat] = await db
        .select()
        .from(supportChatsTable)
        .where(eq(supportChatsTable.id, chatId))
        .limit(1);

      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (!isAdmin(senderRole) && chat.clientId !== clientId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const messageId = uuidv4();
      const messageRole = isAdmin(senderRole) ? "agent" : "client";

      await db.insert(supportMessagesTable).values({
        id: messageId,
        chatId,
        senderId: clientId,
        senderRole: messageRole as "client" | "agent",
        content: body.content,
        createdAt: new Date(),
      });

      await db
        .update(supportChatsTable)
        .set({ updatedAt: new Date() })
        .where(eq(supportChatsTable.id, chatId));

      const clientMessage = {
        id: messageId,
        chatId,
        senderId: clientId,
        senderRole: messageRole,
        content: body.content,
        createdAt: new Date(),
      };

      if (isAdmin(senderRole)) {
        try {
          const ws = getWsServer();
          ws.pushToClient(chat.clientId, {
            type: "support_message",
            chatId,
            message: clientMessage,
          });
        } catch {
          /* WS not critical */
        }
        return res.json({ message: clientMessage });
      }

      if (body.escalate) {
        await db
          .update(supportChatsTable)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(supportChatsTable.id, chatId));

        const escalateId = uuidv4();
        const escalateContent =
          "You've been connected to our support team. An agent will review your conversation and respond shortly during business hours (Mon–Fri, 8am–5pm WAT).";

        await db.insert(supportMessagesTable).values({
          id: escalateId,
          chatId,
          senderId: null,
          senderRole: "bot",
          content: escalateContent,
          createdAt: new Date(),
        });

        return res.json({
          message: clientMessage,
          botReply: {
            id: escalateId,
            chatId,
            senderId: null,
            senderRole: "bot",
            content: escalateContent,
            createdAt: new Date(),
          },
          escalated: true,
        });
      }

      const history = await db
        .select()
        .from(supportMessagesTable)
        .where(eq(supportMessagesTable.chatId, chatId))
        .orderBy(supportMessagesTable.createdAt)
        .limit(20);

      const geminiHistory = history
        .filter((m) => m.senderRole !== "bot" || m.content !== body.content)
        .map((m) => ({
          role: (m.senderRole === "client" ? "user" : "model") as
            | "user"
            | "model",
          content: m.content,
        }));

      const botText = await generateBotReply(geminiHistory, body.content);

      const botId = uuidv4();
      await db.insert(supportMessagesTable).values({
        id: botId,
        chatId,
        senderId: null,
        senderRole: "bot",
        content: botText,
        createdAt: new Date(),
      });

      await db
        .update(supportChatsTable)
        .set({ updatedAt: new Date() })
        .where(eq(supportChatsTable.id, chatId));

      return res.json({
        message: clientMessage,
        botReply: {
          id: botId,
          chatId,
          senderId: null,
          senderRole: "bot",
          content: botText,
          createdAt: new Date(),
        },
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: (err as Error).message });
    }
  },
);

// ── Escalate to human ────────────────────────────────────────────────────────

router.patch("/chats/:id/escalate", async (req, res) => {
  try {
    const chatId = String(req.params["id"] ?? "");
    const clientId = req.auth.sub;

    const [chat] = await db
      .select()
      .from(supportChatsTable)
      .where(eq(supportChatsTable.id, chatId))
      .limit(1);

    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });

    await db
      .update(supportChatsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(supportChatsTable.id, chatId));

    return res.json({ ok: true, status: "active" });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ── Admin: claim a chat ──────────────────────────────────────────────────────

router.patch("/chats/:id/claim", async (req, res) => {
  try {
    const chatId = String(req.params["id"] ?? "");
    const agentId = req.auth.sub;
    const role = (req.auth as { role?: string }).role ?? "client";

    if (!isAdmin(role)) return res.status(403).json({ error: "Forbidden" });

    await db
      .update(supportChatsTable)
      .set({ agentId, status: "active", updatedAt: new Date() })
      .where(eq(supportChatsTable.id, chatId));

    return res.json({ ok: true, agentId });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ── Resolve a chat ───────────────────────────────────────────────────────────

router.patch("/chats/:id/resolve", async (req, res) => {
  try {
    const chatId = String(req.params["id"] ?? "");
    const role = (req.auth as { role?: string }).role ?? "client";
    const clientId = req.auth.sub;

    const [chat] = await db
      .select()
      .from(supportChatsTable)
      .where(eq(supportChatsTable.id, chatId))
      .limit(1);

    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!isAdmin(role) && chat.clientId !== clientId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db
      .update(supportChatsTable)
      .set({ status: "resolved", updatedAt: new Date() })
      .where(eq(supportChatsTable.id, chatId));

    return res.json({ ok: true, status: "resolved" });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
