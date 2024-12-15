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
  getTokensForChain,
} from "./libs/conversion.mjs";

import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants";

const slippageTolerance = 0.015; // 0.04 == 0.4%   | increased tolerance for Sonic due to varying liquidity

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

  try {
    // Call the router's getAmountsOut function
    // const amountsOut = await router.getAmountsOut(amountInWei, routes);
    // console.log("Output amounts:", amountsOut);

    // const quotedAmountWei = amountsOut[amountsOut.length - 1];
    // console.log("quotedAmountWei:", quotedAmountWei);

    // const quotedAmountWeiStr = quotedAmountWei.toString();
    // console.log("quotedAmountWeiStr:", quotedAmountWeiStr);

    const EqualizerQuote = await getQuoteSonic(
      tokenIn,
      tokenOut,
      amountIn,
      provider,
      chainId
    );

    const slippageBuffer =
      (BigInt(EqualizerQuote) * BigInt(slippageTolerance * 10000)) /
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

    const quotedAmountWei = amountsOut[amountsOut.length - 1];
    console.log("quotedAmountWei:", quotedAmountWei);

    return quotedAmountWei; // The final output token amount
  } catch (error) {
    console.error("Error getting amounts out:", error);
  }
}

// Recieve swap quote and calculate slippage from quote
async function slippageUniswap(tokenIn, tokenOut, amountIn, provider, chainId) {
  try {
    console.log("slippageUniswap tokenOut:", tokenOut);
    console.log("slippageUniswap amountIn:", amountIn);
    const amountOut = await getQuote(
      tokenIn,
      tokenOut,
      amountIn,
      provider,
      chainId
    );
    console.log("amountOut: Quoted Amount (BigNumber):", amountOut);

    // Convert quoted amount to BigInt
    const quotedAmountWei = BigInt(amountOut.toString());
    console.log("Quoted Amount:", amountOut);

    // apply slippage tolerance (everything needs to be in BigInt [n]) ->>> send BigInt slippage to `donate`
    const slippageBuffer =
      (BigInt(quotedAmountWei) * BigInt(slippageTolerance * 10000)) /
      BigInt(10000);
    const amountOutMinimum = BigInt(quotedAmountWei) - slippageBuffer;

    console.log("Slippage Buffer:", slippageBuffer);

    console.log("Amount Out Minimum:", amountOutMinimum);

    const amountOutMinimumParsed = ethers.formatUnits(
      amountOutMinimum.toString(),
      tokenIn.decimals
    );
    console.log("amountOutMinimumParsed:", amountOutMinimumParsed);

    return amountOutMinimum;
  } catch (error) {
    console.error("Error calculating Uniswap slippage:", error);
    throw error;
  }
}

// Iteratively check all of the pools and find the best route, then send swap quote to `slippageUniswap`
export async function getQuote(tokenIn, tokenOut, amountIn, provider, chainId) {
  const { uniQuoter, uniFactory } = getConfig(chainId);
  console.log("chainId:", chainId);
  const { WETH_TOKEN } = getTokensForChain(chainId);

  const tokenPass = new Token(
    tokenIn.chainId,
    tokenIn.address,
    tokenIn.decimals,
    tokenIn.symbol,
    tokenIn.name
  );

  const tokenPassOut = new Token(
    tokenOut.chainId,
    tokenOut.address,
    tokenOut.decimals,
    tokenOut.symbol,
    tokenOut.name
  );

  console.log("----getQuote----");
  console.log("amountIn:", amountIn);
  console.log("tokenIn.address:", tokenIn.address);
  console.log("tokenPass.address:", tokenPass.address);

  // Determine token order
  const isTokenPassWETH =
    tokenPass.address.toLowerCase() === WETH_TOKEN.address.toLowerCase();
  const isTokenPassOutWETH =
    tokenPassOut.address.toLowerCase() === WETH_TOKEN.address.toLowerCase();

  const [token0, token1] = isTokenPassWETH
    ? [tokenPass, tokenPassOut]
    : isTokenPassOutWETH
    ? [tokenPassOut, tokenPass]
    : tokenPass.address.toLowerCase() < tokenPassOut.address.toLowerCase()
    ? [tokenPass, tokenPassOut]
    : [tokenPassOut, tokenPass];

  console.log("0-----", token0);
  console.log("1-----", token1);

  const fees = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
  let bestQuote = null;

  for (const fee of fees) {
    try {
      const poolAddress = computePoolAddress({
        factoryAddress: uniFactory,
        tokenA: token0,
        tokenB: token1,
        fee,
      });

      console.log(`Trying pool with fee: ${fee}, Address: ${poolAddress}`);

      const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3Pool.abi,
        provider
      );

      // Check if the pool exists
      await poolContract.token0();

      const quoterContract = new ethers.Contract(
        uniQuoter,
        Quoter.abi,
        provider
      );

      const isTokenInToken0 =
        (await poolContract.token0()).toLowerCase() ===
        tokenPass.address.toLowerCase();

      const params = {
        tokenIn: isTokenInToken0 ? token0.address : token1.address,
        tokenOut: isTokenInToken0 ? token1.address : token0.address,
        fee,
        amountIn: ethers.parseUnits(amountIn.toString(), tokenPass.decimals),
        sqrtPriceLimitX96: 0,
      };

      console.log("slippage quote params:", params);

      const quotedAmount =
        await quoterContract.quoteExactInputSingle.staticCall(params);

      // `quotedAmount.amountOut` is a BigNumber, scale to BigInt
      const quotedAmountScaled = quotedAmount.amountOut;

      if (!bestQuote || quotedAmountScaled > bestQuote.amountOut) {
        bestQuote = { fee, poolAddress, amountOut: quotedAmountScaled };
      }
    } catch (error) {
      console.warn(`Failed to fetch quote for fee ${fee}:`, error);
    }
  }

  if (!bestQuote) {
    throw new Error("No valid pool found for the given token pair.");
  }

  console.log(
    `Best quote found for Fee: ${bestQuote.fee}, Pool: ${bestQuote.poolAddress}, Quote: ${bestQuote.amountOut}`
  );
  return bestQuote.amountOut; // { fee, amountOut: BigInt }
}

