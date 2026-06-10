import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  registerClient,
  loginClient,
  refreshSession,
  getClientById,
  submitKyc,
  forgotPassword,
  resetPassword,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
  loginDemo,
} from "../services/auth-service.js";

const router = Router();

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2).max(120),
  phone:    z.string().min(11).max(14),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const kycSchema = z.object({
  dob:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  gender: z.enum(["male", "female", "other"]),
  bvn:    z.string().regex(/^\d{11}$/, "BVN must be 11 digits"),
  nin:    z.string().regex(/^\d{11}$/, "NIN must be 11 digits"),
  address: z.object({
    street:     z.string().min(3).max(200),
    city:       z.string().min(2).max(100),
    state:      z.string().min(2).max(50),
    lga:        z.string().min(2).max(100),
    postalCode: z.string().min(3).max(10),
  }),
});

// POST /api/auth/register
router.post("/register", validateBody(registerSchema), async (req, res) => {
  try {
    const result = await registerClient(req.body as z.infer<typeof registerSchema>);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post("/login", validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await loginClient(email, password);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", validateBody(refreshSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
    const result = await refreshSession(refreshToken);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 401).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const client = await getClientById(req.auth.sub);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    // Return client directly (no wrapper) so frontend doesn't need to unwrap
    res.json(client);
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/auth/kyc  — submit KYC details (BVN, NIN, DOB, address)
router.patch("/kyc", requireAuth, validateBody(kycSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof kycSchema>;
    const client = await submitKyc({
      clientId: req.auth.sub,
      ...body,
      ipAddress: req.ip,
    });
    res.json({ client, message: "KYC submitted successfully" });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password",
  validateBody(z.object({ email: z.string().email() })),
  async (req, res) => {
    const { email } = req.body as { email: string };
    const result = await forgotPassword(email);
    // devToken only present in NODE_ENV !== "production"
    res.json({ sent: true, ...(result.devToken ? { devToken: result.devToken } : {}) });
  }
);

// POST /api/auth/otp/send
router.post("/otp/send",
  validateBody(z.object({ phone: z.string().min(11).max(14) })),
  async (req, res) => {
    try {
      const { phone } = req.body as { phone: string };
      const result = await sendPasswordResetOtp(phone);
      res.json({ sent: true, requestId: result.requestId, expiresAt: result.expiresAt });
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      res.status(e.status ?? 400).json({ error: e.message });
    }
  }
);

// POST /api/auth/otp/verify
router.post("/otp/verify",
  validateBody(z.object({ requestId: z.string().min(1), code: z.string().min(4).max(8), newPassword: z.string().min(8) })),
  async (req, res) => {
    try {
      const { requestId, code, newPassword } = req.body as { requestId: string; code: string; newPassword: string };
      await resetPasswordWithOtp(requestId, code, newPassword);
      res.json({ reset: true });
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      res.status(e.status ?? 400).json({ error: e.message });
    }
  }
);

// POST /api/auth/reset-password
router.post("/reset-password",
  validateBody(z.object({ token: z.string().uuid(), newPassword: z.string().min(8) })),
  async (req, res) => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      await resetPassword(token, newPassword);
      res.json({ reset: true });
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      res.status(e.status ?? 400).json({ error: e.message });
    }
  }
);

export default router;
