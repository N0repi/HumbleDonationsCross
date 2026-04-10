// StripeBuyHdt.jsx

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getHdPortalContainer } from "../../../utils/hdPortalRoot.js";
import { useWallet } from "../../Wallet/WalletContext";
import { useThirdwebClient } from "../../Model/ThirdWebClientProvider";
import { chainHttpRpcUrl } from "../../../utils/chainHttpRpcUrl.js";
import {
  USD_TIER_PRICES,
  sepoliaStripeHdtTiers,
} from "../../../utils/stripeHdtTiers.js";
import { pollErc20BalanceIncrease } from "../../../utils/pollErc20BalanceIncrease.js";
import { createErc20BalanceReader } from "../../../utils/createErc20BalanceReader.js";
import { getHdtErc20AddressForChain } from "../../../utils/hdtContractAddress.js";
import Style from "../Connected/WalletModal.module.css";

const ARBITRUM_CHAIN_ID = 42161;
const SEPOLIA_CHAIN_ID = 11155111;

/** Match server hdtHuman display: compact but readable. */
function formatHdtTierDisplay(hdtHuman) {
  const n = Number(hdtHuman);
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/**
 * Card checkout → Stripe → verify-payment → Chainlink → Treasury releases HDT to the connected wallet.
 * Requires deployed StripePaymentVerifier3 + Treasury (same pattern as Wispi) and server env vars.
 */
export default function StripeBuyHdt({ isOpen, onClose }) {
  const {
    thirdwebActiveAccount,
    wagmiAddress,
    chain,
    provider,
    walletType,
    requestBalanceRefresh,
  } = useWallet();
  const client = useThirdwebClient();
  const [waiting, setWaiting] = useState(false);
  const [pending, setPending] = useState(null);
  /** HDT balance (wei) immediately before opening Stripe — avoids “credit before 2nd poll” hang */
  const prePayBalanceWeiRef = useRef(null);
  /** Arbitrum: live tier quotes (same math as create-checkout-session). */
  const [arbitrumTiers, setArbitrumTiers] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  const walletAddress = thirdwebActiveAccount?.address || wagmiAddress;
  const chainId = chain?.id ?? ARBITRUM_CHAIN_ID;
  const hdtPollAddress = getHdtErc20AddressForChain(chainId);

  useEffect(() => {
    const onMsg = (event) => {
      if (event.origin !== window.location.origin) return;
      if (
        event.data?.type === "HDT_PAYMENT_SUCCESS" &&
        event.data?.flow === "buy"
      ) {
        setWaiting(true);
        setPending({
          tokenAmount: event.data.tokenAmount,
          txHash: event.data.txHash,
        });
      }
      if (event.data?.type === "HDT_PAYMENT_ERROR") {
        setWaiting(false);
        setPending(null);
        alert(event.data.error || "Payment verification failed");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!walletAddress || !waiting || !pending || !hdtPollAddress || !chain)
      return;

    let readBalance;
    try {
      readBalance = createErc20BalanceReader({
        walletType,
        client,
        chain,
        provider,
        tokenAddress: hdtPollAddress,
        walletAddress,
      });
    } catch (e) {
      console.error("StripeBuyHdt: cannot build balance reader", e);
      return;
    }

    const stop = pollErc20BalanceIncrease({
      readBalance,
      expectedAmountHuman: pending.tokenAmount,
      initialBaselineWei: prePayBalanceWeiRef.current,
      onSuccess: () => {
        setWaiting(false);
        setPending(null);
        requestBalanceRefresh?.();
        onClose?.();
      },
      onTimeout: () => {
        setWaiting(false);
        setPending(null);
      },
    });

    return () => stop();
  }, [
    walletType,
    client,
    chain,
    provider,
    walletAddress,
    waiting,
    pending,
    hdtPollAddress,
    onClose,
    requestBalanceRefresh,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const cid = chain?.id;
    if (cid !== ARBITRUM_CHAIN_ID) {
      setArbitrumTiers({ status: "idle", data: null, error: null });
      return;
    }
    let cancelled = false;
    setArbitrumTiers((s) => ({
      ...s,
      status: "loading",
      error: null,
    }));
    const jsonRpcUrl = chainHttpRpcUrl(chain);
    if (!jsonRpcUrl) {
      setArbitrumTiers({
        status: "error",
        data: null,
        error:
          "No HTTP RPC on the current chain. Reconnect your wallet and try again.",
      });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/payment/hdt-quote-tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arbitrumRpcUrl: jsonRpcUrl }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || res.statusText);
        if (cancelled) return;
        const ui = j.tiers.map((t) => ({
          price: t.priceUsd,
          hdtDisplay: formatHdtTierDisplay(t.hdtHuman),
        }));
        setArbitrumTiers({ status: "ok", data: ui, error: null });
      } catch (e) {
        if (cancelled) return;
        setArbitrumTiers({
          status: "error",
          data: null,
          error: e.message || "Could not load HDT quotes",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, chain]);

  const startCheckout = async (tier) => {
    if (!tier) return;
    if (!walletAddress) {
      alert("Connect a wallet first.");
      return;
    }
    const cid = chain?.id;
    if (cid !== ARBITRUM_CHAIN_ID && cid !== SEPOLIA_CHAIN_ID) {
      alert(
        "Switch to Arbitrum One or Sepolia to buy HDT with card (Treasury must match this network).",
      );
      return;
    }
    const stripeNetwork = cid === SEPOLIA_CHAIN_ID ? "sepolia" : "arbitrum";
    const jsonRpcUrl = chainHttpRpcUrl(chain);
    if (stripeNetwork === "arbitrum" && !jsonRpcUrl) {
      alert(
        "No HTTP RPC on the current chain object. Reconnect your wallet and try again.",
      );
      return;
    }
    if (stripeNetwork === "arbitrum" && arbitrumTiers.status !== "ok") {
      alert(
        "Live HDT quotes are not ready yet, or they failed to load. Try again in a moment.",
      );
      return;
    }
    try {
      try {
        const readBaseline = createErc20BalanceReader({
          walletType,
          client,
          chain,
          provider,
          tokenAddress: hdtPollAddress,
          walletAddress,
        });
        prePayBalanceWeiRef.current = await readBaseline();
      } catch (e) {
        console.warn("StripeBuyHdt: pre-checkout baseline read failed", e);
        prePayBalanceWeiRef.current = null;
      }

      const res = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUSD: tier.price,
          walletAddress,
          network: stripeNetwork,
          donationFlow: false,
          ...(stripeNetwork === "sepolia"
            ? { tokenAmount: tier.hdt }
            : { arbitrumRpcUrl: jsonRpcUrl }),
        }),
      });
      const data = await res.json();
      if (!data.sessionUrl) {
        throw new Error(data.error || "No checkout URL");
      }
      const w = window.open(
        data.sessionUrl,
        "stripe-checkout",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );
      if (!w) alert("Allow popups to complete card checkout.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Checkout failed");
    }
  };

  if (!isOpen) return null;

  const cid = chain?.id;
  const isArbitrum = cid === ARBITRUM_CHAIN_ID;
  const isSepolia = cid === SEPOLIA_CHAIN_ID;
  const networkOk = isArbitrum || isSepolia;

  const tierRows = isSepolia
    ? sepoliaStripeHdtTiers.map((t) => ({
        key: t.price,
        price: t.price,
        hdtLabel: `~${t.hdt} HDT`,
        tierForCheckout: t,
      }))
    : isArbitrum
      ? USD_TIER_PRICES.map((price, i) => {
          const q =
            arbitrumTiers.data?.find((x) => x.price === price) ??
            arbitrumTiers.data?.[i];
          const ok = arbitrumTiers.status === "ok" && q;
          return {
            key: price,
            price,
            hdtLabel: ok
              ? `~${q.hdtDisplay} HDT`
              : arbitrumTiers.status === "loading"
                ? "…"
                : "—",
            tierForCheckout: ok ? { price } : null,
          };
        })
      : USD_TIER_PRICES.map((price) => ({
          key: price,
          price,
          hdtLabel: "—",
          tierForCheckout: null,
        }));

  const tierButtonsDisabled =
    waiting || !networkOk || tierRows.some((r) => r.tierForCheckout == null);

  const modal = (
    <div className={Style.stripeBuyOverlay} onClick={onClose}>
      <div
        className={Style.stripeBuyPanel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Buy HDT with card"
      >
        <div className={Style.stripeBuyHeader}>
          <span>Buy HDT</span>
          <button
            type="button"
            className={Style.stripeBuyClose}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className={Style.stripeBuyHint}>
          Buy Humble Donations Token (HDT) with a credit card. <br />
          <em>
            * Amount of HDT received is based on current market price -6% fee to
            cover processing costs.
          </em>
        </p>
        {isArbitrum && arbitrumTiers.status === "error" && (
          <p className={Style.stripeBuyHint} role="alert">
            {arbitrumTiers.error}
          </p>
        )}
        {waiting && (
          <div
            className={Style.stripeBuyLoadingRow}
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className={`hdGradientSpinner ${Style.stripeBuySpinner}`}
              aria-hidden
            />
            <div className={Style.stripeBuyLoadingCopy}>
              <span className={Style.stripeBuyLoadingTitle}>
                Crediting HDT to your wallet
              </span>
              <span className={Style.stripeBuyLoadingSub}>
                This can take a minute after payment. We detect when your HDT
                balance increases.
              </span>
            </div>
          </div>
        )}
        <div className={Style.stripeBuyTiers}>
          {tierRows.map((row) => (
            <button
              key={row.key}
              type="button"
              className={Style.stripeBuyTierBtn}
              onClick={() => startCheckout(row.tierForCheckout)}
              disabled={tierButtonsDisabled}
            >
              <strong>${row.price.toFixed(2)}</strong>
              <span>{row.hdtLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const container = getHdPortalContainer();
  if (!container) return null;
  return createPortal(modal, container);
}
