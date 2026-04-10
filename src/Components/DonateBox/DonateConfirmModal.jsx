import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Style from "./DonatePreflightModals.module.css";

/** Match `.panelExiting` / `.overlayExiting` duration in DonatePreflightModals.module.css */
const EXIT_ANIM_MS = 260;

/**
 * Round USD display to cents using the thousandths digit: below 5 round down, 5+ round up.
 * Expects values like `$12.345` from getINtoUSD.
 */
function formatUsdEstimateToCents(display) {
  if (display == null || typeof display !== "string") return display;
  const t = display.trim();
  if (!t || t === "Invalid liquidity") return display;
  const neg = t.startsWith("-");
  const rest = neg ? t.slice(1).trim() : t;
  const withDollar = rest.startsWith("$") ? rest.slice(1).trim() : rest;
  const num = parseFloat(withDollar.replace(/,/g, ""));
  if (!Number.isFinite(num)) return display;
  const sign = neg ? -1 : 1;
  const abs = Math.abs(num);
  const thousandthsTotal = Math.round(abs * 1000 + Number.EPSILON);
  const thouDigit = thousandthsTotal % 10;
  const centsInt =
    thouDigit >= 5
      ? Math.ceil(thousandthsTotal / 10)
      : Math.floor(thousandthsTotal / 10);
  const out = (sign * centsInt) / 100;
  return `$${out.toFixed(2)}`;
}

/**
 * Viewport-centered donation confirmation (replaces thirdweb window.confirm).
 */
export default function DonateConfirmModal({
  isOpen,
  onClose,
  onConfirmDonate,
  projectTitle,
  amountDisplay,
  usdEquivalentDisplay,
  donateEnabled,
  donateDisabledHint,
}) {
  const [displayed, setDisplayed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const pendingExitAction = useRef(null);
  const onCloseRef = useRef(onClose);
  const onConfirmRef = useRef(onConfirmDonate);
  onCloseRef.current = onClose;
  onConfirmRef.current = onConfirmDonate;

  useLayoutEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      setExiting(false);
      pendingExitAction.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && displayed && !exiting) {
      pendingExitAction.current = null;
      setExiting(true);
    }
  }, [isOpen, displayed, exiting]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => {
      const action = pendingExitAction.current;
      pendingExitAction.current = null;
      setExiting(false);
      setDisplayed(false);
      if (action === "donate") {
        onConfirmRef.current?.();
      }
      onCloseRef.current?.();
    }, EXIT_ANIM_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  const beginExit = useCallback((action) => {
    pendingExitAction.current = action;
    setExiting(true);
  }, []);

  const usdRounded = useMemo(
    () => formatUsdEstimateToCents(usdEquivalentDisplay),
    [usdEquivalentDisplay],
  );

  if (!displayed) return null;

  return (
    <div
      className={`${Style.overlay} ${exiting ? Style.overlayExiting : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-confirm-title"
      onClick={() => beginExit("reject")}
    >
      <div
        className={`${Style.panel} ${exiting ? Style.panelExiting : Style.panelEnter}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="donate-confirm-title" className={Style.title}>
          Confirm donation
        </h3>
        <p className={Style.body}>
          Review the details below. This will send a transaction from your
          wallet.
        </p>
        <div className={Style.summary}>
          <div className={Style.summaryRow}>
            <span className={Style.summaryLabel}>Recipient</span>
            <span className={Style.summaryValue}>{projectTitle || "—"}</span>
          </div>
          <div className={Style.summaryRow}>
            <span className={Style.summaryLabel}>Amount</span>
            <span className={Style.summaryValue}>{amountDisplay}</span>
          </div>
          {usdRounded ? (
            <div className={Style.summaryRow}>
              <span className={Style.summaryLabel}>Est. value (USD)</span>
              <span className={Style.summaryValue}>{usdRounded}</span>
            </div>
          ) : null}
        </div>
        {!donateEnabled && donateDisabledHint ? (
          <p className={Style.hint}>{donateDisabledHint}</p>
        ) : null}
        <div className={Style.actions}>
          <button
            type="button"
            className={Style.secondary}
            onClick={() => beginExit("reject")}
          >
            Reject
          </button>
          <button
            type="button"
            className={Style.primary}
            disabled={!donateEnabled}
            onClick={() => beginExit("donate")}
          >
            Donate
          </button>
        </div>
      </div>
    </div>
  );
}