const feeTiers = [500, 3000, 10000]; // Supported fee tiers

async function validatePool(uniFactory, provider, tokenIn, tokenOut) {
  const tokenA = new Token(
    tokenIn.chainId,
    tokenIn.address,
    tokenIn.decimals,
    tokenIn.symbol,
    tokenIn.name
  );

  const tokenB = new Token(
    tokenOut.chainId,
    tokenOut.address,
    tokenOut.decimals,
    tokenOut.symbol,
    tokenOut.name
  );

  for (const fee of feeTiers) {
    const poolAddress = computePoolAddress({
      factoryAddress: uniFactory,
      tokenA: tokenA,
      tokenB: tokenB,
      fee: fee,
    });

    console.log(`Checking pool: ${poolAddress} with fee: ${fee}`);

    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3Pool.abi,
      provider
    );
    try {
      const [token0, token1] = await Promise.all([
        poolContract.token1(),
        poolContract.token0(),
      ]);

      console.log("Pool Token0:", token0);
      console.log("Pool Token1:", token1);

      if (
        [token0.toLowerCase(), token1.toLowerCase()].includes(
          tokenIn.address.toLowerCase()
        ) &&
        [token0.toLowerCase(), token1.toLowerCase()].includes(
          tokenOut.address.toLowerCase()
        )
      ) {
        console.log(`Valid pool found at ${poolAddress} with fee: ${fee}`);
        return { poolAddress, fee };
      }
    } catch (error) {
      console.log(`Pool does not exist for fee: ${fee}`);
    }
  }
  throw new Error(
    "No valid pool exists for the given token pair and fee tiers."
  );
}

