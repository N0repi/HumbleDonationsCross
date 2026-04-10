/**
 * Server-only implied USD for HDT on Arbitrum One via Uniswap V3:
 * HDT → WETH → USDC (native Circle USDC, 6 decimals).
 *
 * Uses the same router addresses as the in-app DEX helpers; no React / wallet.
 * Intended for API routes (e.g. create-checkout-session) so token amounts are
 * not client-authoritative.
 */

import { createRequire } from "module";
import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { computePoolAddress, FeeAmount } from "@uniswap/v3-sdk";

const require = createRequire(import.meta.url);
const IUniswapV3Pool = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");
const Quoter = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");

/** @type {const} */
export const ARBITRUM_ONE_CHAIN_ID = 42161;

const ADDR = {
  weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  hdt: "0xBabe35F94fE6076474F65771Df60d99cb097323A",
  /** Native USDC on Arbitrum One (not USDC.e) */
  usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  uniQuoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  uniFactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
};

const FEES = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];

function tokens() {
  const chainId = ARBITRUM_ONE_CHAIN_ID;
  return {
    HDT: new Token(chainId, ADDR.hdt, 18, "HDT", "Humble Donations Token"),
    WETH: new Token(chainId, ADDR.weth, 18, "WETH", "Wrapped Ether"),
    USDC: new Token(chainId, ADDR.usdc, 6, "USDC", "USD Coin"),
  };
}

/**
 * Best exact-in quote across LOW/MEDIUM/HIGH fee tiers (amount out is maximized).
 * @param {ethers.JsonRpcProvider} provider
 * @param {import("@uniswap/sdk-core").Token} tokenIn
 * @param {import("@uniswap/sdk-core").Token} tokenOut
 * @param {bigint} amountInWei
 * @returns {Promise<bigint>}
 */
export async function quoteExactInputBestFee(
  provider,
  tokenIn,
  tokenOut,
  amountInWei,
) {
  const quoterContract = new ethers.Contract(
    ADDR.uniQuoter,
    Quoter.abi,
    provider,
  );

  const [t0, t1] =
    tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase()
      ? [tokenIn, tokenOut]
      : [tokenOut, tokenIn];

  let bestOut = 0n;

  for (const fee of FEES) {
    const poolAddress = computePoolAddress({
      factoryAddress: ADDR.uniFactory,
      tokenA: t0,
      tokenB: t1,
      fee,
    });

    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3Pool.abi,
      provider,
    );

    try {
      await poolContract.token0();
    } catch {
      continue;
    }

    const actualToken0 = await poolContract.token0();
    const isTokenInToken0 =
      actualToken0.toLowerCase() === tokenIn.address.toLowerCase();

    const params = {
      tokenIn: isTokenInToken0 ? t0.address : t1.address,
      tokenOut: isTokenInToken0 ? t1.address : t0.address,
      fee,
      amountIn: amountInWei.toString(),
      sqrtPriceLimitX96: 0,
    };

    try {
      const { amountOut } =
        await quoterContract.quoteExactInputSingle.staticCall(params);
      const out = BigInt(amountOut);
      if (out > bestOut) bestOut = out;
    } catch {
      // pool/route unavailable for this fee
    }
  }

  if (bestOut === 0n) {
    throw new Error(
      `No Uniswap V3 quote for ${tokenIn.symbol} → ${tokenOut.symbol} (check liquidity / addresses).`,
    );
  }

  return bestOut;
}

/**
 * USDC (raw 6 decimals) received for exactly 1 HDT (1e18 wei).
 * @param {string} [rpcUrl] – defaults to process.env.RPC_URL_ARB
 * @param {ethers.JsonRpcProvider} [provider]
 * @returns {Promise<{ usdcOutPer1Hdt: bigint, usdPerHdt: string, provider: ethers.JsonRpcProvider }>}
 */
export async function getHdtToUsdcViaWeth(rpcUrl, provider) {
  const url = [rpcUrl, process.env.RPC_URL_ARB, process.env.ARBITRUM_RPC_URL]
    .find((x) => typeof x === "string" && x.trim().length > 0)
    ?.trim();
  if (!provider && !url) {
    throw new Error(
      "Missing Arbitrum JSON-RPC URL (pass rpcUrl or set RPC_URL_ARB / ARBITRUM_RPC_URL).",
    );
  }
  const p = provider ?? new ethers.JsonRpcProvider(url);

  const { HDT, WETH, USDC } = tokens();
  const oneHdt = ethers.parseUnits("1", 18);

  const wethOut = await quoteExactInputBestFee(p, HDT, WETH, oneHdt);
  const usdcOut = await quoteExactInputBestFee(p, WETH, USDC, wethOut);

  return {
    usdcOutPer1Hdt: usdcOut,
    usdPerHdt: ethers.formatUnits(usdcOut, 6),
    provider: p,
  };
}

/**
 * HDT amount (human string, 18 decimals) for a net USD budget after your fee haircut.
 * Uses integer math: netMicro = round(chargedUsd * 1e6 * netUsdFraction),
 * hdtWei = netMicro * 1e18 / usdcOutPer1Hdt.
 *
 * @param {object} opts
 * @param {number} opts.chargedUsd – USD actually charged on Stripe (e.g. tier price)
 * @param {bigint} opts.usdcOutPer1Hdt – from getHdtToUsdcViaWeth
 * @param {number} [opts.netUsdFraction=0.94] – portion of charged USD that becomes user HDT notional
 * @returns {{ hdtHuman: string, hdtWei: bigint }}
 */
export function hdtForChargedUsd({
  chargedUsd,
  usdcOutPer1Hdt,
  netUsdFraction = 0.94,
}) {
  if (!(chargedUsd > 0) || !Number.isFinite(chargedUsd)) {
    throw new Error("chargedUsd must be a finite positive number");
  }
  if (!(netUsdFraction > 0) || netUsdFraction > 1) {
    throw new Error("netUsdFraction must be in (0, 1]");
  }
  if (usdcOutPer1Hdt <= 0n) {
    throw new Error("usdcOutPer1Hdt must be positive");
  }

  const netMicro = BigInt(Math.round(chargedUsd * 1_000_000 * netUsdFraction));
  const hdtWei = (netMicro * 10n ** 18n) / usdcOutPer1Hdt;

  return {
    hdtWei,
    hdtHuman: ethers.formatUnits(hdtWei, 18),
  };
}

/**
 * Convenience: RPC → implied USD/HDT, then HDT payout for a charged tier.
 * @param {object} opts
 * @param {number} opts.chargedUsd
 * @param {number} [opts.netUsdFraction=0.94]
 * @param {string} [opts.rpcUrl]
 * @returns {Promise<{ usdPerHdt: string, usdcOutPer1Hdt: bigint, hdtHuman: string, hdtWei: bigint }>}
 */
export async function getCheckoutHdtAmount(opts) {
  const { chargedUsd, netUsdFraction = 0.94, rpcUrl } = opts;
  const { usdcOutPer1Hdt, usdPerHdt } = await getHdtToUsdcViaWeth(rpcUrl);
  const { hdtHuman, hdtWei } = hdtForChargedUsd({
    chargedUsd,
    usdcOutPer1Hdt,
    netUsdFraction,
  });
  return { usdPerHdt, usdcOutPer1Hdt, hdtHuman, hdtWei };
}
