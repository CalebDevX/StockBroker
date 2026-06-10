import nodemailer from "nodemailer";
import { listSettings } from "./settings-service.js";

const DEFAULT_APP_URL = process.env["PUBLIC_URL"] ?? process.env["APP_URL"] ?? "https://app.stockbroker.ng";
const DEFAULT_APP_NAME = process.env["APP_NAME"] ?? "StockBroker NG";
const DEFAULT_SUPPORT_EMAIL = process.env["SUPPORT_EMAIL"] ?? "support@stockbroker.ng";

export type EmailProviderType = "sendgrid" | "smtp" | "console";
export type SmsProviderType = "twilio" | "achek" | "console";

interface EmailProviderConfig {
  provider: EmailProviderType;
  fromEmail: string;
  supportEmail: string;
}

interface SmsProviderConfig {
  provider: SmsProviderType;
  fromNumber: string;
}

const DEFAULT_EMAIL_CONFIG: EmailProviderConfig = {
  provider: (process.env["EMAIL_PROVIDER"] as EmailProviderType) ?? "console",
  fromEmail: process.env["EMAIL_FROM"] ?? "noreply@stockbroker.ng",
  supportEmail: DEFAULT_SUPPORT_EMAIL,
};

const DEFAULT_SMS_CONFIG: SmsProviderConfig = {
  provider: (process.env["SMS_PROVIDER"] as SmsProviderType) ?? "console",
  fromNumber: process.env["SMS_FROM_NUMBER"] ?? "+2340000000000",
};

const DEFAULT_EMAIL_TEMPLATES = {
  passwordResetSubject: "Reset your {{appName}} password",
  passwordResetBody:
    "Hello {{fullName}},\n\nA password reset request was received for your {{appName}} account.\n\nReset your password using the link below:\n{{resetLink}}\n\nIf you did not request this, contact {{supportEmail}}.\n\nThank you,\n{{appName}}",
  kycApprovedSubject: "Your {{appName}} KYC is approved",
  kycApprovedBody:
    "Hello {{fullName}},\n\nGood news — your KYC has been approved. Your account is now cleared for trading.\nVisit {{appUrl}} to continue.\n\nThank you,\n{{appName}}",
  kycRejectedSubject: "{{appName}} KYC review requires action",
  kycRejectedBody:
    "Hello {{fullName}},\n\nYour KYC review is not complete. Please update your documents or contact support at {{supportEmail}}.\n\nThank you,\n{{appName}}",
  kycUnderReviewSubject: "{{appName}} KYC submission received",
  kycUnderReviewBody:
    "Hello {{fullName}},\n\nWe received your KYC submission and our compliance team is reviewing it. We'll notify you once the review is complete.\n\nThank you,\n{{appName}}",
};

const DEFAULT_SMS_TEMPLATES = {
  kycApproved: "Your {{appName}} KYC is approved. You may now trade on the platform.",
  kycRejected: "Your {{appName}} KYC requires more information. Please review your submission.",
  kycUnderReview: "Your {{appName}} KYC is under review. We'll notify you when it is complete.",
};

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => {
    return values[token] ?? "";
  });
}

async function sendWithSendGrid(to: string, subject: string, body: string, fromEmail: string) {
  const apiKey = process.env["SENDGRID_API_KEY"];
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured for SendGrid email provider");
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<unavailable>");
    throw new Error(`SendGrid email failed: ${res.status} ${errorText}`);
  }
}

async function sendWithSmtp(to: string, subject: string, body: string, fromEmail: string) {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const secure = process.env["SMTP_SECURE"] === "true" || port === 465;
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required for SMTP email provider");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const result = await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    text: body,
  });

  if (!result.messageId) {
    throw new Error("SMTP email send failed");
  }
}

async function sendWithTwilio(to: string, body: string, fromNumber: string) {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for Twilio SMS provider");
  }

  const form = new URLSearchParams({
    To: to,
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

async function sendWithAchek(to: string, body: string, fromNumber: string) {
  const apiKey = process.env["ACHEK_API_KEY"];
  const endpoint = (process.env["ACHEK_API_URL"] ?? "https://api.achek.com.ng").replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("ACHEK_API_KEY is not configured for Achek SMS provider");
  }

  const res = await fetch(`${endpoint}/alerts/send`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber: to,
      message: body,
      senderNumberId: fromNumber,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<unavailable>");
    throw new Error(`Achek notification failed: ${res.status} ${errorText}`);
  }
}

async function sendEmailMessage(to: string, subject: string, body: string, config: EmailProviderConfig) {
  switch (config.provider) {
    case "sendgrid":
      await sendWithSendGrid(to, subject, body, config.fromEmail);
      break;
    case "smtp":
      await sendWithSmtp(to, subject, body, config.fromEmail);
      break;
    case "console":
    default:
      console.info("Email provider fallback: console", { to, subject, body });
  }
}

async function sendSmsMessage(to: string, body: string, config: SmsProviderConfig) {
  switch (config.provider) {
    case "twilio":
      await sendWithTwilio(to, body, config.fromNumber);
      break;
    case "achek":
      await sendWithAchek(to, body, config.fromNumber);
      break;
    case "console":
    default:
      console.info("SMS provider fallback: console", { to, body });
  }
}

function normalizeEmailConfig(value: unknown): EmailProviderConfig {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_EMAIL_CONFIG;
  }
  const provider = (String((value as Record<string, unknown>).provider) as EmailProviderType) || DEFAULT_EMAIL_CONFIG.provider;
  return {
    provider,
    fromEmail: String((value as Record<string, unknown>).fromEmail ?? DEFAULT_EMAIL_CONFIG.fromEmail),
    supportEmail: String((value as Record<string, unknown>).supportEmail ?? DEFAULT_EMAIL_CONFIG.supportEmail),
  };
}

