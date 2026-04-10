/** Shared helpers for Stripe checkout + HDT quote API routes. */

export function sanitizeArbitrumRpcUrl(url) {
  if (typeof url !== "string") return null;
  const t = url.trim();
  if (t.length < 12 || t.length > 512) return null;
  if (!t.startsWith("https://") && !t.startsWith("http://")) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return t;
  } catch {
    return null;
  }
}

export function netUsdFractionFromEnv() {
  const raw = process.env.STRIPE_HDT_NET_USD_FRACTION;
  if (raw == null || raw === "") return 0.94;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) {
    throw new Error("STRIPE_HDT_NET_USD_FRACTION must be a number in (0, 1]");
  }
  return n;
}
