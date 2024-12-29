// signMessage.js

import { ethers } from "ethers";

if (process.env.NODE_ENV !== "production") {
  import("dotenv").then((dotenv) => dotenv.config());
}

export async function safeSignMessage(provider, checkMatches) {
  console.log("safeSignMessage checkMatches:", checkMatches);

  const signer = process.env.PRIVATE_KEY;
  const trustedSigner = new ethers.Wallet(signer, provider);

  const signatures = [];

  for (const match of checkMatches) {
    const { referralCode, enteredReferralCode, owner, referralCodeOwner } =
      match;

    // Generate the message hash for this claim
    const rawMessage = ethers.solidityPacked(
      ["string", "string", "address", "address"],
      [referralCode, enteredReferralCode, owner, referralCodeOwner]
    );

    const messageHash = ethers.keccak256(rawMessage);
    console.log("messageHash (keccak256 equivalent):", messageHash);

    // Sign the hash directly
    const signature = await trustedSigner.signMessage(
      ethers.getBytes(messageHash)
    );
    console.log(`Generated Signature for ${referralCode}:`, signature);

    signatures.push(signature);
  }

  return signatures;
}
