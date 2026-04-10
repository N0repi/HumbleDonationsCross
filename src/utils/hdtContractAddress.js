import { getConfig } from "./constants.js";

/**
 * HDT ERC-20 address used in UI / token lists (may differ from legacy `getConfig(chainId).HDT`,
 * e.g. Sepolia list 0x9707… vs constants 0xA420…). Use for balance polling after Stripe credit.
 */
export function getHdtErc20AddressForChain(chainId) {
  const cfg = getConfig(chainId);
  const list = cfg?.abstractedTokenList;
  if (Array.isArray(list)) {
    const row = list.find(
      (t) =>
        t?.symbol === "HDT" &&
        typeof t.address === "string" &&
        /^0x[a-fA-F0-9]{40}$/.test(t.address),
    );
    if (row?.address) return row.address;
  }
  return cfg?.HDT ?? null;
}
