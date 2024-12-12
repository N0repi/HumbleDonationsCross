// slippage.js

import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { computePoolAddress, FeeAmount } from "@uniswap/v3-sdk";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json" assert { type: "json" };
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json" assert { type: "json" };
import {
  toReadableAmount,
  fromReadableAmount,
  WETH_TOKEN,
} from "./libs/conversion.mjs";

import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants";

const slippageTolerance = 0.015; // 0.004 == 0.4%   | increased tolerance for Sonic due to varying liquidity

function toFixedWithoutScientificNotation(num, decimals) {
  return Number(num).toFixed(decimals);
}
// const { chain } = useWallet();
// const chainId = chain?.id;

export default async function getAmountOutMinimum(
  tokenIn,
  tokenOut,
  amountIn,
  provider,
  chainId
) {
  if (chainId == 64165) {
    const callSonic = await slippageEqualizer(
      tokenIn,
      tokenOut,
      amountIn,
      provider,
      chainId
    );
    return callSonic;
  } else {
    const callSlippage = await slippageUniswap(
      tokenIn,
      tokenOut,
      amountIn,
      provider,
      chainId
    );
    return callSlippage;
  }
}

async function slippageEqualizer(
  tokenIn,
  tokenOut,
  amountIn,
  provider,
  chainId
) {
  console.log("Sonic slippage amountIn (raw):", amountIn);

  // Ensure amountIn is a fixed-point string without scientific notation
  const amountInStr = toFixedWithoutScientificNotation(
    amountIn,
    tokenIn.decimals
  );
  console.log("Sonic slippage amountIn (fixed):", amountInStr);

  // Convert amountIn to wei
  const amountInWei = ethers.parseUnits(amountInStr, tokenIn.decimals);

  console.log("Sonic slippage amountIn (wei):", amountInWei);

  const routerAddress = "0xf08413857AF2CFBB6edb69A92475cC27EA51453b";

  const routes = [
    { from: tokenIn.address, to: tokenOut.address, stable: false },
  ];

  const abi = [
    "function getAmountsOut(uint amountIn, (address from, address to, bool stable)[] routes) external view returns (uint[] memory)",
  ];
  const router = new ethers.Contract(routerAddress, abi, provider);

  try {
    // Call the router's getAmountsOut function
    const amountsOut = await router.getAmountsOut(amountInWei, routes);
    console.log("Output amounts:", amountsOut);

    const parseArray = amountsOut[amountsOut.length - 1];
    console.log("parseArray:", parseArray);

    const parseArrayStr = parseArray.toString();
    console.log("parseArrayStr:", parseArrayStr);
    const quotedAmountV2format = toReadableAmount(
      parseArrayStr,
      tokenIn.decimals
    );
    console.log("quotedAmountV2format:", quotedAmountV2format);

    const amountOutMinimum =
      (quotedAmountV2format * (10000 - slippageTolerance * 10000)) / 10000;
    console.log("slippageEqualizer - ", amountOutMinimum);

    return amountOutMinimum; // The final output token amount
  } catch (error) {
    console.error("Error getting amounts out:", error);
  }
}

