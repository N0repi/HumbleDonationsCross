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

function toFixedWithoutScientificNotation(num, decimals) {
  return Number(num).toFixed(decimals);
}

// export default async function getAmountOutMinimum(
//   tokenIn,
//   tokenOut,
//   amountIn,
//   poolFee,
//   slippagePercentage, // 0.005%
//   connectedSigner,
//   uniQuoter,
//   chainId
// ) {
//   if (chainId == 146) {
//     console.log("getting slippage on Sonic...");
//     const callSonic = await slippageEqualizer(
//       tokenIn,
//       tokenOut,
//       amountIn,
//       slippagePercentage, // 0.005%
//       connectedSigner
//     );
//     return callSonic;
//   } else {
//     console.log("getting slippage on Arbitrum/Sepolia...");
//     const callSlippage = await getAmountOutWithSlippageUniswap(
//       tokenIn,
//       tokenOut,
//       amountIn,
//       poolFee,
//       slippagePercentage, // 0.005%
//       connectedSigner,
//       uniQuoter
//     );
//     return callSlippage;
//   }
// }

export async function slippageEqualizer(
  tokenIn,
  tokenOut,
  amountIn,
  slippagePercentage,
  connectedSigner,
  WRAPPED,
  NATIVE
) {
  console.log("Sonic slippage amountIn (raw):", amountIn);

  // Ensure amountIn is a fixed-point string without scientific notation
  const amountInStr = toFixedWithoutScientificNotation(
    amountIn,
    tokenIn.decimals
  );
  console.log("Sonic slippage amountIn (fixed):", amountInStr);

  // Convert amountIn to wei
  // const amountInWei = ethers.parseUnits(amountInStr, tokenIn.decimals);

  // console.log("Sonic slippage amountIn (wei):", amountInWei);

  try {
    const EqualizerQuote = await getQuoteSonic(
      tokenIn,
      tokenOut,
      amountIn,
      connectedSigner,
      WRAPPED,
      NATIVE
    );

    const slippageBuffer =
      (BigInt(EqualizerQuote) * BigInt(slippagePercentage * 10000)) /
      BigInt(10000);
    const amountOutMinimum = BigInt(EqualizerQuote) - slippageBuffer;

    return amountOutMinimum; // The final output token amount
  } catch (error) {
    console.error("Error getting amounts out:", error);
  }
}

export async function getQuoteSonic(
  tokenIn,
  tokenOut,
  amountIn,
  connectedSigner,
  WRAPPED,
  NATIVE
) {
  console.log("Sonic quote amountIn (raw):", amountIn);

  // Ensure amountIn is a fixed-point string without scientific notation
  // const amountInStr = toFixedWithoutScientificNotation(
  //   amountIn,
  //   tokenIn.decimals
  // );
  // console.log("Sonic quote amountIn (fixed):", amountInStr);

  // // Convert amountIn to wei
  // const amountInWei = ethers.parseUnits(amountInStr, tokenIn.decimals);

  // console.log("Sonic quote amountIn (wei):", amountInWei);

  const routerAddress = "0xcC6169aA1E879d3a4227536671F85afdb2d23fAD";

  console.log("WRAPPED:", WRAPPED);
  console.log("NATIVE:", NATIVE);
  let equalizerRoute;
  if (tokenIn.name == WRAPPED.name || tokenIn.name == NATIVE.name) {
    equalizerRoute = [
      {
        from: tokenIn.address,
        to: tokenOut.address,
        stable: false, // ** Change in the future when more than one stablecoin is supported
      },
    ];
  } else {
    equalizerRoute = [
      { from: tokenIn.address, to: WRAPPED.address, stable: false },
      { from: WRAPPED.address, to: tokenOut.address, stable: false },
    ];
  }
  // const routes = [
  //   { from: tokenIn.address, to: tokenOut.address, stable: false },
  // ];

  const abi = [
    "function getAmountsOut(uint amountIn, (address from, address to, bool stable)[] routes) external view returns (uint[] memory)",
  ];
  const router = new ethers.Contract(routerAddress, abi, connectedSigner);

  try {
    // Call the router's getAmountsOut function
    const amountsOut = await router.getAmountsOut(amountIn, equalizerRoute);
    console.log("Output amounts:", amountsOut);

    const quotedAmountWei = amountsOut[amountsOut.length - 1];
    console.log("quotedAmountWei:", quotedAmountWei);

    return quotedAmountWei; // The final output token amount
  } catch (error) {
    console.error("Error getting amounts out:", error);
  }
}

// Uniswap
export async function getAmountOutWithSlippageUniswap(
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
