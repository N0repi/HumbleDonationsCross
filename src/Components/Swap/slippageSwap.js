// slippageSwap.js

import { ethers } from "ethers";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json" assert { type: "json" };
import QuoterV2 from "./ABIs/QuoterV2.json" assert { type: "json" };
import {
  toReadableAmount,
  fromReadableAmount,
  WETH_TOKEN,
} from "../w3-calls/priceFeeds/libs/conversion.mjs";

// QuoterV2 contract address (on Mainnet, you will need the appropriate address for your network)
// const QUOTER_CONTRACT_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
// const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

// Example setup for Uniswap

export default async function getAmountOutWithSlippage(
  tokenIn,
  tokenOut,
  amountIn,
  poolFee,
  slippagePercentage, // 0.005%
  connectedSigner,
  uniQuoter
) {
  const QuoterImport = QuoterV2;
  console.log("uniQuoter address:", uniQuoter); // comes back as Arbitrum address

  const quoterContract = new ethers.Contract(
    uniQuoter,
    QuoterImport.abi,
    connectedSigner
  );

  console.log("tokenIn", tokenIn);
  console.log("tokenOut", tokenOut);
  console.log("amountIn", amountIn);
  console.log("poolFee", poolFee);
  console.log("slippagePercentage", slippagePercentage);
  console.log("connectedSigner", connectedSigner);

  const amountInStr = amountIn.toString();

  try {
    // if (tokenIn === "0x0000000000000000000000000000000000000000") {
    //   console.log("Replacing ETH address with WETH address for tokenIn.");
    //   console.log("slippageSwap.js  -  WRAPPED log  - ", WRAPPED);
    //   tokenIn = WRAPPED;
    // }

    const params = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: poolFee,
      amountIn: amountIn,
      sqrtPriceLimitX96: 0,
    };
    // ethers.parseUnits(amountIn, tokenIn.decimals).toString()

    console.log("****params.amountIn:", params);

    // Call the QuoterV2 contract to get an estimated output for the given input amount
    // const quotedAmount = await quoterContract.quoteExactInputSingle(params);

    const quotedAmountV2 =
      await quoterContract.quoteExactInputSingle.staticCall(params);
    console.log("----Quote----");
    console.log("quotedAmountV2:", quotedAmountV2.amountOut);

    // quotedAmount is in BigNumber format, convert to a readable format if needed
    const expectedAmountOut = quotedAmountV2.amountOut;
    // const expectedAmountOut = quotedAmount.amountOut;
    console.log("slippageSwap - expectedAmountOut: ", expectedAmountOut);
    const quotedAmountV2format = toReadableAmount(
      expectedAmountOut,
      tokenIn.decimals
    );

    console.log("quotedAmountV2format - ", quotedAmountV2format);

    const slippageFactor =
      (expectedAmountOut * BigInt(Math.floor(slippagePercentage * 10000))) /
      BigInt(10000);

    console.log("slippageFactor - ", slippageFactor);
    // Calculate the minimum amount out, adjusting for slippage
    const amountOutMinimum = expectedAmountOut - slippageFactor;

    console.log("amountOutMinimum - ", amountOutMinimum);

    return amountOutMinimum;
  } catch (error) {
    console.error("Error getting quoted amount from QuoterV2:", error);
    throw error;
  }
}
