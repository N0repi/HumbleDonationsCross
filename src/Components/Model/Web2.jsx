// Web2.jsx — ConnectEmbed; client from ThirdwebClientProvider (wispi workflow).

import React, { useState, useEffect, useMemo } from "react";

import { ConnectEmbed, darkTheme, useActiveWallet } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { arbitrum, sepolia } from "thirdweb/chains";

import { useThirdwebClient } from "./ThirdWebClientProvider";
import { sonicMainnet } from "../../constants/thirdwebChains/sonicMainnet";

/** Default + smart-account home chain (sponsored gas is per-chain). */
const smartAccountChain = arbitrum;

const supportedChains = [sepolia, arbitrum, sonicMainnet];

export default function Web2({ setOpenModel }) {
  const client = useThirdwebClient();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const wallet = useActiveWallet();

  const wallets = useMemo(
    () => [
      inAppWallet({
        auth: {
          options: ["google", "discord", "apple", "telegram", "phone"],
        },
        smartAccount: {
          chain: smartAccountChain,
          sponsorGas: true,
        },
      }),
    ],
    [],
  );

  useEffect(() => {
    if (wallet) {
      if (setOpenModel) setOpenModel(false);
    }
  }, [wallet, setOpenModel]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getEmbedStyles = () => {
    if (windowWidth <= 400) return { width: "20rem", height: "auto" };
    if (windowWidth <= 600) return { width: "20rem", height: "auto" };
    return { width: "100%", height: "auto" };
  };

  return (
    <ConnectEmbed
      client={client}
      chain={smartAccountChain}
      chains={supportedChains}
      autoConnect={false}
      wallets={wallets}
      theme={darkTheme({
        colors: {
          modalBg: "#1e1e1e",
          accentText: "#e44bca",
          borderColor: "#b078a8",
          separatorLine: "#000000",
        },
      })}
      style={getEmbedStyles()}
    />
  );
}
