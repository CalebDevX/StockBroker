import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { verifyRefreshToken } from "./middlewares/auth.js";
import { logger } from "./lib/logger.js";

interface AuthedSocket extends WebSocket {
  clientId?: string;
  isAlive: boolean;
}

let wss: OmsWebSocketServer | null = null;

class OmsWebSocketServer {
  private server: WebSocketServer;
  private clients = new Map<string, Set<AuthedSocket>>();
  private orderOwners = new Map<string, string>();

  constructor(httpServer: Server) {
    this.server = new WebSocketServer({ server: httpServer, path: "/api/ws" });
    this.server.on("connection", (ws: AuthedSocket, req: IncomingMessage) => {
      ws.isAlive = true;
      ws.on("pong", () => { ws.isAlive = true; });
      ws.on("message", (data) => this.handleMessage(ws, data.toString()));
      ws.on("close",   () => this.removeSocket(ws));
      ws.on("error",   (err) => logger.warn({ err }, "WS: socket error"));
      void req;
    });

    setInterval(() => {
      this.server.clients.forEach((ws) => {
        const s = ws as AuthedSocket;
        if (!s.isAlive) { s.terminate(); return; }
        s.isAlive = false;
        s.ping();
      });
    }, 30_000);

    logger.info("WebSocket server ready on /api/ws");
  }

  private handleMessage(ws: AuthedSocket, raw: string): void {
    try {
      const msg = JSON.parse(raw) as { type: string; token?: string };
      if (msg.type === "auth" && msg.token) {
        try {
          const payload = verifyRefreshToken(msg.token);
          ws.clientId = payload.sub;
          if (!this.clients.has(ws.clientId)) {
            this.clients.set(ws.clientId, new Set());
          }
          this.clients.get(ws.clientId)!.add(ws);
          ws.send(JSON.stringify({ type: "auth_ok", clientId: ws.clientId }));
          logger.info({ clientId: ws.clientId }, "WS: client authenticated");
        } catch {
          ws.send(JSON.stringify({ type: "auth_error", error: "Invalid token" }));
          ws.terminate();
        }
      }
    } catch {
      // ignore malformed messages
    }
  }

  private removeSocket(ws: AuthedSocket): void {
    if (ws.clientId) {
      const sockets = this.clients.get(ws.clientId);
      sockets?.delete(ws);
      if (sockets?.size === 0) this.clients.delete(ws.clientId);
    }
  }

  registerOrder(clOrdId: string, clientId: string): void {
    this.orderOwners.set(clOrdId, clientId);
  }

  broadcast(clOrdId: string, payload: Record<string, unknown>): void {
    const clientId = this.orderOwners.get(clOrdId);
    if (!clientId) {
      logger.warn({ clOrdId }, "WS: broadcast called for unknown clOrdId — dropping");
      return;
    }
    this.pushToClient(clientId, payload);
    const terminal = ["filled", "cancelled", "rejected", "expired"];
    if (typeof payload["status"] === "string" && terminal.includes(payload["status"])) {
      this.orderOwners.delete(clOrdId);
    }
  }

  pushToClient(clientId: string, payload: Record<string, unknown>): void {
    const sockets = this.clients.get(clientId);
    if (!sockets) return;
    const msg = JSON.stringify(payload);
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  }
}

export function initWsServer(httpServer: Server): OmsWebSocketServer {
  wss = new OmsWebSocketServer(httpServer);
  return wss;
}

export function getWsServer(): OmsWebSocketServer {
  if (!wss) throw new Error("WebSocket server not initialised");
  return wss;
}
