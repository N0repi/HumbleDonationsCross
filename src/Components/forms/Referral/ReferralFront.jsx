// ReferralFront.jsx

import React from "react";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";
import { useTransaction } from "../../Transaction/TransactionContext";
import { checkReferral } from "./checkReferral";

function ReferralFront({ chain, ReferralCode }) {
  const { getProvider, thirdwebActiveAccount } = useWallet();
  const {
    ReferralProjectContractAddress,
    ReferralProjectSafe,
    HDT,
    urqlClient,
  } = getConfig(chain?.id);
  const { setClaimHash, setTransactionError, setNothingToClaim } =
    useTransaction();

  const handleCheckReferral = async () => {
    const provider = await getProvider();
    if (!provider) {
      console.error("Provider is not available");
      return;
    }

    try {
      console.log("ReferralCode:", ReferralCode);
      const ReferralFrontCall = await checkReferral(
        provider,
        chain,
        ReferralCode,
        ReferralProjectContractAddress,
        ReferralProjectSafe,
        HDT,
        urqlClient,
        thirdwebActiveAccount
      );
      setClaimHash(ReferralFrontCall);
      // console.log("ReferralFrontCall:", ReferralFrontCall);
    } catch (error) {
      console.error("Error:", error);
      if (error.ReferralFrontCall) {
        setTransactionError(error.ReferralFrontCall.hash);
      } else if (error.receipt && error.receipt.hash) {
        setTransactionError(error.receipt.hash);
      } else {
        setNothingToClaim("Unknown error occurred");
      }
    }
  };

  return (
    <main>
      <div>
        <button onClick={handleCheckReferral}>Claim Referral</button>
      </div>
    </main>
  );
}

export default ReferralFront;
