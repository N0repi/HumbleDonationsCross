// CLpriceFeed.mjs

import { ethers } from "ethers";
import aggregatorV3InterfaceABI from "./abis/aggregatorV3InterfaceABI.json" assert { type: "json" };
import { getConfig } from "../../../utils/constants.js";

// Read-only RPCs for Chainlink calls. Wallet / AA providers often fail eth_call to oracles
// (missing revert data) while public nodes return round data reliably.
function getOracleReadProvider(chainId) {
  if (chainId === 146) {
    return new ethers.JsonRpcProvider("https://fantom-rpc.publicnode.com");
  }
  if (chainId === 42161) {
    return new ethers.JsonRpcProvider("https://arbitrum-one.publicnode.com");
  }
  if (chainId === 11155111) {
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY;
    if (alchemyKey) {
      return new ethers.JsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
      );
    }
    return new ethers.JsonRpcProvider("https://ethereum-sepolia.publicnode.com");
  }
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider("https://arbitrum-one.publicnode.com");
}

// Dynamically fetch price data based on chainId and selected provider
async function fetchPriceData(feedAddress, chainId) {
  const provider = getOracleReadProvider(chainId);
  const priceFeed = new ethers.Contract(
    feedAddress,
    aggregatorV3InterfaceABI,
    provider
  );

  const roundData = await priceFeed.latestRoundData();
  return roundData.answer;
}

// Fetch ETH to USD price based on chainId
export async function getEthUsdPrice(chainId) {
  const { ETHUSD } = getConfig(chainId);
  const usdPrice = await fetchPriceData(ETHUSD, chainId);
  const scaledUsdPrice = ethers.formatUnits(usdPrice, 8);
  console.log("USD price of ETH (fixed-point scaled):", scaledUsdPrice);
  return scaledUsdPrice;
}

// Fetch JPY to USD price based on chainId
export async function getJPYtoUSDPrice(chainId) {
  const { JPYUSD } = getConfig(chainId);
  const jpyPrice = await fetchPriceData(JPYUSD, chainId);
  const scaledJpyPrice = ethers.formatUnits(jpyPrice, 8);
  console.log("USD price of JPY (fixed-point scaled):", scaledJpyPrice);
  return scaledJpyPrice;
}

// Calculate JPY to ETH price using ETH to USD and JPY to USD
export async function getJPYtoETHPrice(chainId) {
  try {
    const jpyToUsdPrice = await getJPYtoUSDPrice(chainId);
    const ethUsdPrice = await getEthUsdPrice(chainId);
    const jpyToEthPrice = ethUsdPrice / jpyToUsdPrice;
    console.log(`JPY to ETH price: ${jpyToEthPrice}`);
    return jpyToEthPrice;
  } catch (error) {
    console.warn("JPY/ETH oracle price unavailable:", error.message);
    throw error;
  }
}
