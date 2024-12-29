// checkReferral.js

import { ethers } from "ethers";
import axios from "axios";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";

// INTERNAL IMPORTS
import fetchAndVerifyReferralCodes from "../../../lib/referral/checkCodes";
import ReferralProjectBatchPausable from "../../../../artifacts/contracts/referral/ReferralProjectBatchPausable.sol/ReferralProjectBatchPausable.json";
import erc20ABI from "../../../Components/w3-calls/erc20.json";
// thirdweb
import { client } from "../../Model/thirdWebClient";

const ABI = ReferralProjectBatchPausable.abi;

async function matches(
  provider,
  chain,
  ReferralCode,
  ReferralProjectContractAddress,
  urqlClient
) {
  console.log("matches:", ReferralCode);
  const matchedCodes = await fetchAndVerifyReferralCodes(
    provider,
    chain,
    ReferralCode,
    ReferralProjectContractAddress,
    urqlClient
  );
  console.log("signMessage.js - matchedCodes:", matchedCodes);

  return matchedCodes;
}

export async function checkReferral(
  provider,
  chain,
  ReferralCode,
  ReferralProjectContractAddress,
  ReferralProjectSafe,
  HDT,
  urqlClient,
  thirdwebActiveAccount
) {
  const checkMatches = await matches(
    provider,
    chain,
    ReferralCode,
    ReferralProjectContractAddress,
    urqlClient
  );
  // console.log("checkReferral checkMatches:", checkMatches); // array

  if (!checkMatches) {
    console.log("invalid");
  } else {
    const claimCall = await claimReward(
      checkMatches,
      provider,
      ReferralProjectContractAddress,
      ReferralProjectSafe,
      HDT,
      chain,
      thirdwebActiveAccount
    );
    const claimCallWait = await claimCall;
    console.log("claimCallWait:", claimCallWait);
    // if call is null or error pass notification 'No rewards to Claim`
    return claimCallWait;
  }
}

async function callRoute(provider, checkMatches) {
  try {
    const response = await axios.post("/api/referral/signMessage", {
      provider,
      checkMatches,
    });
    const signatures = response.data.signatures;

    if (!signatures) {
      throw new Error("No signatures returned from API");
    }
    return signatures;
  } catch (error) {
    console.error(
      "Error fetching signatures:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function findSigner(chain, thirdwebActiveAccount, provider) {
  if (thirdwebActiveAccount && thirdwebActiveAccount.address) {
    // thirdweb
    const signer = ethers6Adapter.signer.toEthers({
      client: client,
      chain: chain,
      account: thirdwebActiveAccount,
    });
    console.log("thirdweb signer:", signer);
    return signer;
  } else {
    const signer = await provider.getSigner(); // Issue for abstracted}
    return signer;
  }
}

async function claimReward(
  checkMatches,
  provider,
  ReferralProjectContractAddress,
  ReferralProjectSafe,
  HDT,
  chain,
  thirdwebActiveAccount
) {
  const signer = await findSigner(chain, thirdwebActiveAccount, provider);

  const ReferralProjectContractInstance = new ethers.Contract(
    ReferralProjectContractAddress,
    ABI,
    signer
  );

  console.log("claimReward checkMatches:", checkMatches); // array

  const referralOwner = checkMatches[0]?.referralCodeOwner;

  // const referralOwner = await signer.getAddress(); // Caller is the owner
  const referralCodes = checkMatches.map((match) => match.referralCode);
  const owners = checkMatches.map((match) => match.owner);

  // Call the server-side API route to get signatures
  const signatures = await callRoute(provider, checkMatches);

  // console.log("---Transaction Params---");
  // console.log("referralCodes:", referralCodes);
  // console.log("enteredReferralCodes:", checkMatches[0].enteredReferralCode);
  // console.log("owners:", owners);
  // console.log("referralOwner:", referralOwner);
  // console.log("Batch Signatures:", signatures);

  try {
    const hdtToken = new ethers.Contract(HDT, erc20ABI, provider);
    const balance = await hdtToken.balanceOf(ReferralProjectSafe);
    // Should fetch owner directly from project owner of referralCode

    // console.log(
    //   `Safe Balance: ${ethers.formatUnits(balance, 18)} HDT`
    // );

    if (balance < 30) {
      console.error("Error: Insufficient balance in Referral Project Safe.");
      return; // Exit early if balance is less than 30
    }

    // Call batchClaimReward
    const tx = await ReferralProjectContractInstance.batchClaimReward(
      referralCodes,
      checkMatches[0].enteredReferralCode,
      owners,
      referralOwner,
      signatures,
      { gasLimit: 1000000 }
    );
    console.log("Batch Claim Reward Transaction Sent:", tx.hash);
    await tx.wait();
    console.log("Batch Claim Reward Transaction Confirmed!");
    return tx.hash;
  } catch (error) {
    console.error("Error claiming rewards in batch:", error);
  }
}
