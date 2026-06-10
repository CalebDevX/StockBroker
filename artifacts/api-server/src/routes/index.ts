import express, { Router, type IRouter } from "express";
import { listSettings } from "../services/settings-service.js";
import { processCscsWebhookEvent, isValidCscsSignature, type CscsWebhookPayload } from "../services/cscs-a2a.js";
import healthRouter        from "./health.js";
import authRouter          from "./auth.js";
import ordersRouter        from "./orders.js";
import portfolioRouter     from "./portfolio.js";
import marketRouter        from "./market.js";
import fundsRouter         from "./funds.js";
import adminRouter         from "./admin.js";
import systemRouter        from "./system.js";
import notificationsRouter from "./notifications.js";
import reportsRouter       from "./reports.js";
import supportRouter       from "./support.js";

const router: IRouter = Router();

router.use(healthRouter);
router.post(
  "/cscs/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = String(req.headers["x-cscs-signature"] ?? "");
    const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);

    if (!isValidCscsSignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid CSCS webhook signature" });
    }

    try {
      const payload = JSON.parse(rawBody) as CscsWebhookPayload;
      await processCscsWebhookEvent(payload);
      return res.status(200).json({ status: "ok" });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(400).json({ error: error.message });
    }
  },
);
router.get("/settings", async (_req, res) => {
  const settings = await listSettings();
  res.json({ settings });
});
router.use("/auth",          authRouter);
router.use("/orders",        ordersRouter);
router.use("/portfolio",     portfolioRouter);
router.use("/market",        marketRouter);
router.use("/funds",         fundsRouter);
router.use("/admin",         adminRouter);
router.use("/system",        systemRouter);
router.use("/notifications", notificationsRouter);
router.use("/reports",       reportsRouter);
router.use("/support",       supportRouter);

export default router;
