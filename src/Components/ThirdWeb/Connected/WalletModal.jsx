// WalletModal.jsx

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import Style from "./WalletModal.module.css";

import ConnectedWalletFull from "./ConnectedWalletFull";
import ConnectedBalancesAdvanced from "./ConnectedBalancesAdvanced";
import DisconnectButton from "../../Wallet/DisconnectButton";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";

// Buy (Stripe → Chainlink → Treasury HDT)
import StripeBuyHdt from "../Pay/StripeBuyHdt.jsx";
// Send
import Send from "../Pay/Send";

// Network Switcher
import NetworkSwitcher from "../../NetworkSwitcher/NetworkSwitcher";

/** Match `.modelBoxExiting` / `.modelOverlayExiting` duration in WalletModal.module.css */
const EXIT_ANIM_MS = 260;

const WalletModal = ({ isOpen, onClose }) => {
  const [isStripeBuyOpen, setIsStripeBuyOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [displayed, setDisplayed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { chain, requestBalanceRefresh, balanceRefreshNonce } = useWallet();

  const { abstractedTokenList } = getConfig(chain?.id);

  useEffect(() => {
    requestBalanceRefresh?.();
  }, [requestBalanceRefresh]);

  useLayoutEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      setExiting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && displayed && !exiting) {
      setExiting(true);
    }
  }, [isOpen, displayed, exiting]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => {
      setExiting(false);
      setDisplayed(false);
      onCloseRef.current?.();
    }, EXIT_ANIM_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  const beginExit = useCallback(() => {
    setExiting(true);
  }, []);

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  const handleBuyClick = () => {
    setIsStripeBuyOpen(true);
  };
  const handleSendClick = () => {
    setSendOpen(true);
  };

  if (!displayed) return null;

  return (
    <div
      className={`${Style.Model} ${exiting ? Style.modelOverlayExiting : Style.modelOverlayEnter}`}
      onClick={beginExit}
    >
      <div
        className={`${Style.Model_box} ${exiting ? Style.modelBoxExiting : Style.modelBoxEnter}`}
        onClick={handleModalContentClick}
      >
        <div className={Style.horizontalAlignContainer}>
          <div className={Style.radial}></div>
          <div className={Style.addressContainer}>
            <div className={Style.address}>
              <ConnectedWalletFull />
            </div>
          </div>
        </div>

        <div className={Style.SRBparent}>
          <button className={Style.SRBbutton} onClick={handleSendClick}>
            Send
          </button>
          <button className={Style.SRBbutton} onClick={handleBuyClick}>
            Buy
          </button>
          <div
            className={Style.SRBbutton}
            role="group"
            aria-label="Switch network"
          >
            <div className={Style.NetworkSwitcher}>
              <NetworkSwitcher />
            </div>
          </div>
        </div>

        <Send isOpen={sendOpen} onClose={() => setSendOpen(false)} />
        <StripeBuyHdt
          isOpen={isStripeBuyOpen}
          onClose={() => setIsStripeBuyOpen(false)}
        />

        <div className={Style.Model_box_item}>
          <ConnectedBalancesAdvanced
            tokens={abstractedTokenList}
            chain={chain}
            balanceRefreshNonce={balanceRefreshNonce}
          />
        </div>
        <div className={Style.Disconnect}>
          <DisconnectButton onLogout={beginExit} />
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
