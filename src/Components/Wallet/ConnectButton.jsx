// ConnectButton.jsx

// SignInButton.jsx

// siweMessageProfile.jsx

import React, { useEffect, useState } from "react";
import {
  useAccount,
  useNetwork,
  useSignMessage,
  useDisconnect,
  useConnect,
} from "wagmi";
import { SiweMessage } from "siwe";
import Style from "./wagmi-profile.module.css";

// Web2
import {
  useDisconnect as thirdwebDisconnect,
  useActiveWallet,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { signMessage } from "thirdweb/utils";

function SignInButton({ onSuccess, onError }) {
  const [state, setState] = useState({
    loading: false,
    nonce: "",
  });

  const fetchNonce = async () => {
    try {
      const nonceRes = await fetch("/api/auth/nonce");
      const nonce = await nonceRes.text();
      setState((x) => ({ ...x, nonce }));
    } catch (error) {
      setState((x) => ({ ...x, error }));
    }
  };

  useEffect(() => {
    fetchNonce();
  }, []);

  const { address: wagmiAddress } = useAccount();
  const { chain: wagmiChain } = useNetwork();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // thirdweb
  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const { disconnect: thirdwebDisconnectFunction } = thirdwebDisconnect();

  const signIn = async () => {
    try {
      const currentAddress = wagmiAddress || activeAccount?.address;
      const chainId = wagmiChain?.id || activeChain?.id;

      if (!currentAddress || !chainId) return;

      console.log("Signing in with:", currentAddress, "on chain", chainId);

      setState((x) => ({ ...x, loading: true }));
      const message = new SiweMessage({
        domain: "https://humbledonations.com",
        address: currentAddress,
        statement:
          "Signing this message is a security measure to prove that you have access to the wallet you are connecting with.\n\nSigning does not cost any Ether.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: state.nonce,
      });

      let signature;
      if (wagmiAddress) {
        // Use wagmi to sign the message if a wagmi wallet is connected
        signature = await signMessageAsync({
          message: message.prepareMessage(),
        });
      } else if (activeWallet) {
        console.log("activeWallet", activeWallet);
        console.log("activeAccount", activeAccount);
        const activeAccountAddress = activeAccount?.address;
        console.log(activeAccountAddress);
        // Use thirdweb's signMessage if a thirdweb wallet is connected
        const messagePrepareStr = message.prepareMessage().toString();
        console.log("messagePrepareStr", messagePrepareStr);

        signature = await signMessage({
          message: messagePrepareStr,
          account: activeAccount,
        });
      }

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, signature }),
      });
      console.log("signature", signature);
      if (!verifyRes.ok) throw new Error("Error verifying message");

      setState((x) => ({ ...x, loading: false }));
      onSuccess({ address: currentAddress });
    } catch (error) {
      console.error("SIWE error:", error);
      setState((x) => ({ ...x, loading: false, nonce: undefined }));
      onError({ error });
      fetchNonce();
      disconnect(); // Disconnect the wallet if signing fails
      if (activeWallet != null) {
        thirdwebDisconnectFunction(activeWallet);
      }
    }
  };

  useEffect(() => {
    const currentAddress = wagmiAddress || activeAccount?.address;
    if (currentAddress) {
      signIn();
    }
  }, [wagmiAddress, activeAccount?.address]);

  return (
    <div className={Style.connectButton}>
      <button disabled={!state.nonce || state.loading} onClick={signIn}>
        Connect
      </button>
    </div>
  );
}

export default function ConnectButton() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  const { disconnect: thirdwebDisconnectFunction } = thirdwebDisconnect();
  const thirdWebConnectionStatus = useActiveWalletConnectionStatus();
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    const isConnectedStatus =
      wagmiConnected || thirdWebConnectionStatus === "connected";
    setIsWalletConnected(isConnectedStatus);
  }, [wagmiConnected, thirdWebConnectionStatus]);

  const [state, setState] = useState({
    error: undefined,
    loading: false,
    address: undefined,
    siwePromptActive: false,
  });

  const disconnectAll = async () => {
    if (wagmiConnected) {
      disconnect();
    }
    if (activeWallet) {
      try {
        thirdwebDisconnectFunction(activeWallet);
        console.log("Thirdweb wallet disconnected successfully");
      } catch (error) {
        console.error("Error disconnecting thirdweb wallet:", error);
      }
    }
    setState((x) => ({ ...x, address: undefined, siwePromptActive: false }));
  };

  const handleAuthentication = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.address) {
        setState((x) => ({ ...x, address: json.address }));
      } else {
        disconnectAll();
      }
    } catch (_error) {
      disconnectAll();
    }
  };

  useEffect(() => {
    handleAuthentication();
    window.addEventListener("focus", handleAuthentication);
    return () => window.removeEventListener("focus", handleAuthentication);
  }, []);

  useEffect(() => {
    if (isWalletConnected && !state.address) {
      const signInButton = document.querySelector('button[onClick*="signIn"]');
      if (signInButton) signInButton.click();
      setState((x) => ({ ...x, siwePromptActive: true }));
    }
  }, [isWalletConnected, state.address]);

  useEffect(() => {
    const { ethereum } = window;
    if (ethereum) {
      const handleAccountsChanged = () => {
        setState((x) => ({ ...x, address: undefined }));
        handleAuthentication();
      };
      const handleChainChanged = () => {
        setState((x) => ({ ...x, address: undefined }));
        handleAuthentication();
      };
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  useEffect(() => {
    if (state.siwePromptActive) {
      const timer = setTimeout(() => {
        if (state.siwePromptActive && !state.address) {
          disconnectAll();
          setState((x) => ({ ...x, siwePromptActive: false }));
        }
      }, 60000); // 1 minute

      return () => clearTimeout(timer);
    }
  }, [state.siwePromptActive, state.address]);

  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      await fetch("/api/auth/logout", { method: "POST" });
      disconnectAll();
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [disconnect]);

  return (
    <div>
      {isWalletConnected && state.address ? (
        <div></div> // Empty div when wallet is connected and SIWE session exists
      ) : (
        <SignInButton
          onSuccess={({ address }) =>
            setState((x) => ({ ...x, address, siwePromptActive: false }))
          }
          onError={({ error }) =>
            setState((x) => ({ ...x, error, siwePromptActive: false }))
          }
        />
      )}
    </div>
  );
}
