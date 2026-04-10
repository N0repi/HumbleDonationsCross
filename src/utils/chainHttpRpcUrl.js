/**
 * HTTP(S) JSON-RPC URL from the connected `chain` object in WalletContext
 * (Thirdweb: `chain.rpc`; wagmi/viem: `rpcUrls.default.http[0]`).
 */
export function chainHttpRpcUrl(chain) {
  if (!chain) return "";
  if (typeof chain.rpc === "string") {
    const u = chain.rpc.trim();
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
  }
  const h =
    chain.rpcUrls?.default?.http?.[0] ?? chain.rpcUrls?.public?.http?.[0];
  if (typeof h === "string") {
    const u = h.trim();
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
  }
  return "";
}
