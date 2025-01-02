// payProcessTokenIdAbstracted.mjs

import { ethers } from "ethers";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import getAmountOutMinimum, {
  getQuote,
  getQuoteSonic,
} from "./priceFeeds/slippage";
import { getTokensForChain } from "./priceFeeds/libs/conversion.mjs";
import { computeMerkleProof } from "./whiteList/merkle";
import { approve } from "thirdweb/extensions/erc20";
import { getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { client } from "../../Components/Model/thirdWebClient";
import erc20ABI from "./erc20.json" assert { type: "json" };
import { getConfig } from "../../utils/constants.js";

function toFixedWithoutScientificNotation(num, decimals) {
  return Number(num).toFixed(decimals);
}

async function getNetworkConfig(chainId) {
  const { contractAddress, ABI, NATIVE, HDT, explorer } = getConfig(
    chainId || 42161
  );
  return { contractAddress, ABI, NATIVE, HDT, explorer };
}

async function ethersGetPercentage(chain, contractAddress, ABI) {
  const provider = ethers6Adapter.provider.toEthers({
    client: client,
    chain: chain,
  });
  const HumbleDonations = new ethers.Contract(contractAddress, ABI, provider);
  try {
    const percentage = await HumbleDonations.getPercentage();
    return percentage;
  } catch (error) {
    console.error("Error fetching getPercentage:", error);
    throw error;
  }
}

async function getContractERC20(tokenInput, chain) {
  return getContract({
    client: client,
    chain: chain,
    address: tokenInput.address,
    abi: erc20ABI,
  });
}

async function validateToken(tokenInput, chainId) {
  console.log("validateToken tokenInput address:", tokenInput);

  const lowerCaseAddress = tokenInput.toLowerCase();

  const checkWhiteListProof = await computeMerkleProof(
    lowerCaseAddress,
    chainId
  );
  console.log("checkWhiteListProof log:", checkWhiteListProof);

  if (checkWhiteListProof.length > 0) {
    console.log(`Token at address ${tokenInput} is in the whitelist.`);
  } else {
    console.log(`Token at address ${tokenInput} is NOT in the whitelist.`);
  }

  return checkWhiteListProof;
}

async function calculateSlippage(
  tokenId,
  tokenQuantity,
  tokenInput,
  taxPercentage,
  chain
) {
  console.log("chain:", chain);
  const chainId = chain.id;
  console.log("chainId:", chainId);
  const { WETH_TOKEN, HDT_TOKEN } = getTokensForChain(chainId);
  const { NATIVE } = await getNetworkConfig(chainId);

  const ETH = {
    name: NATIVE.name,
    address: "0x0000000000000000000000000000000000000000",
  };

  const provider = ethers6Adapter.provider.toEthers({
    client: client,
    chain: chain,
  });

  console.log("thirdweb chain:", chain);

  // Calculate the tax amount
  const formattedTaxPercentage = (Number(taxPercentage) / 1000).toString();
  console.log("Tax Percentage:", formattedTaxPercentage);

  const taxAmount = tokenQuantity * formattedTaxPercentage;
  console.log("Tax Amount:", taxAmount);

  console.log("HDT address:", HDT_TOKEN);
  if (tokenInput.address === HDT_TOKEN.address) {
    console.log("HDT donation - no slippage required.", chainId);
    return { slippageETH: 0, slippageHDT: 0 };
  }
  let tokenInWETHquote;

  if (
    tokenInput.address === WETH_TOKEN.address ||
    tokenInput.name === ETH.name
  ) {
    console.log("tokenInput is WETH or ETH, skipping getQuote...");
    tokenInWETHquote = ethers.parseUnits(
      toFixedWithoutScientificNotation(taxAmount, 18),
      18
    );
  } else {
    if (
      chainId === 146 // Special handling for Sonic
    ) {
      console.log("Using Sonic-specific logic...");
      const slippageResult = await getQuoteSonic(
        tokenInput,
        WETH_TOKEN,
        toFixedWithoutScientificNotation(taxAmount, 18),
        provider,
        chainId
      );
      tokenInWETHquote = slippageResult;
    }
    console.log("Getting quote for tokenInput to WETH...");
    // console.log("WETH_TOKEN:", WETH_TOKEN);
    // tokenInWETHquote = await getQuote(
    //   tokenInput,
    //   WETH_TOKEN,
    //   toFixedWithoutScientificNotation(taxAmount, 18),
    //   provider,
    //   chainId
    // );
  }
  console.log("tokenInWETHquote:", tokenInWETHquote);

  const WETHquoteDecimals = ethers.formatUnits(tokenInWETHquote.toString(), 18);
  console.log("WETHquoteDecimals:", WETHquoteDecimals);

  // Split amounts
  const fractionHDT = 0.25; // For HDT split
  const fractionWETH = 0.75; // For WETH split

  // Directly use tokenInWETHquote (BigInt)
  const splitWETH = (taxAmount * fractionWETH).toFixed(18); // 0.75 * taxAmount
  const splitHDT = (
    parseFloat(ethers.formatUnits(tokenInWETHquote, 18)) * fractionHDT
  ).toFixed(18); // Scaled to 18 decimals
  console.log("Split WETH:", splitWETH, "Split HDT:", splitHDT); // eg 0.00001125 WETH, 0.00000375 HDT

  let amountOutMinimumETH = 0;
  let amountOutMinimumHDT = 0;

  if (tokenInput.address !== HDT_TOKEN.address) {
    if (
      tokenInput.address === WETH_TOKEN.address ||
      tokenInput.name === ETH.name
    ) {
      // Special case: WETH or ETH as tokenIn
      console.log("Calculating slippage for HDT from WETH...");
      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT,
        provider,
        chainId
      );
    } else {
      console.log("Calculating slippage for WETH and HDT...");
      amountOutMinimumETH = await getAmountOutMinimum(
        tokenInput,
        WETH_TOKEN,
        taxAmount,
        provider,
        chainId
      );

      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT,
        provider,
        chainId
      );
    }
  } else {
    console.log("HDT donation - no slippage required.");
  }

  console.log(
    "Final Slippage Calculations:",
    "ETH Min:",
    amountOutMinimumETH,
    "HDT Min:",
    amountOutMinimumHDT
  );

  // Format the values for Uniswap logic
  const slippageETH = amountOutMinimumETH;
  // amountOutMinimumETH > 0
  //   ? ethers.formatUnits(amountOutMinimumETH.toString(), tokenInput.decimals)
  //   : "0";

  const slippageHDT = amountOutMinimumHDT;
  // amountOutMinimumHDT > 0
  //   ? ethers.formatUnits(amountOutMinimumHDT.toString(), HDT_TOKEN.decimals)
  //   : "0";

  return { slippageETH, slippageHDT };
}

