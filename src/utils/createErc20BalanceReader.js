import { ethers } from "ethers";
import { getContract } from "thirdweb";
import { balanceOf } from "thirdweb/extensions/erc20";
import { chainHttpRpcUrl } from "./chainHttpRpcUrl.js";

const ERC20_BALANCE_ABI = ["function balanceOf(address) view returns (uint256)"];

/**
 * Returns an async () => bigint that reads ERC20 balance using the same sources
 * as the rest of the app — no hardcoded RPC URLs:
 *
 * 1. Thirdweb in-app / embedded wallet: `balanceOf` from thirdweb/extensions/erc20
 *    (same family as useWalletBalance — see portal.thirdweb.com ERC20.balanceOf).
 * 2. Else HTTP URL from `chain` (`chain.rpc` or viem rpcUrls) via chainHttpRpcUrl.
 * 3. Else wallet `provider` (e.g. wagmi BrowserProvider).
 */
export function createErc20BalanceReader({
  walletType,
  client,
  chain,
  provider,
  tokenAddress,
  walletAddress,
}) {
  return async () => {
    if (walletType === "thirdweb" && client && chain) {
      const contract = getContract({
        client,
        chain,
        address: tokenAddress,
      });
      return balanceOf({
        contract,
        address: walletAddress,
      });
    }

    const rpc = chainHttpRpcUrl(chain);
    if (rpc) {
      const p = new ethers.JsonRpcProvider(rpc);
      const erc20 = new ethers.Contract(tokenAddress, ERC20_BALANCE_ABI, p);
      return erc20.balanceOf(walletAddress);
    }

    if (provider) {
      const erc20 = new ethers.Contract(tokenAddress, ERC20_BALANCE_ABI, provider);
      return erc20.balanceOf(walletAddress);
    }

    throw new Error(
      "createErc20BalanceReader: need thirdweb client+chain, chain HTTP RPC, or provider",
    );
  };
}
