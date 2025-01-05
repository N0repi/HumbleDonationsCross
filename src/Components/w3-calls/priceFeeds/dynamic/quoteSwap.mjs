// quoteSwap.mjs

import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { FeeAmount, Trade as V3Trade, Route as RouteV3 } from "@uniswap/v3-sdk";
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

// Uniswap: Arbitrum, Sepolia
export async function getQuote(tokenIn, tokenOut, amountIn, provider, chainId) {
  console.log("quoteSwap chainId", chainId);
  const { WRAPPED, NATIVE, uniQuoter, uniFactory } = getConfig(chainId);

  if (!WRAPPED) {
    throw new Error(`WRAPPED address not configured for chainId: ${chainId}`);
  }

  console.log("chainId passed to getQuote:", chainId);

  // Replace native currency with WRAPPED
  if (tokenIn.name === NATIVE.name) {
    tokenIn = {
      ...tokenIn,
      name: "Wrapped Ether",
      address: WRAPPED,
      symbol: "W" + NATIVE.symbol,
    };
  }
  if (tokenOut.name === NATIVE.name) {
    tokenOut = {
      ...tokenOut,
      name: "Wrapped Ether",
      address: WRAPPED,
      symbol: "W" + NATIVE.symbol,
    };
  }

  // Convert tokens into Uniswap-compatible Token objects
  const tokenAddressIn =
    typeof tokenIn.address === "string"
      ? tokenIn.address
      : tokenIn.address.address;
  const tokenAddressOut =
    typeof tokenOut.address === "string"
      ? tokenOut.address
      : tokenOut.address.address;

  const tokenPass = new Token(
    chainId,
    tokenAddressIn,
    tokenIn.decimals,
    tokenIn.symbol,
    tokenIn.name
  );

  const tokenPass2 = new Token(
    chainId,
    tokenAddressOut,
    tokenOut.decimals,
    tokenOut.symbol,
    tokenOut.name
  );

  // Determine token order based on addresses (lexicographical ordering)
  const [token0, token1] =
    tokenPass.address.toLowerCase() < tokenPass2.address.toLowerCase()
      ? [tokenPass, tokenPass2]
      : [tokenPass2, tokenPass];

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

      // Dynamically determine input and output tokens based on pool order
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
        tokenPass2.decimals // Use output token's decimals
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

// Equalizer: Sonic
function toFixedWithoutScientificNotation(num, decimals) {
  return Number(num).toFixed(decimals);
}
export async function getQuoteSonic(
  tokenIn,
  tokenOut,
  amountIn,
  connectedSigner,
  chainId
) {
  console.log("quoteSwap chainId", chainId);
  const { WRAPPED, NATIVE } = getConfig(chainId);

  if (!WRAPPED) {
    throw new Error(`WRAPPED address not configured for chainId: ${chainId}`);
  }

  console.log("chainId passed to getQuote:", chainId);

  // Replace native currency with WRAPPED
  if (tokenIn.name === NATIVE.name) {
    tokenIn = WRAPPED;
  }
  if (tokenOut.name === NATIVE.name) {
    tokenIn = WRAPPED;
  }

  console.log("tokenIn:", tokenIn);
  console.log("Sonic quote amountIn (raw):", amountIn);

  // Ensure amountIn is a fixed-point string without scientific notation
  const amountInStr = toFixedWithoutScientificNotation(
    amountIn,
    tokenIn.decimals
  );
  console.log("Sonic quote amountIn (fixed):", amountInStr);

  // Convert amountIn to wei
  const amountInWei = ethers.parseUnits(amountInStr, tokenIn.decimals);

  console.log("Sonic quote amountIn (wei):", amountInWei);

  const routerAddress = "0xcC6169aA1E879d3a4227536671F85afdb2d23fAD";

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

  const abi = [
    "function getAmountsOut(uint amountIn, (address from, address to, bool stable)[] routes) external view returns (uint[] memory)",
  ];
  const router = new ethers.Contract(routerAddress, abi, connectedSigner);

  try {
    // Call the router's getAmountsOut function
    const amountsOut = await router.getAmountsOut(amountInWei, equalizerRoute);
    console.log("Equalizer output amounts:", amountsOut);

    const quotedAmountWei = amountsOut[amountsOut.length - 1];
    console.log(" Equalizer quotedAmountWei:", quotedAmountWei);

    console.log("Equalizer quote:", quotedAmountWei);
    return quotedAmountWei; // The final output token amount
  } catch (error) {
    console.error("Error getting amounts out:", error);
  }
}
