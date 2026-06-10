import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { otpCodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { listSettings } from "./settings-service.js";

const DEFAULT_ACHEK_URL = "https://api.achek.com.ng";
const DEFAULT_APP_URL = process.env["PUBLIC_URL"] ?? process.env["APP_URL"] ?? "https://app.stockbroker.ng";
const DEFAULT_APP_NAME = process.env["APP_NAME"] ?? "StockBroker NG";
const DEFAULT_SUPPORT_EMAIL = process.env["SUPPORT_EMAIL"] ?? "support@stockbroker.ng";
const DEFAULT_OTP_TEMPLATE = "Your {{appName}} code is {{code}}. It expires in 10 minutes.";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => values[token] ?? "");
}

async function sendWithTwilio(phone: string, body: string, fromNumber: string) {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for Twilio SMS provider");
  }

  const form = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<unavailable>");
    throw new Error(`Twilio SMS failed: ${res.status} ${errorText}`);
  }
}

async function sendWithAchek(phone: string, template: string) {
  const apiKey = process.env["ACHEK_API_KEY"];
  const endpoint = (process.env["ACHEK_API_URL"] ?? DEFAULT_ACHEK_URL).replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("ACHEK_API_KEY is not configured for Achek OTP provider");
  }

  const res = await fetch(`${endpoint}/otp/send`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber: phone,
      template,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<unavailable>");
    throw new Error(`Achek OTP send failed: ${res.status} ${errorText}`);
  }

  const data = await res.json() as { requestId: string; expiresAt: string }; 
  return data;
}

async function verifyWithAchek(requestId: string, code: string) {
  const apiKey = process.env["ACHEK_API_KEY"];
  const endpoint = (process.env["ACHEK_API_URL"] ?? DEFAULT_ACHEK_URL).replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("ACHEK_API_KEY is not configured for Achek OTP provider");
  }

  const res = await fetch(`${endpoint}/otp/verify`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestId, code }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<unavailable>");
    throw new Error(`Achek OTP verify failed: ${res.status} ${errorText}`);
  }

  const data = await res.json() as { valid: boolean; message?: string };
  return data.valid;
}

async function getOtpSettings() {
  const settings = await listSettings();
  return {
    otpProvider: typeof settings.otp_provider === "object" && settings.otp_provider !== null
      ? (String((settings.otp_provider as Record<string, unknown>).provider) as "achek" | "console")
      : "achek",
    otpTemplate: typeof settings.otp_template === "string" ? settings.otp_template : DEFAULT_OTP_TEMPLATE,
    smsProvider: typeof settings.sms_provider === "object" && settings.sms_provider !== null
      ? (String((settings.sms_provider as Record<string, unknown>).provider) as "twilio" | "achek" | "console")
      : "console",
    smsFromNumber: typeof settings.sms_provider === "object" && settings.sms_provider !== null
      ? String((settings.sms_provider as Record<string, unknown>).fromNumber ?? "+2340000000000")
      : "+2340000000000",
    appName: typeof settings.app_name === "string" ? settings.app_name : DEFAULT_APP_NAME,
    appUrl: typeof settings.app_url === "string" ? settings.app_url : DEFAULT_APP_URL,
    supportEmail:
      typeof settings.email_provider === "object" && settings.email_provider !== null
        ? String((settings.email_provider as Record<string, unknown>).supportEmail ?? DEFAULT_SUPPORT_EMAIL)
        : DEFAULT_SUPPORT_EMAIL,
  };
}

export async function sendOtp(phone: string, type: string) {
  const { otpProvider, otpTemplate, smsProvider, smsFromNumber, appName, appUrl, supportEmail } = await getOtpSettings();
  const requestId = `otp_${uuidv4()}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const template = otpTemplate || DEFAULT_OTP_TEMPLATE;
  const renderContext = { code: "", phoneNumber: phone, appName, appUrl, supportEmail };

  const row = {
    id: uuidv4(),
    phone,
    requestId,
    provider: otpProvider,
    type,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    clientId: null,
    code: null,
    externalReference: null,
    verifiedAt: null,
    attempts: 0,
  } as Record<string, unknown>;

  if (otpProvider === "achek") {
    try {
      const achek = await sendWithAchek(phone, template);
      row.externalReference = achek.requestId;
      row.expiresAt = new Date(achek.expiresAt);
    } catch (err) {
      if (smsProvider === "twilio") {
        const code = generateCode();
        const message = renderTemplate(template, { ...renderContext, code });
        await sendWithTwilio(phone, message, smsFromNumber);
        row.provider = "twilio";
        row.code = code;
      } else {
        throw err;
      }
    }
  } else {
    const code = generateCode();
    const message = renderTemplate(template, { ...renderContext, code });
    if (smsProvider === "twilio") {
      await sendWithTwilio(phone, message, smsFromNumber);
    } else {
      console.info("OTP provider fallback: console", { phone, message });
    }
    row.code = code;
  }

  await db.insert(otpCodesTable).values(row as any);

  return { requestId, expiresAt: row.expiresAt as Date };
}

export async function verifyOtp(requestId: string, code: string) {
  const [otp] = await db.select().from(otpCodesTable).where(eq(otpCodesTable.requestId, requestId)).limit(1);
  if (!otp) {
    throw Object.assign(new Error("OTP request not found"), { status: 404 });
  }

  if (otp.verifiedAt) {
    throw Object.assign(new Error("OTP has already been used"), { status: 400 });
  }

  if (otp.expiresAt < new Date()) {
    throw Object.assign(new Error("OTP has expired"), { status: 400 });
  }

  if (otp.provider === "achek") {
    if (!otp.externalReference) {
      throw Object.assign(new Error("Missing Achek reference for OTP verification"), { status: 500 });
    }
    const valid = await verifyWithAchek(otp.externalReference, code);
    if (!valid) {
      await db.update(otpCodesTable).set({ attempts: otp.attempts + 1, updatedAt: new Date() }).where(eq(otpCodesTable.id, otp.id));
      return false;
    }
  } else {
    if (otp.code !== code) {
      await db.update(otpCodesTable).set({ attempts: otp.attempts + 1, updatedAt: new Date() }).where(eq(otpCodesTable.id, otp.id));
      return false;
    }
  }

  await db.update(otpCodesTable).set({ verifiedAt: new Date(), updatedAt: new Date() }).where(eq(otpCodesTable.id, otp.id));
  return true;
}

export async function findOtpByPhone(phone: string, type: string) {
  const [otp] = await db.select().from(otpCodesTable)
    .where(eq(otpCodesTable.phone, phone))
    .orderBy(otpCodesTable.createdAt.desc)
    .limit(1);
  return otp;
}
