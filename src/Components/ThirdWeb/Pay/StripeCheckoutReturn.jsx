import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "./StripeCheckoutReturn.module.css";

const QUERY_KEYS = ["stripe_session", "session_id"];

function readSessionId(query) {
  for (const k of QUERY_KEYS) {
    const raw = query[k];
    if (raw == null) continue;
    const sid = Array.isArray(raw) ? raw[0] : raw;
    if (typeof sid === "string" && sid.length > 0) return sid;
  }
  return null;
}

function stripStripeQueryFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const k of QUERY_KEYS) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k);
      changed = true;
    }
  }
  if (changed) {
    const next = url.pathname + (url.search ? url.search : "") + (url.hash || "");
    window.history.replaceState({}, "", next || "/");
  }
}

/**
 * Runs after Stripe Hosted Checkout redirects back (popup or same tab).
 * Retrieves the session, calls verify-payment, notifies opener via postMessage.
 */
export default function StripeCheckoutReturn() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;

    const sid = readSessionId(router.query);
    if (!sid) return;

    const lockKey = `hdt_stripe_verify_${sid}`;
    const prev = sessionStorage.getItem(lockKey);
    if (prev === "done") {
      stripStripeQueryFromUrl();
      if (window.opener) window.close();
      return;
    }
    if (prev === "pending") {
      const at = Number(sessionStorage.getItem(`${lockKey}_at`) || "0");
      if (at && Date.now() - at < 120000) return;
    }
    if (started.current) return;
    started.current = true;

    sessionStorage.setItem(lockKey, "pending");
    sessionStorage.setItem(`${lockKey}_at`, String(Date.now()));
    setOpen(true);
    setStatus("Verifying payment…");

    (async () => {
      try {
        const sessionRes = await fetch(
          `/api/payment/retrieve-session?session_id=${encodeURIComponent(sid)}`,
        );
        const sessionData = await sessionRes.json();
        if (sessionData.error) {
          throw new Error(sessionData.error);
        }

        const paymentIntentId = sessionData.payment_intent;
        const walletAddress = sessionData.walletAddress;
        const tokenAmount = sessionData.tokenAmount;
        const network = sessionData.network;
        if (
          network == null ||
          network === "" ||
          network === "undefined" ||
          network === "null"
        ) {
          throw new Error("Checkout session metadata is missing a valid network.");
        }
        const donationFlow = sessionData.donationFlow;
        const tokenId = sessionData.tokenId;

        if (!paymentIntentId || !walletAddress || tokenAmount == null) {
          throw new Error("Session is missing payment or wallet metadata.");
        }

        const response = await fetch("/api/chainlink/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
            walletAddress,
            tokenAmount: Number(tokenAmount),
            network,
            checkoutSessionId: sid,
          }),
        });
        const data = await response.json();

        if (data.success) {
          sessionStorage.setItem(lockKey, "done");
          sessionStorage.removeItem(`${lockKey}_at`);
          setStatus("Payment verified. HDT will arrive after Chainlink fulfills.");

          if (window.opener) {
            window.opener.postMessage(
              {
                type: "HDT_PAYMENT_SUCCESS",
                flow: donationFlow ? "donate" : "buy",
                tokenAmount: Number(tokenAmount),
                tokenId: donationFlow ? tokenId : undefined,
                txHash: data.txHash,
              },
              window.location.origin,
            );
            setTimeout(() => window.close(), 1200);
          } else {
            stripStripeQueryFromUrl();
            setTimeout(() => setOpen(false), 2500);
          }
        } else {
          sessionStorage.removeItem(lockKey);
          sessionStorage.removeItem(`${lockKey}_at`);
          const err = data.error || "unknown";
          setStatus(`Verification failed: ${err}`);
          if (window.opener) {
            window.opener.postMessage(
              { type: "HDT_PAYMENT_ERROR", error: err },
              window.location.origin,
            );
            setTimeout(() => window.close(), 4000);
          } else {
            setTimeout(() => {
              stripStripeQueryFromUrl();
              setOpen(false);
            }, 5000);
          }
        }
      } catch (e) {
        sessionStorage.removeItem(lockKey);
        sessionStorage.removeItem(`${lockKey}_at`);
        const msg = e?.message || String(e);
        setStatus(msg);
        if (window.opener) {
          window.opener.postMessage(
            { type: "HDT_PAYMENT_ERROR", error: msg },
            window.location.origin,
          );
          setTimeout(() => window.close(), 4000);
        } else {
          setTimeout(() => {
            stripStripeQueryFromUrl();
            setOpen(false);
          }, 5000);
        }
      }
    })();
  }, [router.isReady, router.query]);

  if (!open) return null;

  const verifying = status === "Verifying payment…";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Stripe payment result"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(15, 15, 20, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          background: "#1e1e1e",
          color: "#f3f3f3",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #333",
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}
      >
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>Card payment</h2>
        <div
          className={verifying ? styles.statusRow : undefined}
          {...(verifying
            ? {
                role: "status",
                "aria-live": "polite",
                "aria-busy": true,
              }
            : {})}
        >
          {verifying && (
            <div className={styles.spinnerSlot} aria-hidden>
              <div className="hdGradientSpinner hdGradientSpinner--lg" />
            </div>
          )}
          <p className={styles.statusBlock}>{status}</p>
        </div>
      </div>
    </div>
  );
}
