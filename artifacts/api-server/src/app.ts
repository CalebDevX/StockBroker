import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createServer } from "http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { initWsServer } from "./websocket.js";

const app: Express = express();

// CORS — in production, restrict ALLOWED_ORIGINS to your actual domain(s)
// e.g. ALLOWED_ORIGINS=https://app.yourfirm.com,https://portal.yourfirm.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use("/api/cscs/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export const httpServer = createServer(app);

initWsServer(httpServer);

export default app;
