/**
 * Preview HDT amounts for fixed USD tiers using the same pricing as create-checkout-session
 * (Uniswap V3 HDT → WETH → USDC, net STRIPE_HDT_NET_USD_FRACTION).
 */

import { getHdtToUsdcViaWeth, hdtForChargedUsd } from "../../../lib/server/hdtImpliedUsdArbitrum.mjs";
import {
  netUsdFractionFromEnv,
  sanitizeArbitrumRpcUrl,
} from "../../../lib/server/stripePaymentEnv.js";
import { USD_TIER_PRICES } from "../../../utils/stripeHdtTiers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { arbitrumRpcUrl } = req.body || {};

    const pricingRpc =
      process.env.RPC_URL_ARB?.trim() ||
      process.env.ARBITRUM_RPC_URL?.trim() ||
      sanitizeArbitrumRpcUrl(arbitrumRpcUrl);
    if (!pricingRpc) {
      return res.status(400).json({
        error:
          "Arbitrum RPC missing: pass arbitrumRpcUrl from the client or set RPC_URL_ARB.",
      });
    }

    const { usdcOutPer1Hdt, usdPerHdt } = await getHdtToUsdcViaWeth(pricingRpc);
    const netFrac = netUsdFractionFromEnv();

    const tiers = USD_TIER_PRICES.map((priceUsd) => {
      const { hdtHuman, hdtWei } = hdtForChargedUsd({
        chargedUsd: priceUsd,
        usdcOutPer1Hdt,
        netUsdFraction: netFrac,
      });
      return {
        priceUsd,
        usdPerHdt,
        hdtHuman,
        hdtWei: hdtWei.toString(),
      };
    });

    res.json({
      netUsdFraction: netFrac,
      usdPerHdt,
      tiers,
    });
  } catch (error) {
    console.error("hdt-quote-tiers:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
}
