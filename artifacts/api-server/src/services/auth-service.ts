import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { clientsTable, auditLogTable, otpCodesTable, type SafeClient } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, signRefreshToken } from "../middlewares/auth.js";
import { isDemo } from "./trading-mode.js";
import { sendPasswordResetEmail } from "./notification.js";
import { sendOtp, verifyOtp } from "./otp-service.js";

const SALT_ROUNDS = 12;
const DEMO_EMAIL  = "demo@stockbrokerng.app";

// In-memory password reset tokens: token → { clientId, expires }
const resetTokens = new Map<string, { clientId: string; expires: Date }>();

function omitSensitive(client: typeof clientsTable.$inferSelect): SafeClient {
  const { passwordHash, refreshTokenHash, passkeyCred, ...safe } = client;
  void passwordHash; void refreshTokenHash; void passkeyCred;
  return safe;
}

export async function registerClient(data: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}): Promise<{ client: SafeClient; accessToken: string; refreshToken: string }> {
  const existing = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.email, data.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const id = uuidv4();

  // SEC Nigeria & CBN require KYC before trading.
  // Account is created immediately but kycStatus starts as "pending".
  // Demo balance is granted so users can explore the platform.
  // kycStatus moves to "verified" once they submit BVN + NIN + address.
  const [client] = await db
    .insert(clientsTable)
    .values({
      id,
      email:           data.email.toLowerCase(),
      passwordHash,
      fullName:        data.fullName,
      phone:           data.phone,
      brokerCode:      process.env["BROKER_CODE"] ?? "0001",
      kycStatus:       "pending",    // requires KYC wizard completion
      kycTier:         "tier1",
      cashBalanceKobo: 50_000_000,  // ₦500,000 demo balance (explore before KYC)
    })
    .returning();

  if (!client) throw new Error("Failed to create client");

  const accessToken  = signToken({ sub: client.id, role: client.role });
  const refreshToken = signRefreshToken(client.id);
  const refreshHash  = await bcrypt.hash(refreshToken, 10);
  await db.update(clientsTable).set({ refreshTokenHash: refreshHash }).where(eq(clientsTable.id, id));

  return { client: omitSensitive(client), accessToken, refreshToken };
}

// ── KYC Submission ───────────────────────────────────────────────────────────

export interface KycSubmission {
  clientId: string;
  dob:      string;           // YYYY-MM-DD
  gender:   "male" | "female" | "other";
  bvn:      string;           // 11 digits — Bank Verification Number
  nin:      string;           // 11 digits — National Identification Number
  address: {
    street:     string;
    city:       string;
    state:      string;
    lga:        string;
    postalCode: string;
  };
  ipAddress?: string;
}

export async function submitKyc(data: KycSubmission): Promise<SafeClient> {
  const { clientId, dob, gender, bvn, nin, address } = data;

  // Validate BVN: 11 digits
  if (!/^\d{11}$/.test(bvn)) {
    throw Object.assign(new Error("BVN must be exactly 11 digits"), { status: 400 });
  }
  // Validate NIN: 11 digits
  if (!/^\d{11}$/.test(nin)) {
    throw Object.assign(new Error("NIN must be exactly 11 digits"), { status: 400 });
  }
  // Validate age: must be 18+
  const dobDate = new Date(dob);
  const today   = new Date();
  const age     = today.getFullYear() - dobDate.getFullYear()
    - (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
  if (age < 18) {
    throw Object.assign(new Error("You must be at least 18 years old to open a brokerage account"), { status: 400 });
  }

  // Verify client exists
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  if (client.bvn) {
    throw Object.assign(new Error("KYC already submitted"), { status: 409 });
  }

  // In demo mode: auto-verify. In live mode: goes to compliance review.
  const newKycStatus = isDemo() ? "verified" : "under_review";
  const newKycTier   = isDemo() ? "tier2"    : "tier1";

  // Save identity fields to client record
  await db.update(clientsTable).set({
    bvn,
    nin,
    kycStatus: newKycStatus,
    kycTier:   newKycTier,
    updatedAt: new Date(),
  }).where(eq(clientsTable.id, clientId));

  // Store full KYC profile in audit log (DOB, gender, address cannot go in clients table
  // without a schema migration — stored here for compliance audit trail)
  await db.insert(auditLogTable).values({
    id:         uuidv4(),
    clientId,
    actorId:    clientId,
    action:     "kyc.submitted",
    entityType: "client",
    entityId:   clientId,
    details: {
      dob, gender, address,
      bvnSubmitted: true,
      ninSubmitted: true,
      autoVerified: isDemo(),
    } as Record<string, unknown>,
    ipAddress: data.ipAddress,
  });

  const [updated] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  if (!updated) throw new Error("Failed to retrieve updated client");
  return omitSensitive(updated);
}

// ────────────────────────────────────────────────────────────────────────────

export async function loginClient(email: string, password: string): Promise<{
  client: SafeClient;
  accessToken: string;
  refreshToken: string;
}> {
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.email, email.toLowerCase()))
    .limit(1);

  if (!client) throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  if (!client.isActive || client.isSuspended) {
    throw Object.assign(new Error("Account suspended or inactive"), { status: 403 });
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) throw Object.assign(new Error("Invalid email or password"), { status: 401 });

  const accessToken  = signToken({ sub: client.id, role: client.role });
  const refreshToken = signRefreshToken(client.id);
  const refreshHash  = await bcrypt.hash(refreshToken, 10);

  await db.update(clientsTable).set({
    refreshTokenHash: refreshHash,
    lastLoginAt: new Date(),
  }).where(eq(clientsTable.id, client.id));

  return { client: omitSensitive(client), accessToken, refreshToken };
}