export function useApproveTokenAbstracted() {
  const { mutate: sendTransaction } = useSendTransaction();
  const donateTokenAbstracted = useDonateTokenAbstracted();

  const approveTokenAbstracted = async (
    tokenId,
    tokenQuantity,
    tokenInput,
    setApprovalHash,
    setDonationHash,
    setTransactionError,
    chain, // Accept chain here
    chainId
  ) => {
    const { contractAddress, ABI } = getConfig(chainId);
    try {
      const tokenQuantityInEthFormat = ethers.parseUnits(
        tokenQuantity,
        tokenInput.decimals
      );

      const ERC20instance = await getContractERC20(tokenInput, chain);

      const approvalTx = await approve({
        contract: ERC20instance,
        spender: contractAddress,
        amount: tokenQuantity,
      });

      sendTransaction(approvalTx, {
        onSuccess: async (transaction) => {
          const transactionHash =
            transaction.transactionHash || transaction.hash;
          setApprovalHash(transactionHash);

          const receipt = await waitForReceipt({
            client: client,
            chain: chain,
            transactionHash: transactionHash,
          });

          await donateTokenAbstracted(
            tokenId,
            tokenQuantity,
            tokenInput,
            setDonationHash,
            setTransactionError,
            chain, // Pass chain to donateTokenAbstracted
            chainId,
            ABI
          );
          return transactionHash;
        },
        onError: (error) => {
          console.error("Donation failed:", error);
          setTransactionError(error.transactionHash?.hash || error);
        },
      });
    } catch (error) {
      console.error("Approval failed:", error);
      throw error;
    }
  };

  return approveTokenAbstracted;
}

export function useDonateTokenAbstracted() {
  const { mutate: sendTransaction } = useSendTransaction();

  const donateTokenAbstracted = async (
    tokenId,
    tokenQuantity,
    tokenInput,
    setDonationHash,
    setTransactionError,
    chain, // Accept chain for contract instance
    chainId
  ) => {
    const { contractAddress, ABI } = getConfig(chainId);
    try {
      const taxPercentage = await ethersGetPercentage(
        chainId,
        contractAddress,
        ABI
      );

      console.log("tokenQuantity:", tokenQuantity);

      console.log(taxPercentage); // 15n
      console.log("payProcessTokenIdAbstracted donateToken chainId:", chainId);
      const proof = await validateToken(tokenInput.address, chainId);

      const { slippageETH, slippageHDT } = await calculateSlippage(
        tokenId,
        tokenQuantity,
        tokenInput,
        taxPercentage,
        chain
      );

      const tokenQuantityInEthFormat = ethers.parseUnits(
        tokenQuantity,
        tokenInput.decimals
      );

      console.log("tokenQuantityInEthFormat:", tokenQuantityInEthFormat);

      const sendAbstractedTx = prepareContractCall({
        contract: getContract({
          client,
          chain,
          address: contractAddress,
          abi: ABI,
        }),
        method: "donate",
        params: [
          tokenId,
          tokenInput.address,
          tokenQuantityInEthFormat,
          slippageETH,
          slippageHDT,
          proof,
        ],
      });

      sendTransaction(sendAbstractedTx, {
        onSuccess: async (transaction) => {
          const transactionHash =
            transaction.transactionHash || transaction.hash;
          setDonationHash(transactionHash);
          return transactionHash;
        },
        onError: (error) => {
          console.error("Donation failed:", error);
          setTransactionError(error.transactionHash?.hash || error);
        },
      });
    } catch (error) {
      console.error("Donation failed:", error);
      throw error;
    }
  };

  return donateTokenAbstracted;
}
