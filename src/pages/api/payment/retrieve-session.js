import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_PROD);

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "Missing session_id" });
  try {
    const session = await stripe.checkout.sessions.retrieve(
      typeof session_id === "string" ? session_id : session_id[0],
    );
    const networkMeta = session.metadata?.network;
    if (
      networkMeta == null ||
      networkMeta === "" ||
      networkMeta === "undefined" ||
      networkMeta === "null"
    ) {
      return res.status(400).json({
        error:
          "Checkout session is missing a valid network in metadata. Recreate checkout from the app.",
      });
    }

    res.json({
      payment_intent: session.payment_intent,
      walletAddress: session.metadata?.walletAddress ?? null,
      tokenAmount: session.metadata?.tokenAmount ?? null,
      network: String(networkMeta),
      donationFlow: session.metadata?.donationFlow === "1",
      tokenId: session.metadata?.tokenId || "",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