export async function refreshSession(rawRefreshToken: string): Promise<{ accessToken: string }> {
  const { verifyRefreshToken } = await import("../middlewares/auth.js");
  const { sub: clientId } = verifyRefreshToken(rawRefreshToken);

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  if (!client?.refreshTokenHash) throw Object.assign(new Error("Session expired"), { status: 401 });

  const valid = await bcrypt.compare(rawRefreshToken, client.refreshTokenHash);
  if (!valid) throw Object.assign(new Error("Session expired"), { status: 401 });

  return { accessToken: signToken({ sub: client.id, role: client.role }) };
}

export async function getClientById(id: string): Promise<SafeClient | null> {
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, id))
    .limit(1);
  return client ? omitSensitive(client) : null;
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ sent: boolean; devToken?: string }> {
  const [client] = await db
    .select({ id: clientsTable.id, fullName: clientsTable.fullName })
    .from(clientsTable)
    .where(eq(clientsTable.email, email.toLowerCase()))
    .limit(1);

  if (!client) return { sent: true };

  const token   = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  resetTokens.set(token, { clientId: client.id, expires });

  const isDev = process.env["NODE_ENV"] !== "production";
  if (!isDev) {
    await sendPasswordResetEmail(client.email, client.fullName, token);
  }

  return { sent: true, ...(isDev ? { devToken: token } : {}) };
}

export async function sendPasswordResetOtp(phone: string): Promise<{ requestId?: string; expiresAt?: Date }> {
  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.phone, phone))
    .limit(1);

  if (!client) return { requestId: undefined, expiresAt: undefined };

  const otp = await sendOtp(phone, "password_reset");
  return otp;
}

export async function resetPasswordWithOtp(requestId: string, code: string, newPassword: string): Promise<void> {
  const valid = await verifyOtp(requestId, code);
  if (!valid) throw Object.assign(new Error("Invalid OTP code"), { status: 400 });

  const [otp] = await db.select().from(otpCodesTable).where(eq(otpCodesTable.requestId, requestId)).limit(1);
  if (!otp || !otp.phone) throw Object.assign(new Error("OTP record missing"), { status: 404 });

  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.phone, otp.phone))
    .limit(1);

  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.update(clientsTable).set({ passwordHash, updatedAt: new Date() }).where(eq(clientsTable.id, client.id));
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const entry = resetTokens.get(token);
  if (!entry || entry.expires < new Date()) {
    throw Object.assign(new Error("Invalid or expired reset link"), { status: 400 });
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db
    .update(clientsTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(clientsTable.id, entry.clientId));
  resetTokens.delete(token);
}

// ── Platform Demo Account ─────────────────────────────────────────────────────

export async function seedDemoAccount(): Promise<void> {
  const existing = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.email, DEMO_EMAIL))
    .limit(1);
  if (existing.length > 0) return;

  const id           = uuidv4();
  const passwordHash = await bcrypt.hash(uuidv4(), SALT_ROUNDS); // random — login only via /demo

  await db.insert(clientsTable).values({
    id,
    email:           DEMO_EMAIL,
    passwordHash,
    fullName:        "Demo Investor",
    phone:           "08001234567",
    brokerCode:      process.env["BROKER_CODE"] ?? "0001",
    kycStatus:       "verified",
    kycTier:         "tier2",
    cashBalanceKobo: 5_000_000_00, // ₦5,000,000
    chn:             "NGX-DEMO-001",
    bvn:             "00000000000",
    nin:             "00000000000",
  });
}

export async function loginDemo(): Promise<{
  client: SafeClient;
  accessToken: string;
  refreshToken: string;
}> {
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.email, DEMO_EMAIL))
    .limit(1);

  if (!client) throw Object.assign(new Error("Demo account unavailable"), { status: 503 });

  const accessToken  = signToken({ sub: client.id, role: client.role });
  const refreshToken = signRefreshToken(client.id);
  const refreshHash  = await bcrypt.hash(refreshToken, 10);

  await db.update(clientsTable).set({
    refreshTokenHash: refreshHash,
    cashBalanceKobo:  5_000_000_00,
    lastLoginAt:      new Date(),
  }).where(eq(clientsTable.id, client.id));

  return { client: omitSensitive(client), accessToken, refreshToken };
}
