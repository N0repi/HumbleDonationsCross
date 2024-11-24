// AirdropComputation.jsx

import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import AirdropHDT from "../../../artifacts/contracts/airdrop/AirdropHDT.sol/AirdropHDT.json" assert { type: "json" };
import snapshot from "./snapshot/snapshot.json" assert { type: "json" };

const contractAddress = "0xC8651777EB23A33E17e7A41C07dd73bA45Ff751b";
const HDT = "0x9707Be4129F68B767aF550fe1c631BF1779623Cb";

async function getConnectedSigner() {
  if (typeof window !== "undefined" && window.ethereum) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider.getSigner();
  } else {
    console.error("Web3 provider not available");
    return null;
  }
}

async function findTokenIdByOwner(connectedWalletAddress) {
  const project = snapshot.find(
    (project) =>
      project.owner.toLowerCase() === connectedWalletAddress.toLowerCase()
  );
  if (project) {
    return project.id; // This is your tokenId
  } else {
    throw new Error("No project found for the connected wallet address.");
  }
}

async function generateMerkleTree() {
  const projects = snapshot;

  if (!projects) {
    throw new Error("No data available to generate Merkle Tree");
  }

  const leaves = projects.map((project) => {
    let score = 1000; // Base score

    const validDonations = project.donations.filter(
      (donation) => donation.erc20Token.toLowerCase() !== HDT.toLowerCase()
    );
    score += validDonations.length * 10;

    const uniqueDonors = new Set(
      validDonations.map((donation) => donation.donor.toLowerCase())
    );
    score += 100 * uniqueDonors.size;

    const highValueHDTDonations = project.donations.filter((donation) => {
      const amount = ethers.parseUnits(donation.amount, 18);
      return (
        donation.erc20Token.toLowerCase() === HDT.toLowerCase() &&
        amount > ethers.parseUnits("150", 18)
      );
    });
    score += 150 * highValueHDTDonations.length;

    const leaf = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [project.owner, score]
    );

    console.log(`Leaf for ${project.owner}: ${leaf}`);
    console.log(`Score for leaf: ${score}`);
    return Buffer.from(leaf.slice(2), "hex"); // Convert to Buffer for MerkleTreejs
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  return { merkleTree, projects };
}

async function generateProof(projectId, connectedWalletAddress) {
  const { merkleTree, projects } = await generateMerkleTree();

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  let score = 1000;

  const validDonations = project.donations.filter(
    (donation) => donation.erc20Token.toLowerCase() !== HDT.toLowerCase()
  );
  score += validDonations.length * 10;

  const uniqueDonors = new Set(
    validDonations.map((donation) => donation.donor.toLowerCase())
  );
  score += 100 * uniqueDonors.size;

  const highValueHDTDonations = project.donations.filter((donation) => {
    const amount = ethers.parseUnits(donation.amount, 18);
    return (
      donation.erc20Token.toLowerCase() === HDT.toLowerCase() &&
      amount > ethers.parseUnits("150", 18)
    );
  });
  score += 150 * highValueHDTDonations.length;

  const leaf = ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [connectedWalletAddress, score]
  );
  const leafBuffer = Buffer.from(leaf.slice(2), "hex");
  const proof = merkleTree
    .getProof(leafBuffer)
    .map((p) => "0x" + p.data.toString("hex"));
  const isValid = merkleTree.verify(
    proof.map((p) => Buffer.from(p.slice(2), "hex")),
    leafBuffer,
    merkleTree.getRoot()
  );

  if (!isValid) {
    console.error("Generated proof is not valid.");
  }

  console.log("Proof:", proof);
  console.log("Score:", score.toString());
  return {
    score,
    proof,
    leaf: leafBuffer.toString("hex"),
    root: merkleTree.getRoot().toString("hex"),
  };
}

async function validateProof(leaf, proof, root) {
  let computedHash = Buffer.from(leaf, "hex");

  console.log(`Initial Leaf: ${computedHash.toString("hex")}`);

  for (let i = 0; i < proof.length; i++) {
    let proofElement = Buffer.from(proof[i].slice(2), "hex");
    console.log(`Proof Element [${i}]: ${proofElement.toString("hex")}`);

    if (computedHash < proofElement) {
      computedHash = keccak256(Buffer.concat([computedHash, proofElement]));
    } else {
      computedHash = keccak256(Buffer.concat([proofElement, computedHash]));
    }

    console.log(`Computed Hash [${i}]: ${computedHash.toString("hex")}`);
  }

  console.log(`Final Computed Hash: ${computedHash.toString("hex")}`);
  console.log(`Expected Root: ${root}`);

  return computedHash.toString("hex") === root;
}

export default async function callContract() {
  const { abi } = AirdropHDT;
  const signer = await getConnectedSigner();
  const connectedWalletAddress = signer.address;

  try {
    const projectId = await findTokenIdByOwner(connectedWalletAddress);
    const { score, proof, leaf, root } = await generateProof(
      projectId,
      connectedWalletAddress
    );

    console.log("proof:", proof);
    console.log("score no str:", score);
    console.log("score str:", score.toString());

    const entitledAmount = ethers.parseUnits(score.toString());
    console.log("entitledAmount: ", entitledAmount);

    // Validate proof off-chain before sending the transaction
    const isValidProof = await validateProof(leaf, proof, root);
    console.log("Is the proof valid off-chain?", isValidProof);

    if (isValidProof) {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const claimTokens = await contract.claimTokens(entitledAmount, proof, {
        gasLimit: "100000",
      });
      await claimTokens.wait();
      console.log("Transaction successful!");
    } else {
      console.log("The proof is invalid. Transaction not sent.");
    }
  } catch (error) {
    console.error("Transaction failed:", error.message);
  }
}

// callContract()
