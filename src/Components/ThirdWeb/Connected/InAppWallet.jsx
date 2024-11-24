// InAppWallet.jsx

import React from "react";
import Style from "./InAppWallet.module.css";

import ConnectedWallet from "./ConnectedWallet.jsx";
import HumbleDonationsBalance from "./ConnectedBalances.jsx";
import ConnectButton from "../../Wallet/ConnectButton.jsx";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";

export default function InAppWallet({ setOpenModel, handleInAppWalletClick }) {
  const {
    walletType,
    wagmiAddress,
    thirdWebConnectionStatus,
    wagmiIsConnected,
    chain,
  } = useWallet();

  const isWalletConnected =
    walletType &&
    (wagmiIsConnected || thirdWebConnectionStatus === "connected");

  const handleClick = () => {
    if (isWalletConnected) {
      handleInAppWalletClick(); // Open wallet modal if wallet is connected
    } else {
      setOpenModel(true); // Open connect modal if wallet is not connected
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

  console.log("InAppWallet chain  -  ", chain);

  return (
    <div className={Style.Parent} onClick={handleClick}>
      <div className={Style.glassBackground}>
        <div className={Style.radial}></div>
        <div className={Style.right}>
          <ConnectButton />
          {isWalletConnected && (
            <>
              <div className={Style.address}>
                <ConnectedWallet />
              </div>
              <div className={Style.HDTbalance}>
                <HumbleDonationsBalance
                  tokens={HumbleDonationsToken}
                  chain={chain}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
