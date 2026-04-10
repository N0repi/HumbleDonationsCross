// Model.jsx — wagmi connectors + ConnectEmbed; SIWE lives here (wispi BackupsPorjects workflow).

import React, { useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAccount, useConnect, useSignMessage, useNetwork } from "wagmi";
import { SiweMessage } from "siwe";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWallet,
} from "thirdweb/react";
import { signMessage as thirdwebSignMessage } from "thirdweb/utils";

import Web2 from "./Web2.jsx";
import { useThirdwebClient } from "./ThirdWebClientProvider";

import Style from "./Model.module.css";
import images from "../../assets";

function getSiweDomain() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SIWE_DOMAIN) {
    return process.env.NEXT_PUBLIC_SIWE_DOMAIN;
  }
  return "https://humbledonations.com";
}

const SIWE_STATEMENT =
  "Signing this message is a security measure to prove that you have access to the wallet you are connecting with.\n\nSigning does not cost any Ether.";

const connectorIcons = {
  metaMask: images.MetaMask,
  coinbaseWallet: images.CoinBase,
  walletConnect: images.WalletConnect,
  injected: images.Other,
};

const Model = ({ setOpenModel }) => {
  const { address, connector, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const { signMessageAsync } = useSignMessage();

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
        if (sessionData.address === walletAddress) {
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

  const handleConnectorClick = (c) => {
    connect({ connector: c });
    setOpenModel(false);
  };

  useEffect(() => {
    if (address && isConnected && connector) {
      const chainId = chain?.id ?? connector.chains?.[0]?.id ?? 1;
      performSiweAuth(address, chainId, false);
    }
  }, [address, isConnected, connector, chain?.id, performSiweAuth]);

  useEffect(() => {
    if (activeAccount?.address && activeChain && activeWallet && client) {
      performSiweAuth(activeAccount.address, activeChain.id, true);
    }
  }, [
    activeAccount?.address,
    activeChain?.id,
    activeWallet,
    client,
    performSiweAuth,
  ]);

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
