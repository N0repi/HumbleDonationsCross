//ConnectedBalancesAdvanced.jsx

import React, { useEffect } from "react";
import { useBalance, useAccount } from "wagmi";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { useThirdwebClient } from "../../Model/ThirdWebClientProvider";
import Image from "next/image";
import Style from "./ConnectedBalancesAdvanced.module.css";

const formatBalance = (balance) => {
  const parsedBalance = parseFloat(balance);

  if (isNaN(parsedBalance)) {
    return <div>0</div>;
  }

  if (parsedBalance === 0) {
    return "";
  }

  if (parsedBalance >= 1000000) {
    const formattedBalance = (parsedBalance / 1000000).toFixed(
      parsedBalance % 1000000 === 0 ? 0 : 2,
    );
    return `${formattedBalance}M`;
  } else if (parsedBalance >= 10000) {
    const formattedBalance = (parsedBalance / 1000).toFixed(0);
    return `${formattedBalance}K`;
  }

  return parsedBalance.toFixed(3);
};

function TokenBalanceRow({
  token,
  chain,
  client,
  wagmiAddress,
  activeAccountAddress,
  balanceRefreshNonce,
}) {
  const {
    data: tokenBalance,
    isError: isWagmiError,
    isLoading: isWagmiLoading,
    refetch: refetchWagmi,
  } = useBalance({
    address: wagmiAddress,
    token: token.address,
    watch: true,
  });

  const {
    data: balance,
    isError: isThirdwebError,
    isLoading: isThirdwebLoading,
    refetch: refetchThirdweb,
  } = useWalletBalance({
    client,
    chain: chain,
    address: activeAccountAddress,
    tokenAddress: token.address,
  });

  useEffect(() => {
    if (!balanceRefreshNonce) return;
    if (wagmiAddress) {
      refetchWagmi?.();
      return;
    }
    if (activeAccountAddress) {
      refetchThirdweb?.();
    }
  }, [
    balanceRefreshNonce,
    wagmiAddress,
    activeAccountAddress,
    refetchWagmi,
    refetchThirdweb,
  ]);

  const finalBalance = wagmiAddress ? tokenBalance : balance;
  const isError = wagmiAddress ? isWagmiError : isThirdwebError;
  const isLoading = wagmiAddress ? isWagmiLoading : isThirdwebLoading;

  if (isError)
    return <p>Error fetching balance for {token.symbol}</p>;
  if (isLoading)
    return <p>Loading balance for {token.symbol}...</p>;

  const formattedBalance = wagmiAddress
    ? `${finalBalance?.formatted} ${token.symbol}`
    : `${finalBalance?.displayValue} ${token.symbol}`;

  return (
    <div className={Style.tokenItem}>
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
}

export default function ConnectedBalancesAdvanced({
  tokens,
  chain,
  balanceRefreshNonce = 0,
}) {
  const client = useThirdwebClient();
  const { address: wagmiAddress } = useAccount();
  const activeAccount = useActiveAccount();
  const activeAccountAddress = activeAccount?.address;

  if (!Array.isArray(tokens)) {
    return <p>Error: tokens is not an array</p>;
  }

  return (
    <div className={Style.tokenListContainer}>
      {tokens.map((token, index) => (
        <TokenBalanceRow
          key={token.address ?? index}
          token={token}
          chain={chain}
          client={client}
          wagmiAddress={wagmiAddress}
          activeAccountAddress={activeAccountAddress}
          balanceRefreshNonce={balanceRefreshNonce}
        />
      ))}
    </div>
  );
}
