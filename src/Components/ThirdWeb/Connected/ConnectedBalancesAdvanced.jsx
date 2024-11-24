//ConnectedBalancesAdvanced.jsx

import { useBalance, useAccount } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { client } from "../../Model/thirdWebClient";
import Image from "next/image";
import Style from "./ConnectedBalancesAdvanced.module.css"; // Ensure you have a CSS file for styling

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

export default function ConnectedBalancesAdvanced({ tokens, chain }) {
  const { address: wagmiAddress } = useAccount();
  const activeAccount = useActiveAccount();

  if (!Array.isArray(tokens)) {
    return <p>Error: tokens is not an array</p>;
  }

  return (
    <div className={Style.tokenListContainer}>
      {tokens.map((token, index) => {
        // Use wagmi balance hook
        const {
          data: tokenBalance,
          isError: isWagmiError,
          isLoading: isWagmiLoading,
        } = useBalance({
          address: wagmiAddress,
          token: token.address,
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
          tokenAddress: token.address,
        });

        // Determine which hook to use based on availability
        const finalBalance = wagmiAddress ? tokenBalance : balance;
        const isError = wagmiAddress ? isWagmiError : isThirdwebError;
        const isLoading = wagmiAddress ? isWagmiLoading : isThirdwebLoading;

        if (isError)
          return <p key={index}>Error fetching balance for {token.symbol}</p>;
        if (isLoading)
          return <p key={index}>Loading balance for {token.symbol}...</p>;

        // Return the formatted balance based on the active hook
        const formattedBalance = wagmiAddress
          ? `${finalBalance?.formatted} ${token.symbol}`
          : `${finalBalance?.displayValue} ${token.symbol}`;

        return (
          <div key={index} className={Style.tokenItem}>
            <Image
              src={token.img || "/default-token-image.png"}
              alt={`${token.name} logo`}
              width={25}
              height={25}
              className={Style.tokenImage}
            />
            <div className={Style.tokenInfoBalance}>
              <div className={Style.tokenInfo}>
                <div className={Style.tokenName}>{token.name}</div>
                <div className={Style.balanceAndSymbolContainer}>
                  <div className={Style.Balances}>
                    {formatBalance(formattedBalance)}
                  </div>
                  <div className={Style.tokenSymbol}>{token.symbol}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
