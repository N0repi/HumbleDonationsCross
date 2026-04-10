// Model.jsx — wagmi connectors + ConnectEmbed; SIWE runs in Wallet/SiweSessionSync (always mounted).

import React from "react";
import Image from "next/image";
import { useConnect } from "wagmi";

import Web2 from "./Web2.jsx";

import Style from "./Model.module.css";
import images from "../../assets";

const connectorIcons = {
  metaMask: images.MetaMask,
  coinbaseWallet: images.CoinBase,
  walletConnect: images.WalletConnect,
  injected: images.Other,
};

const Model = ({ setOpenModel }) => {
  const { connect, connectors, isLoading, pendingConnector } = useConnect();

  const handleConnectorClick = (c) => {
    connect({ connector: c });
    setOpenModel(false);
  };

  const renderedInjected = new Set();
  const filteredConnectors = connectors.filter((c) => {
    if (c.id === "injected") {
      renderedInjected.add("injected");
      return true;
    }
    if (!connectorIcons[c.id] && renderedInjected.has("injected")) {
      return false;
    }
    renderedInjected.add(c.id);
    return true;
  });

  return (
    <div className={Style.Model} onClick={() => setOpenModel(false)}>
      <div
        className={Style.Model_box}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={Style.Model_box_heading}>
          <p>Connect a wallet</p>
        </div>

        <div className={Style.Model_box_wallet}>
          {filteredConnectors.map((c) => (
            <div
              disabled={!c.ready}
              key={c.id}
              onClick={() => handleConnectorClick(c)}
            >
              {!c.ready && " (unsupported)"}
              {isLoading && c.id === pendingConnector?.id && " (connecting)"}
              <div className={Style.Model_box_item}>
                <div className={Style.images}>
                  <Image
                    src={connectorIcons[c.id] || images[c.id] || images.Other}
                    alt={c.name}
                    width={50}
                    height={50}
                  />
                </div>
                <div className={Style.Modal_box_item_name}>{c.name}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={Style.Web2Box}>
          <Web2 setOpenModel={setOpenModel} />
        </div>
        <p className={Style.Model_box_para}>
          Please choose Other if your wallet is not listed.
        </p>
      </div>
    </div>
  );
};

export default Model;
