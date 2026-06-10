import { listSettings } from "./settings-service.js";

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface GoogleProfile {
  sub:            string;
  email:          string;
  name:           string;
  picture:        string;
  email_verified: boolean;
}

export async function getGoogleCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (clientId && clientSecret) return { clientId, clientSecret };

  const settings = await listSettings();
  const devKeys  = (settings.dev_api_keys ?? {}) as Record<string, string>;
  return {
    clientId:     devKeys.google_client_id     ?? "",
    clientSecret: devKeys.google_client_secret ?? "",
  };
}

export function buildGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "openid email profile",
    state,
    access_type:   "offline",
    prompt:        "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user profile");
  return res.json() as Promise<GoogleProfile>;
}
