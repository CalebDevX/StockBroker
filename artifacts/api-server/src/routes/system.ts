/**
 * GET  /api/system/mode   — public endpoint; returns current trading mode + FIX status
 * POST /api/system/mode   — requires auth (any role); client just reads, admins switch
 */

import { Router } from "express";
import { getMode } from "../services/trading-mode.js";
import { getFixSession } from "../services/fix-session.js";

const router = Router();

router.get("/mode", (_req, res) => {
  const mode = getMode();
  let fixConnected = false;
  let fixLoggedOn  = false;

  if (mode === "live") {
    try {
      const sess    = getFixSession();
      fixConnected  = sess.isConnected;
      fixLoggedOn   = sess.isLoggedOn;
    } catch {}
  }

  res.json({
    mode,
    fixConnected,
    fixLoggedOn,
    demoBalance: mode === "demo" ? 500_000 : undefined, // ₦500k demo balance hint
  });
});

export default router;
