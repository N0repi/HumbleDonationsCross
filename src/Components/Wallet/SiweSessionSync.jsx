/**
 * Runs SIWE after wallet connect. Must live outside the connect modal: Header uses
 * `{openModel && <Model />}` and Model calls setOpenModel(false) on connect, which
 * unmounted Model before wagmi finished connecting — so EOA never reached signMessage.
 */
import { useEffect, useCallback, useRef } from "react";
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWallet,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { signMessage as thirdwebSignMessage } from "thirdweb/utils";
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";

function getSiweDomain() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SIWE_DOMAIN) {
    return process.env.NEXT_PUBLIC_SIWE_DOMAIN;
  }
  return "https://humbledonations.com";
}

const SIWE_STATEMENT =
  "Signing this message is a security measure to prove that you have access to the wallet you are connecting with.\n\nSigning does not cost any Ether.";

function siweVerbose() {
  if (typeof window === "undefined") return false;
  const f = process.env.NEXT_PUBLIC_SIWE_DEBUG;
  return (
    process.env.NODE_ENV === "development" || f === "1" || f === "true"
  );
}

export default function SiweSessionSync() {
  const { address: wagmiAddress, isConnected: wagmiIsConnected, connector } =
    useAccount();
  const { chain: wagmiChain } = useNetwork();
  const { signMessageAsync } = useSignMessage();

  const thirdWebConnectionStatus = useActiveWalletConnectionStatus();
  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const client = useThirdwebClient();

  const siweLockRef = useRef(false);

  const performSiweAuth = useCallback(
    async (walletAddress, chainId, isThirdweb) => {
      if (siweLockRef.current || !walletAddress || !chainId) return;
      siweLockRef.current = true;

      try {
        const sessionRes = await fetch("/api/auth/me", {
          credentials: "same-origin",
        });
        const sessionData = await sessionRes.json();
        const sessionAddr = sessionData?.address
          ? String(sessionData.address).toLowerCase()
          : null;
        const walletAddr = String(walletAddress).toLowerCase();
        if (sessionAddr === walletAddr) {
          return;
        }

        const nonceRes = await fetch("/api/auth/nonce", {
          credentials: "same-origin",
        });
        const nonce = await nonceRes.text();

        const message = new SiweMessage({
          domain: getSiweDomain(),
          address: walletAddress,
          statement: SIWE_STATEMENT,
          uri: typeof window !== "undefined" ? window.location.origin : "",
          version: "1",
          chainId,
          nonce,
        });

        const prepared = message.prepareMessage();

        let signature;
        if (isThirdweb && activeAccount) {
          signature = await thirdwebSignMessage({
            message: prepared,
            account: activeAccount,
          });
        } else {
          signature = await signMessageAsync({
            message: prepared,
          });
        }

        if (siweVerbose()) {
          console.log("[SIWE client] signed", {
            signer: isThirdweb ? "thirdweb" : "wagmi",
            address: walletAddress,
            chainId,
            signatureLength:
              typeof signature === "string" ? signature.length : 0,
          });
        }

        const plainMessage = {
          domain: message.domain,
          address: message.address,
          statement: message.statement,
          uri: message.uri,
          version: message.version,
          chainId: message.chainId,
          nonce: message.nonce,
          issuedAt: message.issuedAt,
          expirationTime: message.expirationTime,
          notBefore: message.notBefore,
          requestId: message.requestId,
          resources: message.resources,
        };

        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: plainMessage, signature }),
        });

        if (!verifyRes.ok) {
          console.error("SIWE verify failed:", await verifyRes.text());
        }
      } catch (error) {
        console.error("SIWE error:", error);
      } finally {
        siweLockRef.current = false;
      }
    },
    [activeAccount, signMessageAsync],
  );

  useEffect(() => {
    if (
      thirdWebConnectionStatus === "connected" &&
      activeAccount?.address &&
      activeChain?.id &&
      activeWallet &&
      client
    ) {
      void performSiweAuth(activeAccount.address, activeChain.id, true);
      return;
    }
    if (wagmiIsConnected && wagmiAddress && connector) {
      const chainId =
        wagmiChain?.id ?? connector.chains?.[0]?.id ?? 1;
      void performSiweAuth(wagmiAddress, chainId, false);
    }
  }, [
    thirdWebConnectionStatus,
    activeAccount?.address,
    activeChain?.id,
    activeWallet,
    client,
    wagmiIsConnected,
    wagmiAddress,
    wagmiChain?.id,
    connector,
    performSiweAuth,
  ]);

  return null;
}
