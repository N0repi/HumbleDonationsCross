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

const slippageTolerance = 0.985; // 0.004 == 0.4%   | increased tolerance for Sonic due to varying liquidity

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
