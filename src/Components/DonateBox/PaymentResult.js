// PaymentResult.js

import React, { useState, useEffect } from "react";
import { useTransaction } from "../Transaction/TransactionContext";
import Style from "./PaymentResult.module.css";
import { useWallet } from "../Wallet/WalletContext";
import { getConfig } from "../../utils/constants";

const PaymentResult = ({ projectTitle, tokenQuantity, tokenAddress }) => {
  const {
    approvalHash,
    confirmationHash,
    donationHash,
    burnHash,
    transferHash,
    claimHash,
    transactionError,
    nothingToClaim,
    resetTransactionState,
  } = useTransaction();
  const [timerId, setTimerId] = useState(null);
  const [progress, setProgress] = useState(100);
  const [startTime, setStartTime] = useState(null);
  const [isProgressBarHovered, setIsProgressBarHovered] = useState(false);

  const { chain } = useWallet();
  const chainId = chain?.id;
  const { explorer } = getConfig(chainId);

  useEffect(() => {
    const handlePayment = async () => {
      try {
        setStartTime(performance.now()); // Record the start time
        // Set a timer for hiding the transaction hashes
        setTimerId(
          setTimeout(() => {
            resetTransactionState();
          }, 5000)
        );
      } catch (error) {
        console.error("Error:", error);
      }
    };

    handlePayment();

    // Clear the timer on component unmount or when hashes change
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [
    approvalHash,
    confirmationHash,
    burnHash,
    transferHash,
    claimHash,
    transactionError,
    resetTransactionState,
  ]);

  useEffect(() => {
    // Update progress every 50 milliseconds (adjust as needed)
    const intervalId = setInterval(() => {
      if (startTime && !isProgressBarHovered) {
        const elapsedTime = performance.now() - startTime;
        const remainingTime = Math.max(0, 5000 - elapsedTime);
        const newProgress = (remainingTime / 5000) * 100;
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      // Clear the interval on component unmount
      clearInterval(intervalId);
    };
  }, [startTime, isProgressBarHovered]);

  const handleMouseEnter = () => {
    // Clear the existing timer
    if (timerId) {
      clearTimeout(timerId);
    }
  };

  const handleMouseLeave = () => {
    // Clear the existing timer
    if (timerId) {
      clearTimeout(timerId);
    }

    // Reset the progress to 100%
    setProgress(100);

    // Reset the start time when mouse leaves
    setStartTime(performance.now());

    // Set a new timer when the mouse leaves
    setTimerId(
      setTimeout(() => {
        resetTransactionState();
      }, 5000)
    );
  };

  const handleProgressBarMouseEnter = () => {
    // Reset the progress to 100% when the cursor hovers on the progressBar
    setProgress(100);

    // Clear the existing timer
    if (timerId) {
      clearTimeout(timerId);
    }

    // Record the new start time
    setStartTime(performance.now());

    // Set flag indicating cursor is over the progress bar
    setIsProgressBarHovered(true);
  };

  const handleProgressBarMouseLeave = () => {
    // Clear the flag indicating cursor is over the progress bar
    setIsProgressBarHovered(false);
  };

  return (
    <div className={Style.transactionPos}>
      {approvalHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${approvalHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Approval TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {confirmationHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${confirmationHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Confirmation TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {donationHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${donationHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Donation TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {burnHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${burnHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Burn TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {transferHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${transferHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Transfer TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {claimHash && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${claimHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Claim TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {transactionError && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            href={`${explorer}tx/${transactionError}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Error TX
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
      {nothingToClaim && (
        <div
          className={Style.transactionPosBox}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a
            onMouseEnter={handleProgressBarMouseEnter}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            Nothing to claim
          </a>
          {timerId && (
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
              onMouseEnter={handleProgressBarMouseEnter}
              onMouseLeave={handleProgressBarMouseLeave}
            ></div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentResult;
