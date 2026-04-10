/** Fixed USD amounts for “Buy HDT” card tiers (HDT quantity comes from live implied USD on Arbitrum). */
export const USD_TIER_PRICES = [4.99, 9.99, 19.99, 49.99];

/**
 * Sepolia: checkout still requires client `tokenAmount`; static approximations for display + submit.
 * Mainnet Arbitrum uses `/api/payment/hdt-quote-tiers` + server-side create-checkout pricing instead.
 */
export const sepoliaStripeHdtTiers = USD_TIER_PRICES.map((price, i) => ({
  price,
  hdt: [50, 110, 240, 650][i],
}));
