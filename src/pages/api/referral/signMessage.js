// pages/api/signMessage.js

import { safeSignMessage } from "../../../lib/referral/signMessage";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { provider, checkMatches } = req.body;

    if (!checkMatches || !Array.isArray(checkMatches)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const signatures = await safeSignMessage(provider, checkMatches);

    res.status(200).json({ signatures });
  } catch (error) {
    console.error("Error in signMessage API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
