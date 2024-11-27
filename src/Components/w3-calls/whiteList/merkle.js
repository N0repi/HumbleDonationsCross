// merkle.js

import tokenListJson from "../../SearchToken/tokenListNoDupes.json" assert { type: "json" };
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const myTokenList = tokenListJson.myTokenList;

function getTokenByAddress(address) {
  return myTokenList.find(
    (token) =>
      token.address.toLowerCase() === address.toLowerCase() ||
      Object.values(token.extensions?.bridgeInfo || {}).some(
        (bridge) => bridge.tokenAddress.toLowerCase() === address.toLowerCase()
      )
  );
}

function getLeafAddress(token, chainId) {
  return (
    token.extensions?.bridgeInfo?.[chainId]?.tokenAddress || token.address
  ).toLowerCase();
}

async function computeMerkleProof(tokenInput, chainId) {
  console.log("merkle computeMerkleProof tokenInput address:", tokenInput);

  // Find the token object
  const token = getTokenByAddress(tokenInput, chainId);
  if (!token) {
    throw new Error(`Token with address ${tokenInput} not found in whitelist.`);
  }

  // Generate Merkle Tree leaves
  const leaves = myTokenList.map((token) => {
    const address = getLeafAddress(token, chainId);
    return keccak256(address);
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  console.log("Generated Merkle Root:", root);

  // Generate the proof for the tokenInput
  const leaf = keccak256(getLeafAddress(token, chainId));
  // console.log("Generated Leaf for Token:", leaf.toString("hex"));

  const proof = merkleTree.getHexProof(leaf);
  console.log("Generated Proof:", proof);

  return proof;
}

export { computeMerkleProof };
