/**
 * Trading Mode — controls whether orders route to the real NGX ATS (live)
 * or the local demo simulator (demo).
 *
 * Default: demo
 * Set TRADING_MODE=live in env to start in live mode.
 * Call setMode() at runtime via POST /api/admin/mode to hot-switch.
 */

export type TradingMode = "demo" | "live";

let _runtimeOverride: TradingMode | null = null;

export function getMode(): TradingMode {
  if (_runtimeOverride !== null) return _runtimeOverride;
  const env = (process.env["TRADING_MODE"] ?? "demo").toLowerCase();
  return env === "live" ? "live" : "demo";
}

export function setMode(m: TradingMode): void {
  _runtimeOverride = m;
}

export function isLive(): boolean { return getMode() === "live"; }
export function isDemo(): boolean { return getMode() === "demo"; }