async function slippageUniswap(tokenIn, tokenOut, amountIn, provider, chainId) {
  try {
    console.log("slippageUniswap - ChainId:", chainId);
    if (!provider) throw new Error("Provider not connected");
    if (!chainId) throw new Error("Invalid chain");

    // Validate input amount
    if (amountIn <= 0) {
      console.warn("amountIn is zero or invalid, skipping quote.");
      return 0;
    }

    // Get Uniswap configuration
    const { uniQuoter } = getConfig(chainId);
    if (!uniQuoter)
      throw new Error(`Quoter address not configured for chainId: ${chainId}`);

    console.log("Using Uniswap Quoter at address:", uniQuoter);

    // Initialize Quoter contract
    const quoterContract = new ethers.Contract(uniQuoter, Quoter.abi, provider);

    // Convert amountIn to Wei format
    const amountInWei = ethers.parseUnits(
      amountIn.toString(),
      tokenIn.decimals
    );

    console.log("Amount in Wei:", amountInWei.toString());

    // Fetch quote using Uniswap Quoter
    const quotedAmount = await quoterContract.quoteExactInputSingle(
      tokenIn.address,
      tokenOut.address,
      3000, // Fee tier (0.3%)
      amountInWei,
      0 // No sqrtPriceLimitX96
    );

    console.log("Quoted Amount:", quotedAmount);

    // Calculate slippage-adjusted minimum amount out
    const slippageBuffer = (BigInt(quotedAmount) * BigInt(150)) / BigInt(10000); // 1.5% slippage
    const amountOutMinimumWei = BigInt(quotedAmount) - slippageBuffer;

    console.log(
      "Amount Out Minimum (After Slippage):",
      amountOutMinimumWei.toString()
    );

    // Return result as a human-readable string
    return ethers.formatUnits(amountOutMinimumWei, tokenOut.decimals);
  } catch (error) {
    console.error("Error calculating Uniswap slippage:", error);

    // Fallback: Return the input amount formatted to the tokenOut decimals
    return ethers.formatUnits(
      ethers.parseUnits(amountIn.toString(), tokenOut.decimals),
      tokenOut.decimals
    );
  }
}

// async function slippageUniswap(tokenIn, tokenOut, amountIn, provider, chainId) {
//   console.log("slippage chainId:", chainId);
//   if (!provider) {
//     throw new Error("Provider not connected");
//   }
//   if (!chainId) {
//     throw new Error("Invalid chain");
//   }
//   // Validate amountIn
//   if (amountIn <= 0) {
//     console.warn("amountIn is zero or invalid, skipping quote.");
//     return 0;
//   }

//   // getConfig
//   const { uniQuoter, uniFactory } = getConfig(chainId);

//   console.log("----Slippage logs----");
//   console.log("tokenIn", tokenIn);
//   console.log("tokenOut", tokenOut);
//   console.log("amountIn", amountIn);

//   const tokenPass = new Token(
//     tokenIn.chainId,
//     tokenIn.address,
//     tokenIn.decimals,
//     tokenIn.symbol,
//     tokenIn.name
//   );

//   const QUOTER_CONTRACT_ADDRESS = uniQuoter;

//   const CurrentConfig = {
//     pool: {
//       token0: tokenPass,
//       token1: tokenOut,
//       fee: FeeAmount.MEDIUM,
//     },
//   };

//   const exactInputConfig = {
//     rpc: {
//       mainnet: provider,
//     },
//     tokens: {
//       in: tokenPass,
//       amountIn: amountIn,
//       out: tokenOut,
//       poolFee: FeeAmount.MEDIUM,
//     },
//   };

//   const currentPoolAddress = computePoolAddress({
//     factoryAddress: uniFactory,
//     tokenA: CurrentConfig.pool.token0,
//     tokenB: CurrentConfig.pool.token1,
//     fee: CurrentConfig.pool.fee,
//   });
//   console.log("Pool Address:", currentPoolAddress);

//   const poolContract = new ethers.Contract(
//     currentPoolAddress,
//     IUniswapV3Pool.abi,
//     provider
//   );

//   if (tokenIn.symbol === "WETH") {
//     const [token0, token1, fee] = await Promise.all([
//       poolContract.token1(),
//       poolContract.token0(),
//       poolContract.fee(),
//     ]);
//     const quoterContract = new ethers.Contract(
//       QUOTER_CONTRACT_ADDRESS,
//       Quoter.abi,
//       provider
//     );

//     // Convert amountIn to a fixed-point string without scientific notation
//     const fixedAmountIn = toFixedWithoutScientificNotation(
//       amountIn,
//       tokenIn.decimals
//     );
//     console.log("amountIn 2:", amountIn);
//     console.log("fixedAmountIn:", fixedAmountIn);

