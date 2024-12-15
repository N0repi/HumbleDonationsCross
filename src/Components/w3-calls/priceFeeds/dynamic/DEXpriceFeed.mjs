// DEXpriceFeed.mjs

import { ethers } from "ethers";
import dotenv from "dotenv";
import {
  TradeType,
  Ether,
  Token,
  CurrencyAmount,
  Percent,
} from "@uniswap/sdk-core";
import {
  Pool,
  nearestUsableTick,
  TickMath,
  TICK_SPACINGS,
  FeeAmount,
  Trade as V3Trade,
  Route as RouteV3,
} from "@uniswap/v3-sdk";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json" assert { type: "json" };
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json" assert { type: "json" };

import {
  toReadableAmount,
  fromReadableAmount,
  getTokensForChain,
} from "../libs/conversion.mjs";
import { getEthUsdPrice, getJPYtoETHPrice } from "../CLpriceFeed.mjs";

import { computePoolAddress } from "@uniswap/v3-sdk";
import { getConfig } from "../../../../utils/constants.js";

// thirdweb
import { useWallet } from "../../../Wallet/WalletContext";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";

export async function getQuote(tokenIn, amountIn, provider, chainId) {
  const { WRAPPED, uniQuoter, uniFactory } = getConfig(chainId);
  console.log("DEXpriceFeed chainId", chainId);
  const { WETH_TOKEN } = getTokensForChain(chainId);
  console.log("getQuote log - :", tokenIn, amountIn);
  // const provider = await getConnectedProvider(thirdwebActiveAccount)
  // console.log("getQuote log - provider:", provider)

  const tokenPass = new Token(
    tokenIn.chainId,
    tokenIn.address,
    tokenIn.decimals,
    tokenIn.symbol,
    tokenIn.name
  );
  console.log("getQuote log - :", tokenPass);

  console.log("WETH log", WETH_TOKEN);

  // Determine token order based on addresses (lexicographical ordering)
  const [token0, token1] =
    tokenPass.address.toLowerCase() < WETH_TOKEN.address.toLowerCase()
      ? [tokenPass, WETH_TOKEN]
      : [WETH_TOKEN, tokenPass];

  const fees = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH]; // Possible pool fees
  let bestQuote = null;

  for (const fee of fees) {
    try {
      const currentPoolAddress = computePoolAddress({
        factoryAddress: uniFactory,
        tokenA: token0,
        tokenB: token1,
        fee,
      });
      console.log(
        `Trying pool with fee: ${fee}, Address: ${currentPoolAddress}`
      );

      const poolContract = new ethers.Contract(
        currentPoolAddress,
        IUniswapV3Pool.abi,
        provider
      );

      // Ensure the pool exists by calling a basic function
      await poolContract.token0();

      // Quoter Contract
      const quoterContract = new ethers.Contract(
        uniQuoter,
        Quoter.abi,
        provider
      );

      const actualToken0 = await poolContract.token0();

      // console.log("Quoter Contract log: ", quoterContract);

      const isTokenInToken0 =
        actualToken0.toLowerCase() === tokenPass.address.toLowerCase();
      const params = {
        tokenIn: isTokenInToken0 ? token0.address : token1.address,
        tokenOut: isTokenInToken0 ? token1.address : token0.address,
        fee,
        amountIn: ethers
          .parseUnits(amountIn.toString(), tokenPass.decimals)
          .toString(),
        sqrtPriceLimitX96: 0, // No price limit
      };

      const quotedAmountV2 =
        await quoterContract.quoteExactInputSingle.staticCall(params);

      const quotedAmountV2format = toReadableAmount(
        quotedAmountV2.amountOut,
        WETH_TOKEN.decimals // Use output token's decimals
      );

      console.log(`Quoted amount for fee ${fee}: ${quotedAmountV2format}`);
      if (
        !bestQuote ||
        parseFloat(quotedAmountV2format) > parseFloat(bestQuote.amountOut)
      ) {
        bestQuote = { fee, amountOut: quotedAmountV2format };
      }
    } catch (error) {
      console.error(`Failed to fetch quote for fee ${fee}:`, error);
      // Skip this fee if the pool doesn't exist or is inaccessible
    }
  }

  if (!bestQuote) {
    throw new Error("No valid pool found for the given token pair.");
  }

  console.log(
    `Best quote found for fee ${bestQuote.fee}: ${bestQuote.amountOut}`
  );
  return bestQuote.amountOut;
}

