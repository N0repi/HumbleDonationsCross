// payProcessTokenIdAbstracted.mjs

import { ethers } from "ethers";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import getAmountOutMinimum from "./priceFeeds/slippage";
import { getTokensForChain } from "./priceFeeds/libs/conversion.mjs";
import { computeMerkleProof } from "./whiteList/merkle";
import { approve } from "thirdweb/extensions/erc20";
import { getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { client } from "../../Components/Model/thirdWebClient";
import erc20ABI from "./erc20.json" assert { type: "json" };
import { getConfig } from "../../utils/constants.js";

async function getNetworkConfig(chainId) {
  const { contractAddress, ABI, NATIVE, HDT, explorer } = getConfig(
    chainId || FALLBACK_CHAIN_ID
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
    const percentage = await HumbleDonations.getPercentage({
      gasLimit: 10000000,
    });
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
    console.log(`Token at address ${tokenInput.address} is in the whitelist.`);
  } else {
    console.log(
      `Token at address ${tokenInput.address} is NOT in the whitelist.`
    );
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
  const { WETH_TOKEN, HDT_TOKEN } = getTokensForChain(chain.id);
  const provider = ethers6Adapter.provider.toEthers({
    client: client,
    chain: chain,
  });

  console.log("thirdweb chain:", chain);

  // Calculate the tax amount
  const formattedTaxPercentage = (Number(taxPercentage) / 1000).toString();
  const taxAmount = (tokenQuantity * formattedTaxPercentage).toString();
  console.log("Tax Amount:", taxAmount);

  // Calculate splits
  const splitWETH = taxAmount * 0.75;
  const splitHDT = taxAmount * 0.25;
  console.log("Split WETH:", splitWETH, "Split HDT:", splitHDT);

  let amountOutMinimumETH = 0;
  let amountOutMinimumHDT = 0;

  if (tokenInput.address !== HDT_TOKEN.address) {
    if (
      tokenInput.address === WETH_TOKEN.address ||
      tokenInput.name === "Ethereum"
    ) {
      // Special case for WETH as input
      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT, // Use splitHDT for the calculation
        provider,
        chain.id
      );
    } else {
      // Handle non-WETH token inputs
      amountOutMinimumETH = await getAmountOutMinimum(
        tokenInput,
        WETH_TOKEN,
        taxAmount, // Use splitWETH for the calculation
        provider,
        chain.id
      );

      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT,
        provider,
        chain.id
      );
    }
  }

  console.log("AmountOutMinimumETH:", amountOutMinimumETH);
  console.log("AmountOutMinimumHDT:", amountOutMinimumHDT);

  // Default to 0 if calculations fail
  const amountOutMinimumETHParsed = amountOutMinimumETH
    ? ethers
        .parseUnits(
          amountOutMinimumETH.toFixed(tokenInput.decimals),
          tokenInput.decimals
        )
        .toString()
    : "0";

  const amountOutMinimumHDTParsed = amountOutMinimumHDT
    ? ethers
        .parseUnits(
          amountOutMinimumHDT.toFixed(tokenInput.decimals),
          tokenInput.decimals
        )
        .toString()
    : "0";

  console.log(
    "Parsed Amounts:",
    amountOutMinimumETHParsed,
    amountOutMinimumHDTParsed
  );

  return {
    amountOutMinimumETHParsed,
    amountOutMinimumHDTParsed,
  };
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

      console.log(taxPercentage); // 15n
      console.log("payProcessTokenIdAbstracted donateToken chainId:", chainId);
      const proof = await validateToken(tokenInput.address, chainId);

      const { amountOutMinimumETHParsed, amountOutMinimumHDTParsed } =
        await calculateSlippage(
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
          amountOutMinimumETHParsed, // amountOutMinimumETHParsed
          amountOutMinimumHDTParsed,
          proof,
          // 3000,
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
