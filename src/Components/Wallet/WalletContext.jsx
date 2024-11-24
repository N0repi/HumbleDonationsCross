// WalletContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
// ethers
import { ethers } from "ethers";

// wagmi
import {
  useAccount as useWagmiAccount,
  useNetwork as useWagmiNetwork,
} from "wagmi";

// thirdweb
import {
  useActiveWallet,
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useActiveWalletChain,
} from "thirdweb/react";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { client } from "../../Components/Model/thirdWebClient";

// Create the context
const WalletContext = createContext();

// Provider component
export const WalletProvider = ({ children }) => {
  const { address: wagmiAddress, isConnected: wagmiIsConnected } =
    useWagmiAccount(); // Correct usage of useAccount
  const { chain: wagmiChain } = useWagmiNetwork(); // Get Wagmi chain data
  const thirdwebActiveWallet = useActiveWallet(); // Thirdweb wallet active
  const thirdwebActiveAccount = useActiveAccount();
  const thirdWebConnectionStatus = useActiveWalletConnectionStatus(); // Status of thirdweb wallet connection
  const thirdwebChain = useActiveWalletChain(); // Get thirdweb chain data

  console.log(
    "WalletContext thirdwebActiveAccount: ",
    thirdwebActiveAccount?.address
  );

  const [walletType, setWalletType] = useState(null); // 'wagmi' or 'thirdweb'
  const [chain, setChain] = useState(null); // To store the current chainId
  const [provider, setProvider] = useState(null); // To store the provider

  useEffect(() => {
    if (wagmiIsConnected) {
      setWalletType("wagmi");
      setChain(wagmiChain);
      setProvider(new ethers.BrowserProvider(window.ethereum));
    } else if (thirdWebConnectionStatus === "connected") {
      setWalletType("thirdweb");
      setChain(thirdwebChain);
      // Set thirdweb provider using ethers6Adapter
      const thirdwebProvider = ethers6Adapter.provider.toEthers({
        client: client,
        chain: thirdwebChain,
        account: thirdwebActiveAccount,
      });
      setProvider(thirdwebProvider);
    } else {
      setWalletType(null);
      setChain(null);
      setProvider(null);
    }
  }, [wagmiIsConnected, thirdWebConnectionStatus, wagmiChain, thirdwebChain]);

  // Async function to initialize and return the provider
  const getProvider = async () => {
    if (provider) return provider;

    let initializedProvider;

    if (
      walletType === "wagmi" &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      initializedProvider = new ethers.BrowserProvider(window.ethereum);
    } else if (walletType === "thirdweb") {
      initializedProvider = ethers6Adapter.provider.toEthers({
        client: client,
        chain: thirdwebChain,
      });
    }

    setProvider(initializedProvider);
    return initializedProvider;
  };

  return (
    <WalletContext.Provider
      value={{
        walletType,
        wagmiAddress,
        thirdwebActiveWallet,
        thirdwebActiveAccount,
        thirdWebConnectionStatus,
        wagmiIsConnected,
        chain, // ** Have to call chain.id to get chainId **
        provider,
        getProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  return useContext(WalletContext);
};
