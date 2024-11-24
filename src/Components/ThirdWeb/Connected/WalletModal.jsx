// WalletModal.jsx

import React, { useState } from "react";
import Style from "./WalletModal.module.css";

import ConnectedWalletFull from "./ConnectedWalletFull";
import ConnectedBalancesAdvanced from "./ConnectedBalancesAdvanced";
import DisconnectButton from "../../Wallet/DisconnectButton";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";

// Buy
import Buy from "../Pay/PayTrad.jsx";
import { client } from "../../Model/thirdWebClient";

// Network Switcher
import NetworkSwitcher from "../../NetworkSwitcher/NetworkSwitcher";

const WalletModal = ({ setOpenWalletModal }) => {
  const [isPayEmbedOpen, setIsPayEmbedOpen] = useState(false);
  const { chain, HDT } = useWallet();
  const { abstractedTokenList } = getConfig(chain?.id);

  const handleClaimClick = async () => {
    setOpenWalletModal(false);
  };

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  const handleBuyClick = () => {
    setIsPayEmbedOpen(true);
  };

  return (
    <div className={Style.Model} onClick={() => setOpenWalletModal(false)}>
      <div className={Style.Model_box} onClick={handleModalContentClick}>
        <div className={Style.horizontalAlignContainer}>
          <div className={Style.radial}></div>
          <div className={Style.addressContainer}>
            <div className={Style.address}>
              <ConnectedWalletFull />
            </div>
          </div>
        </div>

        <div className={Style.SRBparent}>
          <button className={Style.SRBbutton} onClick={handleClaimClick}>
            Send
          </button>
          {/* <button className={Style.SRBbutton} onClick={handleClaimClick}>
            Receive
          </button> */}
          <button className={Style.SRBbutton} onClick={handleBuyClick}>
            Buy
          </button>
          <button className={Style.SRBbutton}>
            <div className={Style.NetworkSwitcher}>
              <NetworkSwitcher />
            </div>
          </button>
        </div>

        <Buy
          client={client}
          isOpen={isPayEmbedOpen}
          onClose={() => setIsPayEmbedOpen(false)}
          chain={chain}
          HDT={HDT}
        />

        <div className={Style.Model_box_item}>
          <ConnectedBalancesAdvanced
            tokens={abstractedTokenList}
            chain={chain}
          />
        </div>
        <div className={Style.Disconnect}>
          <DisconnectButton
            onLogout={() => {
              setOpenWalletModal(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