export async function getINtoUSD(tokenIn, amountIn, provider, chainId) {
  console.log("getINtoUSD log - :", tokenIn, amountIn);
  try {
    chainId = chainId ?? 42161; // Default to 42161 (Arbitrum) if chainId is not provided
    // Check if tokenIn is "Sonic" or "Wrapped Sonic"
    if (
      tokenIn.name === "Ethereum" ||
      tokenIn.name === "Wrapped Ether" ||
      tokenIn.name === "Sonic" ||
      tokenIn.name === "Wrapped Sonic"
    ) {
      // Get the current ETH to USD price
      const ethUsdPrice = await getEthUsdPrice(chainId);

      // Convert tokenIn to USD directly
      const tokenInUsd = amountIn * ethUsdPrice;

      // Round the value to 2 decimal places
      const roundedTokenInUsd = tokenInUsd.toFixed(2);

      // Add currency symbol
      const tokenInUsdSym = `$${roundedTokenInUsd}`;

      // Print the rounded result
      console.log(`ETH tokenIn Price in USD (rounded): ${tokenInUsdSym}`);

      return tokenInUsdSym;
    }
    // Get the quoted amount of tokenIn in WETH
    const tokenInWeth = await getQuote(tokenIn, amountIn, provider, chainId); // **ERROR**
    console.log("getINtoUSD log - tokenInWeth:", tokenInWeth);

    // Get the current ETH to USD price
    const ethUsdPrice = await getEthUsdPrice(chainId);
    console.log("getINtoUSD log - getEthUsdPrice:", ethUsdPrice);

    // Convert tokenIn to USD
    const tokenInUsd = tokenInWeth * ethUsdPrice;

    // Print the result
    console.log("tokenIn Price in USD:", tokenInUsd);

    // Round the value to 2 decimal places
    const roundedTokenInUsd = tokenInUsd.toFixed(6);

    // add currency symbol
    const tokenInUsdSym = `$${roundedTokenInUsd}`;

    // Print the rounded result
    console.log(`tokenIn Price in USD (rounded): $${roundedTokenInUsd}`);

    return tokenInUsdSym;
  } catch (error) {
    console.error("Error in getINtoUSD:", error);
    return "Invalid liquidity";
    // throw error // You might want to handle errors appropriately
  }
}

export async function getUSDtoIN(tokenIn, fixedAmountIn, provider, chainId) {
  // Get the quoted amount of IN in WETH
  chainId = chainId ?? 42161; // Default to 42161 (Arbitrum) if chainId is not provided
  if (
    tokenIn.name === "Ethereum" ||
    tokenIn.name === "Wrapped Ether" ||
    tokenIn.name === "Sonic" ||
    tokenIn.name === "Wrapped Sonic"
  ) {
    const ethUsdPrice = await getEthUsdPrice(chainId);

    const initialUsdValue = fixedAmountIn;
    const usdInTokenIn = initialUsdValue / ethUsdPrice;

    return usdInTokenIn;
  }

  const tokenInWeth = await getQuote(tokenIn, 1, provider);
  console.log("getUSDtoIN log - tokenInWeth:", tokenInWeth);

  // Get the current ETH to USD price
  const ethUsdPrice = await getEthUsdPrice(chainId);
  console.log("getUSDtoIN log - getEthUsdPrice:", ethUsdPrice);

  // ** Input your initial USD value here | 5 = $5 **
  const initialUsdValue = fixedAmountIn;
  console.log("initialUsdValue", initialUsdValue);

  // Calculate usdInTokenIn
  const usdInTokenIn = initialUsdValue / (ethUsdPrice * tokenInWeth);

  // Round the value to 2 decimal places
  // const roundedTokenInInUsd = usdInTokenIn.toFixed(2)

  // Print the full result
  console.log(`USD Price in IN: ${usdInTokenIn} IN`);

  return usdInTokenIn;
}

