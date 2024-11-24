// NetworkSwitcher.jsx

import React, { useState } from "react";
import Image from "next/image";
import images from "../../assets";
import { useSwitchNetwork } from "wagmi";
import { useSwitchActiveWalletChain } from "thirdweb/react";
import { useWallet } from "../../Components/Wallet/WalletContext";

import Style from "./NetworkSwitcher.module.css";

const NetworkSwitcher = () => {
  const { chain, walletType } = useWallet();
  const currentChainId = chain?.id;

  // State to control dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Available networks
  const networks = {
    42161: { name: "Arbitrum", image: images.arbitrum },
    11155111: { name: "Sepolia", image: images.sepolia },
    64165: { name: "Sonic", image: images.sonic },
  };

  // Always call both hooks to maintain consistent order
  const wagmiSwitch = useSwitchNetwork();
  const thirdwebSwitch = useSwitchActiveWalletChain();

  // Determine which hook to use based on `walletType`
  const switchNetwork =
    walletType === "wagmi"
      ? wagmiSwitch.switchNetwork
      : thirdwebSwitch.switchChain;
  const isLoading =
    walletType === "wagmi" ? wagmiSwitch.isLoading : thirdwebSwitch.isSwitching;
  const pendingChainId =
    walletType === "wagmi" ? wagmiSwitch.pendingChainId : null;
  const error =
    walletType === "wagmi" ? wagmiSwitch.error : thirdwebSwitch.error;

  // Toggle dropdown visibility
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        textAlign: "center",
      }}
    >
      {/* Currently connected network */}
      {currentChainId && networks[currentChainId] && (
        <div onClick={toggleDropdown} style={{ cursor: "pointer" }}>
          <Image
            src={networks[currentChainId].image}
            alt={networks[currentChainId].name}
            width={35}
            height={35}
            className={Style.networkImage}
          />
          <div className={Style.networkName}></div>
        </div>
      )}

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className={Style.dropdownMenu}>
          {Object.entries(networks).map(([chainId, { name, image }]) => (
            <button
              key={chainId}
              onClick={() => {
                switchNetwork && switchNetwork(parseInt(chainId));
                setDropdownOpen(false); // Close dropdown after switching
              }}
              disabled={isLoading && pendingChainId === parseInt(chainId)}
              className={`${Style.dropDownItem} ${
                currentChainId === parseInt(chainId)
                  ? Style.dropDownItemActive
                  : ""
              } ${
                isLoading && pendingChainId === parseInt(chainId)
                  ? Style.dropDownItemDisabled
                  : ""
              }`}
            >
              <Image
                src={image}
                alt={name}
                width={30}
                height={30}
                className={Style.networkImage}
              />
              <span>
                {isLoading && pendingChainId === parseInt(chainId)
                  ? `Switching to ${name}...`
                  : name}
                {currentChainId === parseInt(chainId) && " (Active)"}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </div>
  );
};

export default NetworkSwitcher;