//     function formatToDecimals(value, decimals) {
//       const factor = Math.pow(10, decimals);
//       return (Math.floor(value * factor) / factor).toFixed(decimals);
//     }
//     const formattedAmountIn = formatToDecimals(amountIn, tokenIn.decimals);

//     const params = {
//       tokenIn: token0,
//       tokenOut: token1,
//       fee: fee,
//       amountIn: ethers
//         .parseUnits(formattedAmountIn, tokenIn.decimals)
//         .toString(),
//       sqrtPriceLimitX96: 0,
//     };

//     console.log("****params.amountIn:", params.amountIn);

//     try {
//       const quotedAmountV2 =
//         await quoterContract.quoteExactInputSingle.staticCall(params);
//       console.log("Slippage value check:", slippageTolerance);
//       console.log("----Quote----");
//       console.log("quotedAmountV2:", quotedAmountV2.amountOut);

//       const quotedAmountV2format = toReadableAmount(
//         quotedAmountV2.amountOut,
//         exactInputConfig.tokens.in.decimals
//       );
//       console.log("quotedAmountV2 format:", quotedAmountV2format);
//       console.log("----Slippage----");
//       const amountOutMinimum =
//         (quotedAmountV2format * (10000 - slippageTolerance * 10000)) / 10000;

//       console.log("amountOutMinimum", amountOutMinimum);
//       console.log("amountOutMinimum Str - ", amountOutMinimum.toString());

//       return amountOutMinimum;
//     } catch (error) {
//       console.error("Error getting quote:", error);
//       throw error;
//     }
//   } else {
//     const [token0, token1, fee] = await Promise.all([
//       poolContract.token0(),
//       poolContract.token1(),
//       poolContract.fee(),
//     ]);
//     const quoterContract = new ethers.Contract(
//       QUOTER_CONTRACT_ADDRESS,
//       Quoter.abi,
//       provider
//     );

//     // Convert amountIn to a fixed-point string without scientific notation
//     const fixedAmountIn = toFixedWithoutScientificNotation(
//       amountIn,
//       tokenIn.decimals
//     );
//     console.log("amountIn 2:", amountIn);
//     console.log("fixedAmountIn:", fixedAmountIn);

//     function formatToDecimals(value, decimals) {
//       const factor = Math.pow(10, decimals);
//       return (Math.floor(value * factor) / factor).toFixed(decimals);
//     }
//     const formattedAmountIn = formatToDecimals(amountIn, tokenIn.decimals);

//     const params = {
//       tokenIn: token0,
//       tokenOut: token1,
//       fee: fee,
//       amountIn: ethers
//         .parseUnits(formattedAmountIn, tokenIn.decimals)
//         .toString(),
//       sqrtPriceLimitX96: 0,
//     };

//     console.log("****params.amountIn:", params.amountIn);

//     try {
//       const quotedAmountV2 =
//         await quoterContract.quoteExactInputSingle.staticCall(params);
//       console.log("Slippage value check:", slippageTolerance);
//       console.log("----Quote----");
//       console.log("quotedAmountV2:", quotedAmountV2.amountOut);

//       const quotedAmountV2format = toReadableAmount(
//         quotedAmountV2.amountOut,
//         exactInputConfig.tokens.in.decimals
//       );
//       console.log("quotedAmountV2 format:", quotedAmountV2format);
//       console.log("----Slippage----");
//       const amountOutMinimum =
//         (quotedAmountV2format * (10000 - slippageTolerance * 10000)) / 10000;

//       console.log("amountOutMinimum", amountOutMinimum);
//       console.log("amountOutMinimum Str - ", amountOutMinimum.toString());

//       return amountOutMinimum;
//     } catch (error) {
//       console.error("Error getting quote:", error);
//       throw error;
//     }
//   }
// }
