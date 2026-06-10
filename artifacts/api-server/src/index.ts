import { httpServer } from "./app.js";
import { logger } from "./lib/logger.js";
import { getMode } from "./services/trading-mode.js";
import { startFixSession } from "./services/fix-session.js";


const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

httpServer.listen(port, () => {
  logger.info({ port, tradingMode: getMode() }, "OMS API Server listening");
  if (getMode() === "live") {
    logger.info("FIX session starting (TRADING_MODE=live)");
    startFixSession();
  } else {
    logger.info("Demo mode active — orders will be simulated locally");
  }
});
