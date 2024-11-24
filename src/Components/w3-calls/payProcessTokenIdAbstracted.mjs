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

async function validateToken(tokenInput) {
  const checkWhiteListProof = await computeMerkleProof(tokenInput);
  return checkWhiteListProof;
}

async function calculateSlippage(
  tokenId,
  tokenQuantity,
  tokenInput,
  dataRead,
  chain
) {
  const { WETH_TOKEN, HDT_TOKEN } = getTokensForChain(chain.id);
  const provider = ethers6Adapter.provider.toEthers({
    client: client,
    chain: chain,
  });

  const taxPercentage = dataRead;
  const formattedTaxPercentage = (Number(taxPercentage) / 1000).toString();
  const taxAmount = (tokenQuantity * formattedTaxPercentage).toString();

  let amountOutMinimumETH = 0;
  let amountOutMinimumHDT = 0;

  if (tokenInput.address !== HDT_TOKEN.address) {
    if (
      tokenInput.address === WETH_TOKEN.address ||
      tokenInput.name === "Ethereum"
    ) {
      const taxAmountHDT = taxAmount * 0.25;
      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        taxAmountHDT,
        provider,
        chain.Id
      );
    } else {
      amountOutMinimumETH = await getAmountOutMinimum(
        tokenInput,
        WETH_TOKEN,
        taxAmount,
        provider,
        chain.id
      );
      const splitHDT = amountOutMinimumETH * 0.25;
      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT,
        provider,
        chain.Id
      );
    }
  }
  return {
    amountOutMinimumETHParsed: ethers
      .parseUnits(amountOutMinimumETH.toString(), tokenInput.decimals)
      .toString(),
    amountOutMinimumHDTParsed: ethers
      .parseUnits(amountOutMinimumHDT.toString(), tokenInput.decimals)
      .toString(),
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

      const proof = await validateToken(tokenInput.address);

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
          amountOutMinimumETHParsed,
          amountOutMinimumHDTParsed,
          proof,
          3000,
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
