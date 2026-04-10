// pages/api/payment/create-checkout-session.js

import Stripe from "stripe";
import {
  netUsdFractionFromEnv,
  sanitizeArbitrumRpcUrl,
} from "../../../lib/server/stripePaymentEnv.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_PROD);

function baseUrl() {
  const u = process.env.NEXT_PUBLIC_BASE_URL;
  if (!u) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  }
  return u.replace(/\/$/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const {
      amountUSD,
      walletAddress,
      tokenAmount: clientTokenAmount,
      network = "arbitrum",
      donationFlow = false,
      tokenId = "",
      arbitrumRpcUrl,
    } = req.body;

    if (!amountUSD || !walletAddress) {
      throw new Error("Missing required payment parameters");
    }

    const amount = Number(amountUSD);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid amountUSD");
    }

    const cents = Math.round(amount * 100);
    if (cents < 50) {
      throw new Error("Amount below Stripe minimum (0.50 USD)");
    }

    const netFrac = netUsdFractionFromEnv();
    let resolvedTokenAmount;
    let usdPerHdtMeta = "";

    if (network === "arbitrum") {
      const pricingRpc =
        process.env.RPC_URL_ARB?.trim() ||
        process.env.ARBITRUM_RPC_URL?.trim() ||
        sanitizeArbitrumRpcUrl(arbitrumRpcUrl);
      if (!pricingRpc) {
        throw new Error(
          "Arbitrum RPC missing: pass arbitrumRpcUrl from chain.rpc (or set RPC_URL_ARB).",
        );
      }
      const { getCheckoutHdtAmount } =
        await import("../../../lib/server/hdtImpliedUsdArbitrum.mjs");
      const { hdtHuman, usdPerHdt } = await getCheckoutHdtAmount({
        chargedUsd: amount,
        netUsdFraction: netFrac,
        rpcUrl: pricingRpc,
      });
      resolvedTokenAmount = hdtHuman
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
      usdPerHdtMeta = usdPerHdt;
    } else {
      if (clientTokenAmount == null) {
        throw new Error("tokenAmount is required for non-Arbitrum checkout");
      }
      resolvedTokenAmount = String(clientTokenAmount);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      metadata: {
        walletAddress,
        amountPaid: String(amount),
        tokenAmount: String(resolvedTokenAmount),
        usdPerHdt: usdPerHdtMeta,
        netUsdFraction: String(netFrac),
        pricingModel: network === "arbitrum" ? "dex-hdt-weth-usdc" : "client",
        network: String(network),
        donationFlow: donationFlow ? "1" : "0",
        tokenId: tokenId != null ? String(tokenId) : "",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Humble Donations — HDT" },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl()}/?stripe_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/`,
    });

    res.json({ sessionId: session.id, sessionUrl: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
}
