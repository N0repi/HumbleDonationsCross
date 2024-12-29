// checkCodes.js

import { ethers } from "ethers";
import ReferralProjectBatchPausable from "../../../artifacts/contracts/referral/ReferralProjectBatchPausable.sol/ReferralProjectBatchPausable.json";
import { GET_PROJECTS_REFERRAL_SPECIFIC } from "../../utils/Graph/NOC/graphReactNOC.jsx";

export default async function fetchAndVerifyReferralCodes(
  provider,
  chain,
  referralCode,
  ReferralProjectContractAddress,
  urqlClient
) {
  // console.log("ReferralCode:", referralCode);

  if (!urqlClient) {
    throw new Error(`No urqlClient found for chain Id: ${chain?.id}`);
  }

  // Execute the GraphQL query
  const result = await urqlClient
    .query(GET_PROJECTS_REFERRAL_SPECIFIC)
    .toPromise();

  // console.log("GraphQL Query Result:", result);
  if (result.error) {
    throw new Error(`Error fetching projects: ${result.error.message}`);
  }

  const projects = result.data.projects;

  if (!projects || projects.length === 0) {
    console.log("No projects found.");
    return []; // No matches found
  }

  // Connect to the referral contract
  const contractInstance = new ethers.Contract(
    ReferralProjectContractAddress,
    ReferralProjectBatchPausable.abi,
    provider
  );

  // Find the owner of the input referralCode
  const initialReferralCodeOwner = projects.find((project) => {
    const metadata = JSON.parse(project.uri || "{}");
    return (
      metadata.ReferralCode?.trim().toLowerCase() ===
      referralCode.trim().toLowerCase()
    );
  })?.owner;

  if (!initialReferralCodeOwner) {
    console.warn(`No owner found for referralCode: ${referralCode}`);
    return [];
  }

  // console.log(
  //   `Owner of referralCode ${referralCode}: ${initialReferralCodeOwner}`
  // );

  // Filter matches for enteredReferralCode relationships
  const matches = await Promise.all(
    projects
      .filter((project) => {
        const metadata = JSON.parse(project.uri || "{}");
        return (
          metadata.EnteredReferralCode?.trim().toLowerCase() ===
          referralCode.trim().toLowerCase()
        );
      })
      .map(async (project) => {
        const metadata = JSON.parse(project.uri || "{}");
        const projectReferralCode = metadata.ReferralCode;

        // Check if the ReferralCode is processed
        const isProcessed = await contractInstance.isReferralProcessed(
          projectReferralCode
        );

        if (isProcessed) {
          console.log(
            `ReferralCode ${projectReferralCode} is already processed. Skipping.`
          );
          return null; // Exclude processed referral codes
        }

        return {
          referralCode: projectReferralCode,
          enteredReferralCode: metadata.EnteredReferralCode, // Explicit assignment
          owner: project.owner, // Owner of enteredReferralCode
          referralCodeOwner: initialReferralCodeOwner, // Owner of the input referralCode
        };
      })
  );

  // Filter out null values (processed referral codes)
  const filteredMatches = matches.filter(Boolean);

  console.log("Filtered matches:", filteredMatches);
  return filteredMatches;
}
