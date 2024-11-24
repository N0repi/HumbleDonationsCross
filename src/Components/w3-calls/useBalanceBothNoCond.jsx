// useBalanceBoth.jsx

import { useBalance, useAccount } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { client } from "../Model/thirdWebClient";

function conditionalBalance(TokenOne, chain) {
  const { address: wagmiAddress } = useAccount();
  const activeAccount = useActiveAccount();

  const addressToUse = wagmiAddress || activeAccount?.address;
  const TokenOneAddr = TokenOne.address;

  // Use wagmi balance hook
  const {
    data: tokenBalance,
    isError: isWagmiError,
    isLoading: isWagmiLoading,
  } = useBalance({
    address: wagmiAddress,
    token: TokenOneAddr,
    watch: true,
  });

  // Use thirdweb balance hook if no wagmi address
  const {
    data: balance,
    isError: isThirdwebError,
    isLoading: isThirdwebLoading,
  } = useWalletBalance({
    client,
    chain: chain,
    address: activeAccount?.address,
    tokenAddress: TokenOneAddr,
  });

  // Determine which hook to use based on availability
  const finalBalance = wagmiAddress ? tokenBalance : balance;
  const isError = wagmiAddress ? isWagmiError : isThirdwebError;
  const isLoading = wagmiAddress ? isWagmiLoading : isThirdwebLoading;

  if (isError) return <p>Error while fetching balances</p>;
  if (isLoading) return <p>Loading balances...</p>;

  // Return the formatted balance based on the active hook
  return wagmiAddress ? finalBalance?.formatted : finalBalance?.displayValue;
}

export default conditionalBalance;
