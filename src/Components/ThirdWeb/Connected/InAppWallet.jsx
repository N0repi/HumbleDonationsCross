// InAppWallet.jsx

import React from "react";
import Style from "./InAppWallet.module.css";

import ConnectedWallet from "./ConnectedWallet.jsx";
import HumbleDonationsBalance from "./ConnectedBalances.jsx";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";

export default function InAppWallet({ setOpenModel, handleInAppWalletClick }) {
  const {
    walletType,
    thirdWebConnectionStatus,
    wagmiIsConnected,
    chain,
  } = useWallet();

  const isWalletConnected =
    walletType &&
    (wagmiIsConnected || thirdWebConnectionStatus === "connected");

  const handleClick = () => {
    if (isWalletConnected) {
      handleInAppWalletClick();
    } else {
      setOpenModel(true);
    }
  };

  const { HDT } = getConfig(chain?.id);
  const HumbleDonationsToken = {
    name: "Humble Donations Token",
    image:
      "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmYGjZoQAHzhqwJhFhxvpZ3ijEFZAgqWKNtg4RiyK7GBue",
    symbol: "HDT",
    address: HDT,
    decimals: 18,
    chainId: chain?.id,
  };

  return (
    <div
      className={Style.walletParent}
      data-tour="walletParent"
      role="button"
      tabIndex={0}
      aria-label={isWalletConnected ? "Open wallet" : "Log in"}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        className={`${Style.glassBackground} ${
          isWalletConnected ? Style.glassConnected : Style.glassLogin
        }`}
      >
        {!isWalletConnected ? (
          <>
            <span className={Style.radial} aria-hidden />
            <span className={Style.loginLabel}>Log in</span>
          </>
        ) : (
          <>
            <span className={Style.radialCompact} aria-hidden />
            <div className={Style.right}>
              <div className={Style.address}>
                <ConnectedWallet />
              </div>
              <div className={Style.HDTbalance}>
                <HumbleDonationsBalance
                  tokens={HumbleDonationsToken}
                  chain={chain}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
