// NetworkSwitcher.jsx

import React, { useState } from "react";
import Image from "next/image";
import images from "../../assets";
import { useSwitchNetwork } from "wagmi";
import { useSwitchActiveWalletChain } from "thirdweb/react";
import { useWallet } from "../../Components/Wallet/WalletContext";
import { arbitrum, sepolia } from "thirdweb/chains";
import { sonicTestnet } from "../../constants/thirdwebChains/sonicTestnet.ts";

import Style from "./NetworkSwitcher.module.css";

const NetworkSwitcher = () => {
  const { chain, walletType } = useWallet();
  const currentChainId = chain?.id;

  // State to control dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Available networks
  const networks = {
    42161: { name: "Arbitrum", image: images.arbitrum, chain: arbitrum },
    11155111: { name: "Sepolia", image: images.sepolia, chain: sepolia },
    64165: { name: "Sonic", image: images.sonic, chain: sonicTestnet },
  };

  const wagmiSwitch = useSwitchNetwork();
  const thirdwebSwitch = useSwitchActiveWalletChain();

  const isLoading =
    walletType === "wagmi" ? wagmiSwitch.isLoading : thirdwebSwitch.isSwitching;
  const pendingChainId =
    walletType === "wagmi" ? wagmiSwitch.pendingChainId : null;
  const error =
    walletType === "wagmi" ? wagmiSwitch.error : thirdwebSwitch.error;

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleSwitchNetwork = async (chainId) => {
    try {
      if (walletType === "thirdweb") {
        const chain = networks[chainId]?.chain;
        if (!chain) {
          console.error("Invalid chain object for Thirdweb.");
          return;
        }
        await thirdwebSwitch(chain); // Call the function with the chain object
      } else if (walletType === "wagmi") {
        if (!wagmiSwitch.switchNetwork) {
          console.error("switchNetwork function is undefined.");
          return;
        }
        await wagmiSwitch.switchNetwork(parseInt(chainId)); // Call Wagmi's switchNetwork
      }
      setDropdownOpen(false); // Close dropdown after success
    } catch (err) {
      console.error("Failed to switch network:", err.message);
    }
  };
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        textAlign: "center",
      }}
    >
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

      {dropdownOpen && (
        <div className={Style.dropdownMenu}>
          {Object.entries(networks).map(([chainId, { name, image }]) => (
            <button
              key={chainId}
              onClick={() => handleSwitchNetwork(chainId)}
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