async function slippageUniswapOriginal(
  tokenIn,
  tokenOut,
  amountIn,
  provider,
  chainId
) {
  console.log("slippage chainId:", chainId);
  if (!provider) {
    throw new Error("Provider not connected");
  }
  if (!chainId) {
    throw new Error("Invalid chain");
  }
  // Validate amountIn
  if (amountIn <= 0) {
    console.warn("amountIn is zero or invalid, skipping quote.");
    return 0;
  }

  // getConfig
  const { uniQuoter, uniFactory } = getConfig(chainId);

  console.log("----Slippage logs----");
  console.log("tokenIn", tokenIn);
  console.log("tokenOut", tokenOut);
  console.log("amountIn", amountIn);

  const tokenPass = new Token(
    tokenIn.chainId,
    tokenIn.address,
    tokenIn.decimals,
    tokenIn.symbol,
    tokenIn.name
  );

  const QUOTER_CONTRACT_ADDRESS = uniQuoter;

  const CurrentConfig = {
    pool: {
      token0: tokenPass,
      token1: tokenOut,
      fee: FeeAmount.MEDIUM,
    },
  };

  const exactInputConfig = {
    rpc: {
      mainnet: provider,
    },
    tokens: {
      in: tokenPass,
      amountIn: amountIn,
      out: tokenOut,
      poolFee: FeeAmount.MEDIUM,
    },
  };

  const currentPoolAddress = computePoolAddress({
    factoryAddress: uniFactory,
    tokenA: CurrentConfig.pool.token0,
    tokenB: CurrentConfig.pool.token1,
    fee: CurrentConfig.pool.fee,
  });
  console.log("Pool Address:", currentPoolAddress);

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3Pool.abi,
    provider
  );

  if (tokenIn.symbol === "WETH") {
    const [token0, token1, fee] = await Promise.all([
      poolContract.token1(),
      poolContract.token0(),
      poolContract.fee(),
    ]);
    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      Quoter.abi,
      provider
    );

    // Convert amountIn to a fixed-point string without scientific notation
    const fixedAmountIn = toFixedWithoutScientificNotation(
      amountIn,
      tokenIn.decimals
    );
    console.log("amountIn 2:", amountIn);
    console.log("fixedAmountIn:", fixedAmountIn);

    function formatToDecimals(value, decimals) {
      const factor = Math.pow(10, decimals);
      return (Math.floor(value * factor) / factor).toFixed(decimals);
    }
    const formattedAmountIn = formatToDecimals(amountIn, tokenIn.decimals);

    const params = {
      tokenIn: token0,
      tokenOut: token1,
      fee: fee,
      amountIn: ethers
        .parseUnits(formattedAmountIn, tokenIn.decimals)
        .toString(),
      sqrtPriceLimitX96: 0,
    };

    console.log("****params.amountIn:", params.amountIn);

    try {
      const quotedAmountV2 =
        await quoterContract.quoteExactInputSingle.staticCall(params);
      console.log("Slippage value check:", slippageTolerance);
      console.log("----Quote----");
      console.log("quotedAmountV2:", quotedAmountV2.amountOut);

      const quotedAmountV2format = toReadableAmount(
        quotedAmountV2.amountOut,
        exactInputConfig.tokens.in.decimals
      );
      console.log("quotedAmountV2 format:", quotedAmountV2format);
      console.log("----Slippage----");
      const amountOutMinimum =
        (quotedAmountV2format * (10000 - slippageTolerance * 10000)) / 10000;

      console.log("amountOutMinimum", amountOutMinimum);
      console.log("amountOutMinimum Str - ", amountOutMinimum.toString());

      return amountOutMinimum;
    } catch (error) {
      console.error("Error getting quote:", error);
      throw error;
    }
  } else {
    const [token0, token1, fee] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
    ]);
    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      Quoter.abi,
      provider
    );

    // Convert amountIn to a fixed-point string without scientific notation
    const fixedAmountIn = toFixedWithoutScientificNotation(
      amountIn,
      tokenIn.decimals
    );
    console.log("amountIn 2:", amountIn);
    console.log("fixedAmountIn:", fixedAmountIn);

    function formatToDecimals(value, decimals) {
      const factor = Math.pow(10, decimals);
      return (Math.floor(value * factor) / factor).toFixed(decimals);
    }
    const formattedAmountIn = formatToDecimals(amountIn, tokenIn.decimals);

    const params = {
      tokenIn: token0,
      tokenOut: token1,
      fee: fee,
      amountIn: ethers
        .parseUnits(formattedAmountIn, tokenIn.decimals)
        .toString(),
      sqrtPriceLimitX96: 0,
    };

    console.log("****params.amountIn:", params.amountIn);

    try {
      const quotedAmountV2 =
        await quoterContract.quoteExactInputSingle.staticCall(params);
      console.log("Slippage value check:", slippageTolerance);
      console.log("----Quote----");
      console.log("quotedAmountV2:", quotedAmountV2.amountOut);

      const quotedAmountV2format = toReadableAmount(
        quotedAmountV2.amountOut,
        exactInputConfig.tokens.in.decimals
      );
      console.log("quotedAmountV2 format:", quotedAmountV2format);
      console.log("----Slippage----");
      const amountOutMinimum =
        (quotedAmountV2format * (10000 - slippageTolerance * 10000)) / 10000;

      console.log("amountOutMinimum", amountOutMinimum);
      console.log("amountOutMinimum Str - ", amountOutMinimum.toString());

      return amountOutMinimum;
    } catch (error) {
      console.error("Error getting quote:", error);
      throw error;
    }
  }
}
