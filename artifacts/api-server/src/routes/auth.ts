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
  findOrCreateGoogleUser,
} from "../services/auth-service.js";
import { sendOtp, verifyOtp } from "../services/otp-service.js";
import {
  getGoogleCredentials,
  buildGoogleAuthUrl,
  exchangeCode,
  fetchGoogleProfile,
} from "../services/google-oauth-service.js";

const router = Router();

function getBaseUrl(req: import("express").Request): string {
  const appUrl = process.env["APP_URL"] ?? process.env["PUBLIC_URL"];
  if (appUrl) return appUrl.replace(/\/$/, "");
  const proto = (req.get("x-forwarded-proto") ?? req.protocol ?? "https").split(",")[0].trim();
  const host  = (req.get("x-forwarded-host")  ?? req.get("host") ?? "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2).max(120),
  phone:    z.string().min(10).max(20),
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

// GET /api/auth/google — start Google OAuth flow
router.get("/google", async (req, res) => {
  try {
    const { clientId } = await getGoogleCredentials();
    if (!clientId) {
      const base = getBaseUrl(req);
      res.redirect(`${base}/auth/callback?error=${encodeURIComponent("Google Sign-In is not configured yet. Contact your administrator.")}`);
      return;
    }
    const base        = getBaseUrl(req);
    const redirectUri = `${base}/api/auth/google/callback`;
    const state       = Math.random().toString(36).slice(2);
    const url         = buildGoogleAuthUrl(clientId, redirectUri, state);
    res.redirect(url);
  } catch (err: unknown) {
    const base = getBaseUrl(req);
    res.redirect(`${base}/auth/callback?error=${encodeURIComponent((err as Error).message)}`);
  }
});

// GET /api/auth/google/callback — handle Google redirect
router.get("/google/callback", async (req, res) => {
  const base = getBaseUrl(req);
  try {
    const { code, error: oauthError } = req.query as { code?: string; error?: string };
    if (oauthError || !code) {
      res.redirect(`${base}/auth/callback?error=${encodeURIComponent(oauthError ?? "Google sign-in was cancelled")}`);
      return;
    }

    const { clientId, clientSecret } = await getGoogleCredentials();
    if (!clientId || !clientSecret) {
      res.redirect(`${base}/auth/callback?error=${encodeURIComponent("Google Sign-In is not configured")}`);
      return;
    }

    const redirectUri = `${base}/api/auth/google/callback`;
    const tokens      = await exchangeCode(code, clientId, clientSecret, redirectUri);
    const profile     = await fetchGoogleProfile(tokens.access_token);
    const result      = await findOrCreateGoogleUser(profile);

    res.redirect(
      `${base}/auth/callback?accessToken=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}`
    );
  } catch (err: unknown) {
    res.redirect(`${base}/auth/callback?error=${encodeURIComponent((err as Error).message)}`);
  }
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

// POST /api/auth/phone/send-otp  — send OTP for phone verification during registration
router.post("/phone/send-otp",
  validateBody(z.object({ phone: z.string().min(10).max(20) })),
  async (req, res) => {
    try {
      const { phone } = req.body as { phone: string };
      const result = await sendOtp(phone, "phone_verification");
      res.json({ sent: true, requestId: result.requestId, expiresAt: result.expiresAt });
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      res.status(e.status ?? 400).json({ error: e.message });
    }
  }
);

// POST /api/auth/phone/verify  — verify OTP code
router.post("/phone/verify",
  validateBody(z.object({ requestId: z.string().min(1), code: z.string().min(4).max(8) })),
  async (req, res) => {
    try {
      const { requestId, code } = req.body as { requestId: string; code: string };
      const valid = await verifyOtp(requestId, code);
      if (!valid) {
        res.status(400).json({ error: "Invalid or expired verification code" });
        return;
      }
      res.json({ verified: true });
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
