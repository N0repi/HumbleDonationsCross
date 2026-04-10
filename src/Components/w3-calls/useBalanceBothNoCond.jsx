// useBalanceBothNoCond.jsx — single hook; call once per component (Rules of Hooks).

import { useContext, useEffect, useMemo } from "react";
import { useBalance, useAccount } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";
import { WalletContext } from "../Wallet/WalletContext";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function isNativeTokenAddress(addr) {
  if (addr == null || addr === "") return false;
  return String(addr).toLowerCase() === ZERO_ADDR;
}

/**
 * Wagmi + thirdweb balance for one token. Always runs the same hooks (Stripe USD / missing token skips queries).
 * @returns {{ skip: boolean, displayValue: string | null, formatted: string | null, maxAmount: string, isLoading: boolean, isError: boolean, numericBalance: number | null }}
 */
export function useConditionalTokenBalance(token, chain) {
  const client = useThirdwebClient();
  const walletCtx = useContext(WalletContext);
  const balanceRefreshNonce = walletCtx?.balanceRefreshNonce ?? 0;
  const walletType = walletCtx?.walletType;

  const { address: wagmiAddress } = useAccount();
  const activeAccount = useActiveAccount();

  const isNative = isNativeTokenAddress(token?.address);
  /** Native uses zero address in UI; must not call ERC-20 balanceOf on it. */
  const skipBalance =
    Boolean(token?.isStripeUsd) ||
    !token ||
    (!isNative && (!token.address || isNativeTokenAddress(token.address)));

  const wagmiEnabled = useMemo(
    () => !skipBalance && Boolean(wagmiAddress),
    [skipBalance, wagmiAddress],
  );

  const twEnabled = useMemo(
    () =>
      !skipBalance &&
      Boolean(activeAccount?.address && chain && client),
    [skipBalance, activeAccount?.address, chain, client],
  );

  const wagmiTokenAddress =
    skipBalance || isNative ? undefined : token.address;

  const twTokenAddress =
    skipBalance || isNative ? undefined : token.address;

  const {
    data: tokenBalance,
    isError: isWagmiError,
    isLoading: isWagmiLoading,
    refetch: refetchWagmi,
  } = useBalance({
    address: wagmiAddress,
    token: wagmiTokenAddress,
    watch: wagmiEnabled,
    enabled: wagmiEnabled,
  });

  const {
    data: twBalance,
    isError: isTwError,
    isLoading: isTwLoading,
    refetch: refetchThirdweb,
  } = useWalletBalance(
    {
      client,
      chain,
      address: skipBalance ? undefined : activeAccount?.address,
      tokenAddress: twTokenAddress,
    },
    { enabled: twEnabled },
  );

  useEffect(() => {
    if (!balanceRefreshNonce) return;
    if (walletType === "thirdweb" && activeAccount?.address && twEnabled) {
      refetchThirdweb?.();
      return;
    }
    if (wagmiAddress && wagmiEnabled) {
      refetchWagmi?.();
      return;
    }
    if (activeAccount?.address && twEnabled) {
      refetchThirdweb?.();
    }
  }, [
    balanceRefreshNonce,
    walletType,
    wagmiAddress,
    activeAccount?.address,
    wagmiEnabled,
    twEnabled,
    refetchWagmi,
    refetchThirdweb,
  ]);

  if (skipBalance) {
    return {
      skip: true,
      displayValue: "—",
      formatted: "—",
      maxAmount: "",
      isLoading: false,
      isError: false,
      numericBalance: null,
    };
  }

  /* Prefer the active wallet stack: thirdweb users were reading wagmi balance if MetaMask left an address set. */
  if (walletType === "thirdweb" && activeAccount?.address) {
    const dv = twBalance?.displayValue ?? null;
    return {
      skip: false,
      displayValue: dv,
      formatted: dv,
      maxAmount: dv ?? "",
      isLoading: isTwLoading,
      isError: isTwError,
      numericBalance:
        dv != null && dv !== "" && Number.isFinite(parseFloat(dv))
          ? parseFloat(dv)
          : null,
    };
  }

  if (wagmiAddress) {
    const formatted = tokenBalance?.formatted ?? null;
    return {
      skip: false,
      displayValue: formatted,
      formatted,
      maxAmount: formatted ?? "",
      isLoading: isWagmiLoading,
      isError: isWagmiError,
      numericBalance:
        formatted != null && formatted !== "" && Number.isFinite(parseFloat(formatted))
          ? parseFloat(formatted)
          : null,
    };
  }

  const dv = twBalance?.displayValue ?? null;
  return {
    skip: false,
    displayValue: dv,
    formatted: dv,
    maxAmount: dv ?? "",
    isLoading: isTwLoading,
    isError: isTwError,
    numericBalance:
      dv != null && dv !== "" && Number.isFinite(parseFloat(dv))
        ? parseFloat(dv)
        : null,
  };
}

export default useConditionalTokenBalance;
