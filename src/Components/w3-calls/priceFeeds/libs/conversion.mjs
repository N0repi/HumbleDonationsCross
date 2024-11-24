// conversion.mjs

// helper file for queryDEX.mjs

import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { getConfig } from "../../../../utils/constants.js";

const READABLE_FORM_LEN = 18;

// Function for conversion to/from readable amount
export function fromReadableAmount(amount, decimals) {
  return ethers.parseUnits(amount.toString(), decimals);
}

export function toReadableAmount(rawAmount, decimals) {
  return ethers.formatUnits(rawAmount, decimals).slice(0, READABLE_FORM_LEN);
}

// Function to dynamically get tokens based on the connected chain ID
export function getTokensForChain(chainId) {
  chainId = chainId ?? 42161;
  console.log("conversion Config:", chainId);
  const { HDT, WRAPPED } = getConfig(chainId);

  if (!HDT || !WRAPPED) {
    throw new Error(`Token addresses not found for chain ID: ${chainId}`);
  }

  const WETH_TOKEN = new Token(
    WRAPPED.chainId,
    WRAPPED.address,
    WRAPPED.decimals,
    WRAPPED.symbol,
    WRAPPED.name
  );

  const HDT_TOKEN = new Token(
    chainId,
    HDT,
    18,
    "HDT",
    "Humble Donations Token"
  );

  return {
    WETH_TOKEN,
    HDT_TOKEN,
  };
}
