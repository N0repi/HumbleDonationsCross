// Public Thirdweb client id (server-only env preferred; falls back to NEXT_PUBLIC_*)

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const clientId =
    process.env.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      message:
        "Missing THIRDWEB_CLIENT_ID or NEXT_PUBLIC_CLIENT_ID environment variable",
    });
  }

  res.status(200).json({ clientId });
}
