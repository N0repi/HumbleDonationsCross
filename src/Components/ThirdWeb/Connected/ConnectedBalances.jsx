// ConnectedBalances.jsx

import { useBalance, useAccount } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { client } from "../../Model/thirdWebClient";

const formatBalance = (balance) => {
  const parsedBalance = parseFloat(balance);

  if (isNaN(parsedBalance)) {
    return <div>0</div>; // Handle the case where balance is not a valid number
  }

  if (parsedBalance === 0) {
    return ""; // Handle the case where balance is zero
  }

  // Denote 1 million as 'M'
  if (parsedBalance >= 1000000) {
    const formattedBalance = (parsedBalance / 1000000).toFixed(
      parsedBalance % 1000000 === 0 ? 0 : 2
    );
    return `${formattedBalance}M`;
  } else if (parsedBalance >= 10000) {
    const formattedBalance = (parsedBalance / 1000).toFixed(0);
    return `${formattedBalance}K`;
  }

  return parsedBalance.toFixed(3);
};

export default function HumbleDonationsBalance({ tokens, chain }) {
  const { address: wagmiAddress } = useAccount();
  const activeAccount = useActiveAccount();

  console.log("HumbleDonationsBalance  chain  -  ", chain);
  // const tokenAddress = "0x033b82aB3ba626cCCad412a2532897Af82890C72"
  const tokenPassed = tokens.address;

  // Use wagmi balance hook
  const {
    data: tokenBalance,
    isError: isWagmiError,
    isLoading: isWagmiLoading,
  } = useBalance({
    address: wagmiAddress,
    token: tokenPassed,
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
    tokenAddress: tokenPassed,
  });

  // Determine which hook to use based on availability
  const finalBalance = wagmiAddress ? tokenBalance : balance;
  const isError = wagmiAddress ? isWagmiError : isThirdwebError;
  const isLoading = wagmiAddress ? isWagmiLoading : isThirdwebLoading;

  if (isError) return <p>Error while fetching balances</p>;
  if (isLoading) return <p>Loading balances...</p>;

  // Return the formatted balance based on the active hook
  const formattedBalances = wagmiAddress
    ? finalBalance?.formatted
    : finalBalance?.displayValue;
  return formatBalance(formattedBalances) + " HDT";
}
