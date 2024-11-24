// Web2.jsx

import React, { useState, useEffect } from "react";

import {
  ConnectEmbed,
  darkTheme,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
} from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { arbitrum } from "thirdweb/chains";
import { sonicTestnet } from "../../constants/thirdwebChains/sonicTestnet.ts";

import { client } from "./thirdWebClient";
import Style from "./Web2.module.css";

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "discord", "apple", "telegram", "phone"],
    },
    // ** when Bundler & Paymaster are added to Thirdweb - uncomment **
    // accountAbstraction: {
    //   chain: sonicTestnet, // the chain where your smart accounts will be or is deployed
    //   sponsorGas: true, // enable or disable sponsored transactions
    // },
    // ** when Bundler & Paymaster are added to Thirdweb - uncomment **
  }),
];

export default function Web2({ setOpenModel }) {
  const [siweActive, setSiweActive] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const activeAccount = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();

  useEffect(() => {
    if (activeAccount?.address) {
      // Additional logic if needed
    }
  }, [activeAccount]);

  console.log("thirdweb address", activeAccount?.address);
  console.log("thirdweb active chain", activeChain);

  // console.log("wagmi Connected address:", account?.address)

  // Handle the connection event from ConnectEmbed
  useEffect(() => {
    if (wallet) {
      // Trigger SIWE authentication when a thirdweb wallet is connected

      setSiweActive(true);
      if (setOpenModel) setOpenModel(false); // Close modal if setOpenModel is provided
    }
  }, [wallet, setOpenModel]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getEmbedStyles = () => {
    if (windowWidth <= 400) {
      return { width: "20rem", height: "auto" };
    } else if (windowWidth <= 600) {
      return { width: "20rem", height: "auto" };
    } else {
      return { width: "100%", height: "auto" }; // Default size
    }
  };

  return (
    <>
      <ConnectEmbed
        client={client}
        // the chain where your smart accounts will be or is deployed
        chain={arbitrum} // *default chain*
        wallets={wallets}
        theme={darkTheme({
          colors: {
            modalBg: "#1e1e1e",
            accentText: "#e44bca",
            borderColor: "#b078a8",
            separatorLine: "#000000",
          },
        })}
        style={getEmbedStyles()} // Apply dynamic styles based on screen width
      />
    </>
  );
}
