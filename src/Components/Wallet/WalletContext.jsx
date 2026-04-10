// WalletContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  useSwitchActiveWalletChain,
} from "thirdweb/react";
import { sepolia, arbitrum } from "thirdweb/chains";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";
import { getConfig } from "../../utils/constants.js";

// Create the context (exported so balance hooks can optionally read refresh nonce)
export const WalletContext = createContext();

// Provider component
export const WalletProvider = ({ children }) => {
  const client = useThirdwebClient();
  const { address: wagmiAddress, isConnected: wagmiIsConnected } =
    useWagmiAccount(); // Correct usage of useAccount
  const { chain: wagmiChain } = useWagmiNetwork(); // Get Wagmi chain data
  const thirdwebActiveWallet = useActiveWallet(); // Thirdweb wallet active
  const thirdwebActiveAccount = useActiveAccount();
  const thirdWebConnectionStatus = useActiveWalletConnectionStatus(); // Status of thirdweb wallet connection
  const thirdwebChain = useActiveWalletChain(); // Get thirdweb chain data
  const switchThirdwebChain = useSwitchActiveWalletChain();

  /**
   * Thirdweb restores the last chain from localStorage on connect, so changing Web2 to
   * `chain={sepolia}` does not move an existing session off Arbitrum. Once per page load,
   * align the in-app wallet to Sepolia if it connected on another chain; after that,
   * NetworkSwitcher choices are left alone until the next full reload.
   */
  const thirdwebInAppInitialChainHandled = useRef(false);

  console.log(
    "WalletContext thirdwebActiveAccount: ",
    thirdwebActiveAccount?.address,
  );

  const [walletType, setWalletType] = useState(null); // 'wagmi' or 'thirdweb'
  const [chain, setChain] = useState(null); // To store the current chainId
  const [provider, setProvider] = useState(null); // To store the provider
  const [balanceRefreshNonce, setBalanceRefreshNonce] = useState(0);

  const requestBalanceRefresh = useCallback(() => {
    setBalanceRefreshNonce((n) => n + 1);
  }, []);

  const explorerObject = getConfig(chain?.id);
  const explorer = explorerObject?.explorer;

  useEffect(() => {
    // Prefer Thirdweb when both are connected so UI matches the abstracted wallet chain
    // (otherwise MetaMask on Arbitrum "wins" and looks like the app is stuck on 42161).
    if (thirdWebConnectionStatus === "connected" && thirdwebChain) {
      setWalletType("thirdweb");
      setChain(thirdwebChain);
      const thirdwebProvider = ethers6Adapter.provider.toEthers({
        client,
        chain: thirdwebChain,
        account: thirdwebActiveAccount,
      });
      setProvider(thirdwebProvider);
    } else if (wagmiIsConnected) {
      setWalletType("wagmi");
      setChain(wagmiChain);
      setProvider(new ethers.BrowserProvider(window.ethereum));
    } else {
      setWalletType(null);
      setChain(null);
      setProvider(null);
    }
  }, [
    client,
    wagmiIsConnected,
    thirdWebConnectionStatus,
    wagmiChain,
    thirdwebChain,
    thirdwebActiveAccount,
  ]);

  useEffect(() => {
    if (thirdwebInAppInitialChainHandled.current) return;
    if (thirdWebConnectionStatus !== "connected") return;
    if (!thirdwebActiveWallet || !thirdwebChain) return;
    const wid = thirdwebActiveWallet.id;
    if (wid !== "inApp" && wid !== "embedded") {
      thirdwebInAppInitialChainHandled.current = true;
      return;
    }
    thirdwebInAppInitialChainHandled.current = true;
    if (thirdwebChain.id !== arbitrum.id) {
      switchThirdwebChain(arbitrum).catch((err) => {
        console.warn(
          "Could not switch in-app wallet to Sepolia (try disconnect or clear site data):",
          err?.message || err,
        );
      });
    }
  }, [
    thirdWebConnectionStatus,
    thirdwebActiveWallet,
    thirdwebChain,
    switchThirdwebChain,
  ]);

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
        client,
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
        explorer,
        balanceRefreshNonce,
        requestBalanceRefresh,
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
