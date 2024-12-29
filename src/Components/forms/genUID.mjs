// genUID.cjs

import crypto from "crypto";
import bs58 from "bs58";

// Input: unique identifier for the project, e.g., projectId
export default function generateUID(title, addressUID) {
  const UIDinput = title + addressUID;
  const projectId = "2"; // eg. 2 = FJKTv1un  | 1 = 8EjkXVST
  const hash = crypto.createHash("sha256").update(UIDinput).digest();
  const base58 = bs58.encode(hash).substring(0, 8); // Base58 encode and truncate
  return base58;
}

// Example usage
