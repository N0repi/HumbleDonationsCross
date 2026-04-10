import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { getHdPortalContainer } from "../../utils/hdPortalRoot.js";
import Style from "./DonatePreflightModals.module.css";

/** Match `.panelExiting` / `.overlayExiting` in DonatePreflightModals.module.css */
const EXIT_ANIM_MS = 260;

/**
 * Viewport-centered insufficient HDT modal (not nested in DonateBox layout).
 */
export default function InsufficientHdtModal({ isOpen, onClose, onBuyHdt }) {
  const [displayed, setDisplayed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const pendingExitAction = useRef(null);
  const onCloseRef = useRef(onClose);
  const onBuyHdtRef = useRef(onBuyHdt);
  onCloseRef.current = onClose;
  onBuyHdtRef.current = onBuyHdt;

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
      if (action === "buy") {
        onBuyHdtRef.current?.();
      } else {
        onCloseRef.current?.();
      }
    }, EXIT_ANIM_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  const beginExit = useCallback((action) => {
    pendingExitAction.current = action;
    setExiting(true);
  }, []);

  if (!displayed) return null;

  const modal = (
    <div
      className={`${Style.overlay} ${exiting ? Style.overlayExiting : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="insufficient-hdt-title"
      onClick={() => beginExit("cancel")}
    >
      <div
        className={`${Style.panel} ${exiting ? Style.panelExiting : Style.panelEnter}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="insufficient-hdt-title" className={Style.title}>
          Insufficient HDT
        </h3>
        <p className={Style.bodyCenter}>
          Your wallet does not have enough HDT to complete this donation.
        </p>
        <div className={Style.actions}>
          <button
            type="button"
            className={Style.secondary}
            onClick={() => beginExit("cancel")}
          >
            Cancel
          </button>
          <button
            type="button"
            className={Style.primary}
            onClick={() => beginExit("buy")}
          >
            Buy HDT
          </button>
        </div>
      </div>
    </div>
  );

  const container = getHdPortalContainer();
  if (!container) return null;
  return createPortal(modal, container);
}
