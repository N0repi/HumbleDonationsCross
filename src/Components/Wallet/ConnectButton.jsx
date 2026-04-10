// Session + layout only — SIWE runs from Model.jsx (wispi BackupsPorjects workflow).

import React, { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import Style from "./wagmi-profile.module.css";
import {
  useDisconnect as thirdwebDisconnect,
  useActiveWallet,
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

function SignInButton() {
  return <div className={Style.connectButton} />;
}

export default function ConnectButton() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect: thirdwebDisconnectFunction } = thirdwebDisconnect();
  const thirdWebConnectionStatus = useActiveWalletConnectionStatus();

  const [sessionExists, setSessionExists] = useState(false);

  const isWalletConnected =
    wagmiConnected || thirdWebConnectionStatus === "connected";
  const currentAddress = wagmiAddress || activeAccount?.address;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        const json = await res.json();
        setSessionExists(!!json.address);
      } catch {
        setSessionExists(false);
      }
    };

    if (currentAddress) {
      checkSession();
    } else {
      setSessionExists(false);
    }
  }, [currentAddress]);

  const disconnectAll = async () => {
    if (wagmiConnected) disconnect();
    if (activeWallet) {
      try {
        thirdwebDisconnectFunction(activeWallet);
      } catch (error) {
        console.error("Error disconnecting thirdweb wallet:", error);
      }
    }
    setSessionExists(false);
  };

  useEffect(() => {
    const { ethereum } = window;
    if (ethereum) {
      const handleAccountsChanged = () => setSessionExists(false);
      const handleChainChanged = () => setSessionExists(false);

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      disconnectAll();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (isWalletConnected && sessionExists) {
    return <div className={Style.disconnectButton} />;
  }

  return <SignInButton />;
}