function normalizeSmsConfig(value: unknown): SmsProviderConfig {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_SMS_CONFIG;
  }
  const provider = (String((value as Record<string, unknown>).provider) as SmsProviderType) || DEFAULT_SMS_CONFIG.provider;
  return {
    provider,
    fromNumber: String((value as Record<string, unknown>).fromNumber ?? DEFAULT_SMS_CONFIG.fromNumber),
  };
}

interface EffectiveSettings {
  emailConfig: EmailProviderConfig;
  smsConfig: SmsProviderConfig;
  emailTemplates: Record<string, string>;
  smsTemplates: Record<string, string>;
  appName: string;
  appUrl: string;
  supportEmail: string;
}

async function getEffectiveSettings(): Promise<EffectiveSettings> {
  const settings = await listSettings();
  const emailConfig = normalizeEmailConfig(settings.email_provider);
  return {
    emailConfig,
    smsConfig: normalizeSmsConfig(settings.sms_provider),
    emailTemplates:
      typeof settings.email_templates === "object" && settings.email_templates !== null
        ? (settings.email_templates as Record<string, string>)
        : DEFAULT_EMAIL_TEMPLATES,
    smsTemplates:
      typeof settings.sms_templates === "object" && settings.sms_templates !== null
        ? (settings.sms_templates as Record<string, string>)
        : DEFAULT_SMS_TEMPLATES,
    appName: typeof settings.app_name === "string" ? settings.app_name : DEFAULT_APP_NAME,
    appUrl: typeof settings.app_url === "string" ? settings.app_url : DEFAULT_APP_URL,
    supportEmail: String(settings.email_provider && typeof settings.email_provider === "object"
      ? (settings.email_provider as Record<string, unknown>).supportEmail ?? DEFAULT_SUPPORT_EMAIL
      : DEFAULT_SUPPORT_EMAIL),
  };
}

export async function sendPasswordResetEmail(email: string, fullName: string, token: string) {
  const { emailConfig, emailTemplates, appName, appUrl, supportEmail } = await getEffectiveSettings();
  const templateSubject = emailTemplates.passwordResetSubject ?? DEFAULT_EMAIL_TEMPLATES.passwordResetSubject;
  const templateBody = emailTemplates.passwordResetBody ?? DEFAULT_EMAIL_TEMPLATES.passwordResetBody;
  const resetLink = `${appUrl.replace(/\/$/, "")}/forgot-password?token=${encodeURIComponent(token)}`;
  const body = renderTemplate(templateBody, {
    fullName,
    resetLink,
    supportEmail,
    appUrl,
    appName,
  });
  const subject = renderTemplate(templateSubject, { fullName, resetLink, supportEmail, appUrl, appName });
  await sendEmailMessage(email, subject, body, emailConfig);
}

export async function sendKycStatusNotification(email: string, phone: string | null, fullName: string, status: string) {
  const { emailConfig, smsConfig, emailTemplates, smsTemplates, appName, appUrl, supportEmail } = await getEffectiveSettings();
  const statusKey = status === "verified" ? "Approved" : status === "rejected" ? "Rejected" : "UnderReview";
  const emailSubject = renderTemplate(
    String(emailTemplates[`kyc${statusKey}Subject`]) || DEFAULT_EMAIL_TEMPLATES[`kyc${statusKey}Subject`],
    {
      fullName,
      supportEmail,
      appUrl,
      appName,
    },
  );

  const emailBody = renderTemplate(
    String(emailTemplates[`kyc${statusKey}Body`]) || DEFAULT_EMAIL_TEMPLATES[`kyc${statusKey}Body`],
    {
      fullName,
      supportEmail,
      appUrl,
      appName,
    },
  );

  const smsBody = renderTemplate(
    String(smsTemplates[`kyc${statusKey}`]) || DEFAULT_SMS_TEMPLATES[`kyc${statusKey}`],
    { fullName, appUrl, supportEmail, appName },
  );

  const tasks = [
    sendEmailMessage(email, emailSubject, emailBody, emailConfig),
  ];

  if (phone) {
    tasks.push(sendSmsMessage(phone, smsBody, smsConfig));
  }

  await Promise.all(tasks).catch((err) => {
    console.error("Notification dispatch failed", err);
    throw err;
  });
}
