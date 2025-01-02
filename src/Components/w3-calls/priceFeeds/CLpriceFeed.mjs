// CLpriceFeed.mjs

import { ethers } from "ethers";
import aggregatorV3InterfaceABI from "./abis/aggregatorV3InterfaceABI.json" assert { type: "json" };
import { getConfig } from "../../../utils/constants.js";

// Function to dynamically choose the provider based on the chainId
function getProvider(chainId) {
  if (chainId === 146) {
    // Use Fantom Opera's public RPC for Sonic
    return new ethers.JsonRpcProvider("https://fantom-rpc.publicnode.com");
  } else {
    // Default to using the connected wallet's provider for Sepolia
    return new ethers.BrowserProvider(window.ethereum);
  }
}

// Dynamically fetch price data based on chainId and selected provider
async function fetchPriceData(feedAddress, chainId) {
  const provider = getProvider(chainId);
  const priceFeed = new ethers.Contract(
    feedAddress,
    aggregatorV3InterfaceABI,
    provider
  );

  try {
    const roundData = await priceFeed.latestRoundData();
    const price = roundData.answer;
    return price;
  } catch (error) {
    console.error(`Error fetching price from ${feedAddress}:`, error.message);
    throw error;
  }
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
    console.error("Error calculating JPY/ETH price:", error.message);
    throw error;
  }
}
