// merkle.js

import tokenListJson from "../../SearchToken/tokenListNoDupes.json" assert { type: "json" };
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const myTokenList = tokenListJson.myTokenList;
// console.log(myTokenList);

async function computeMerkleProof(tokenInput) {
  console.log("merkle computeMerkleProof tokenInput address:", tokenInput);
  // console.log("merkle log tokenInput.address:", tokenInput.address)
  // Hash the whitelist entries
  const leaves = myTokenList.map((token) =>
    keccak256(token.address.toLowerCase())
  );
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  // const root = merkleTree.getHexRoot()
  // console.log("Merkle Root:", root)

  // Generate a proof for a specific address
  const leaf = keccak256(tokenInput);
  const proof = merkleTree.getHexProof(leaf);
  console.log("Proof of token address:", proof);

  return proof;
}

export { computeMerkleProof };