export async function getJPYtoIN(tokenIn, fixedAmountIn, provider, chainId) {
  // Get the quoted amount of IN in WETH
  chainId = chainId ?? 42161; // Default to 42161 (Arbitrum) if chainId is not provided
  if (
    tokenIn.name === "Ethereum" ||
    tokenIn.name === "Wrapped Ether" ||
    tokenIn.name === "Sonic" ||
    tokenIn.name === "Wrapped Sonic"
  ) {
    const ethUsdPrice = await getJPYtoETHPrice();

    const initialUsdValue = fixedAmountIn;
    const usdInTokenIn = initialUsdValue / ethUsdPrice;

    return usdInTokenIn;
  }

  const tokenInWeth = await getQuote(tokenIn, 1, provider, chainId);
  console.log("getUSDtoIN log - tokenInWeth:", tokenInWeth);

  // Get the current ETH to USD price
  const ethUsdPrice = await getJPYtoETHPrice();
  console.log("getUSDtoIN log - getEthUsdPrice:", ethUsdPrice);

  // ** Input your initial USD value here | 5 = $5 **
  const initialUsdValue = fixedAmountIn;
  console.log("initialUsdValue", initialUsdValue);

  // Calculate usdInTokenIn
  const usdInTokenIn = initialUsdValue / (ethUsdPrice * tokenInWeth);

  // Round the value to 2 decimal places
  // const roundedTokenInInUsd = usdInTokenIn.toFixed(2)

  // Print the full result
  console.log(`USD Price in IN: ${usdInTokenIn} IN`);

  return usdInTokenIn;
}

export async function getINtoJPY(tokenIn, amountIn, provider, chainId) {
  console.log("getINtoJPY log - :", tokenIn, amountIn);
  try {
    // Check if tokenIn is "Sonic" or "Wrapped Sonic"
    if (
      tokenIn.name === "Ethereum" ||
      tokenIn.name === "Wrapped Ether" ||
      tokenIn.name === "Sonic" ||
      tokenIn.name === "Wrapped Sonic"
    ) {
      // Get the current ETH to JPY price
      const ethJpyPrice = await getJPYtoETHPrice();

      // Convert tokenIn to JPY directly
      const tokenInJpy = amountIn * ethJpyPrice;

      // Round the value to 2 decimal places
      const roundedTokenInJpy = tokenInJpy.toFixed(2);

      // Add currency symbol
      const tokenInJpySym = `¥${roundedTokenInJpy}`;

      // Print the rounded result
      console.log(`tokenIn Price in JPY (rounded): ${tokenInJpySym}`);

      return tokenInJpySym;
    }
    // Get the quoted amount of tokenIn in WETH
    const tokenInWeth = await getQuote(tokenIn, amountIn, provider, chainId);
    console.log("getINtoJPY log - tokenInWeth:", tokenInWeth);

    // Get the current ETH to JPY price
    const ethJpyPrice = await getJPYtoETHPrice();
    console.log("getINtoJPY log - getEthJpyPrice:", ethJpyPrice);

    // Convert tokenIn to JPY
    const tokenInJpy = tokenInWeth * ethJpyPrice;

    // Print the result
    console.log("tokenIn Price in JPY:", tokenInJpy);

    // Round the value to 2 decimal places
    const roundedTokenInJpy = tokenInJpy.toFixed(2);

    // add currency symbol
    const tokenInJpySym = `¥${roundedTokenInJpy}`;

    // Print the rounded result
    console.log(`tokenIn Price in JPY (rounded): ¥${roundedTokenInJpy}`);

    return tokenInJpySym;
  } catch (error) {
    console.error("Error in getINtoJPY:", error);
    return "Invalid liquidity";
    // throw error // You might want to handle errors appropriately
  }
}
