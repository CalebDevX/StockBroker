import { listSettings } from "./settings-service.js";

const SYSTEM_PROMPT = `You are a helpful support assistant for StockBroker NG, a Nigerian Exchange (NGX) brokerage platform.

You help clients with:
- Account setup, registration, and KYC verification (requires BVN and NIN)
- Stock trading on the Nigerian Exchange (NGX)
- Understanding order types: Market (immediate, current price) and Limit (set a max buy / min sell price)
- Order validity: DAY (expires at session close), GTC (Good Till Cancelled), IOC (Immediate or Cancel), FOK (Fill or Kill)
- Portfolio and position queries — direct them to the Portfolio page for live data
- Fund deposits and withdrawals — direct them to the Funds page
- Settlement cycles: NGX settles on T+2 (2 business days after trade)
- CSCS (Central Securities Clearing System) and CHN (Clearing House Number) — needed for settlement
- Brokerage fees: SEC levy, NSE charge, CSCS charge, stamp duty, VAT apply on trades

Rules:
- Be concise, professional, and helpful.
- Keep responses to 2–3 short paragraphs max.
- If you cannot answer specifically (e.g., the user wants their exact balance or order status), direct them to the relevant section of the platform.
- If the issue requires human help (account disputes, compliance matters, failed transactions, complex problems), recommend they click "Talk to an Agent".
- Do NOT make up account-specific data. You don't have access to the user's real-time account data.
- Do NOT discuss competitor platforms or recommend moving funds elsewhere.`;

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

async function getGeminiKey(): Promise<string | null> {
  const envKey = process.env["GEMINI_API_KEY"];
  if (envKey) return envKey;

  try {
    const settings = await listSettings();
    const devKeys = settings["dev_api_keys"] as Record<string, string> | null;
    return devKeys?.["gemini_api_key"] ?? null;
  } catch {
    return null;
  }
}

export async function generateBotReply(
  history: Array<{ role: "user" | "model"; content: string }>,
  userMessage: string,
): Promise<string> {
  const apiKey = await getGeminiKey();

  if (!apiKey) {
    return getFallbackReply(userMessage);
  }

  const contents: GeminiContent[] = [
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.65,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  } catch (err) {
    console.error("Gemini call failed, using fallback:", err);
    return getFallbackReply(userMessage);
  }
}

function getFallbackReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("kyc") || lower.includes("verif") || lower.includes("bvn") || lower.includes("nin")) {
    return "To complete KYC, go to the KYC section and provide your BVN and NIN. Our compliance team reviews submissions within 1–2 business days. KYC Tier 2 is required to start trading.";
  }
  if (lower.includes("deposit") || lower.includes("fund") || lower.includes("top up") || lower.includes("add money")) {
    return "To deposit funds, go to Funds → Deposit, enter the amount and your bank transfer reference. Funds reflect once our operations team confirms the transfer.";
  }
  if (lower.includes("withdraw")) {
    return "To withdraw funds, go to Funds → Withdraw and enter your bank details. Withdrawals are processed within 1–2 business days subject to your daily limit.";
  }
  if (lower.includes("trade") || lower.includes("order") || lower.includes("buy") || lower.includes("sell") || lower.includes("stock")) {
    return "To trade, go to the Trade page and search for a stock symbol. You can place Market orders (execute immediately at current price) or Limit orders (set your target price). KYC Tier 2+ is required.";
  }
  if (lower.includes("password") || lower.includes("login") || lower.includes("sign in") || lower.includes("access")) {
    return "If you're locked out, use the Forgot Password link on the login page. A reset link will be sent to your registered email. If you still can't access your account, please talk to an agent.";
  }
  if (lower.includes("cscs") || lower.includes("chn") || lower.includes("clearing") || lower.includes("settl")) {
    return "NGX trades settle on T+2 (2 business days after the trade date). Your CHN (Clearing House Number) is assigned by CSCS and linked to your brokerage account. Contact support to get your CHN set up.";
  }
  if (lower.includes("fee") || lower.includes("charge") || lower.includes("cost") || lower.includes("commission")) {
    return "Trade fees include: brokerage commission, SEC levy, NSE charge, CSCS charge, stamp duty, and VAT. The exact breakdown is shown on each order confirmation before you submit.";
  }
  if (lower.includes("agent") || lower.includes("human") || lower.includes("person") || lower.includes("speak to") || lower.includes("talk to")) {
    return "Sure! Click the **Talk to an Agent** button below and one of our support agents will attend to you shortly during business hours (Monday–Friday, 8am–5pm WAT).";
  }

  return "Hi! I'm the StockBroker NG support bot. I can help with KYC verification, trading, funds, fees, and general account questions. What would you like to know? If you need to speak with a human agent, click **Talk to an Agent** below.";
}
