// payProcessTokenId.mjs

import { ethers } from "ethers";
import erc20ABI from "./erc20.json" assert { type: "json" };
import getAmountOutMinimum from "./priceFeeds/slippage";
import { getTokensForChain } from "./priceFeeds/libs/conversion.mjs";
import { computeMerkleProof } from "./whiteList/merkle";

import { getConfig } from "../../utils/constants.js";

async function getNetworkConfig(chainId) {
  const { contractAddress, ABI, NATIVE, HDT, explorer } = getConfig(
    chainId || FALLBACK_CHAIN_ID
  );
  return { contractAddress, ABI, NATIVE, HDT, explorer };
}

// const ETH = {
//   name: NATIVE.name,
//   address: "0x0000000000000000000000000000000000000000",
// };

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
  connectedSigner,
  chainId
) {
  const { WETH_TOKEN, HDT_TOKEN } = getTokensForChain(chainId);
  // *****
  // ****First 4 mentions of tokenInput.decimals should likely be 18, but it's messing up USDT donations do to it's inflated liquidity on Sepolia****
  // *****
  const { contractAddress, ABI, NATIVE } = await getNetworkConfig(chainId);
  const ETH = {
    name: NATIVE.name,
    address: "0x0000000000000000000000000000000000000000",
  };
  const HumbleDonations = new ethers.Contract(
    contractAddress,
    ABI,
    connectedSigner
  );
  console.log("donateToken - tokenQuantity", tokenQuantity);

  console.log("donateToken tokenInput.name", tokenInput.name); // *WORKS*

  const taxPercentage = await HumbleDonations.getPercentage();
  const formattedTaxPercentage = (Number(taxPercentage) / 1000).toString();
  console.log("Tax Percentage:", formattedTaxPercentage);

  const taxAmount = (tokenQuantity * formattedTaxPercentage).toString(); // Total tax amount
  console.log("split taxAmount:", taxAmount);

  // Split amounts
  const splitWETH = taxAmount * 0.75;
  const splitHDT = taxAmount * 0.25;
  console.log("Split WETH:", splitWETH, "Split HDT:", splitHDT);

  let amountOutMinimumETH = 0;
  // let splitWETH = 0;
  let amountOutMinimumHDT = 0;

  if (tokenInput.address !== HDT_TOKEN.address) {
    if (
      tokenInput.address === WETH_TOKEN.address ||
      tokenInput.name === ETH.name
    ) {
      // Special case for WETH | Calculate slippage for HDT part directly since WETH is already tokenIn
      const taxAmountHDT = taxAmount * 0.25; // Total tax amount for HDT
      console.log("taxAmountHDT:", taxAmountHDT);
      console.log("WETH:", WETH_TOKEN);
      console.log("HDT:", HDT_TOKEN);
      console.log("payProcessTokenId calc slippage chainId:", chainId);
      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN, // Intermediate swap from WETH to HDT
        HDT_TOKEN,
        taxAmountHDT,
        connectedSigner,
        chainId
      );
      console.log("amountOutMinimumHDT", amountOutMinimumHDT);
    } else {
      console.log("amountOutMinimumETH", amountOutMinimumETH);
      // splitWETH = taxAmount * 0.75;
      // console.log("splitWETH", splitWETH); // 0.000012446360878819499
      // const splitHDT = amountOutMinimumETH * 0.25;
      // console.log("splitHDT", splitHDT); // 0.0000041487869596065

      const splitHDTStr = splitHDT.toString();
      console.log("splitHDTStr", splitHDTStr);

      amountOutMinimumETH = await getAmountOutMinimum(
        tokenInput,
        WETH_TOKEN,
        taxAmount,
        connectedSigner,
        chainId
      );

      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN, // Intermediate swap from WETH to HDT
        HDT_TOKEN,
        splitHDT,
        connectedSigner,
        chainId
      );
      console.log("amountOutMinimumHDT", amountOutMinimumHDT);
    }
  } else {
    console.log("HDT donation - no slippage required");
  }
  console.log(
    "amountOutMinimumETH outside of if statements:",
    amountOutMinimumETH
  );
  console.log(
    "amountOutMinimumHDT outside of if statements:",
    amountOutMinimumHDT
  );

  // Convert amounts to their string representations without scientific notation
  const amountOutMinimumETHStr = amountOutMinimumETH.toFixed(
    tokenInput.decimals
  );
  console.log("amountOutMinimumETHStr", amountOutMinimumETHStr);
  const amountOutMinimumETHParsed = ethers
    .parseUnits(amountOutMinimumETHStr, tokenInput.decimals)
    .toString();
  console.log("amountOutMinimumETHParsed", amountOutMinimumETHParsed);

  const amountOutMinimumHDTStr = amountOutMinimumHDT.toFixed(
    tokenInput.decimals
  );
  console.log("amountOutMinimumHDTStr", amountOutMinimumHDTStr);
  const amountOutMinimumHDTParsed = ethers
    .parseUnits(amountOutMinimumHDTStr, tokenInput.decimals)
    .toString();
  console.log("amountOutMinimumHDTParsed", amountOutMinimumHDTParsed);

  return { amountOutMinimumETHParsed, amountOutMinimumHDTParsed };
}
async function approveToken(
  tokenId,
  tokenQuantity,
  tokenInput,
  connectedSigner,
  chainId
) {
  const { contractAddress, explorer } = await getNetworkConfig(chainId);
  console.log("chainId:", chainId);
  console.log("contractAddress:", contractAddress);
  console.log("tokenId:", tokenId); // @# null
  console.log("donateToken tokenInput.address", tokenInput.address);
  console.log("donateToken tokenInput.name", tokenInput.name);
  console.log("donateToken tokenInput.decimals", tokenInput.decimals);
  console.log("donateToken tokenInput.symbol", tokenInput.symbol);
  console.log("donateToken tokenInput.chainId", tokenInput.chainId);

  const erc20Contract = new ethers.Contract(
    tokenInput.address,
    erc20ABI,
    connectedSigner
  );
  const tokenQuantityInEthFormat = ethers.parseUnits(
    tokenQuantity,
    tokenInput.decimals
  );

  // ------REVOKE ALLOWANCE IF IT IS ALREADY SET------
  // const currentAllowance = await erc20Contract.allowance(
  //   connectedSigner.address,
  //   contractAddress
  // );
  // if (currentAllowance > 0) {
  //   // tokenInput.symbol == "USDT" &&
  //   const resetTx = await erc20Contract.approve(contractAddress, 0);
  //   await resetTx.wait();
  //   console.log("Reset approval successful");
  // }
  const approvalTx = await erc20Contract.approve(
    contractAddress,
    tokenQuantityInEthFormat,
    { gasLimit: 1000000 }
  );
  await approvalTx.wait();
  const transactionHashApproval = approvalTx.hash;
  console.log(`Approval Hash: ${explorer}tx/${transactionHashApproval}`);
  return approvalTx.hash;
}

async function donateToken(
  tokenId,
  tokenQuantity,
  tokenInput,
  connectedSigner,
  chainId
) {
  console.log("payProcessTokenId donateToken chainId:", chainId);
  const { contractAddress, ABI, explorer } = await getNetworkConfig(chainId);

  // Check merkle tree to see if ERC20 token is whitelisted.
  console.log("donateTokeninput address:", tokenInput.address);
  const proof = await validateToken(tokenInput.address, chainId);
  console.log("Proof being sent to the contract:", proof); // log proof

  // Calculate the slippage of the confirmation transaction in both WETH and HDR
  const { amountOutMinimumETHParsed, amountOutMinimumHDTParsed } =
    await calculateSlippage(
      tokenId,
      tokenQuantity,
      tokenInput,
      connectedSigner,
      chainId
    );
  const HumbleDonations = new ethers.Contract(
    contractAddress,
    ABI,
    connectedSigner
  );

  const tokenQuantityInEthFormat = ethers.parseUnits(
    tokenQuantity,
    tokenInput.decimals
  );

  // const fee = 3000; // @# CAN AND SHOULD LIKELY BE REMOVED
  console.log("tokenQuantityInEthFormat:", tokenQuantityInEthFormat);
  const donateTx = await HumbleDonations.donate(
    tokenId,
    tokenInput.address,
    tokenQuantityInEthFormat,
    0, // works if 0 | I think I need more liquidity to use amountOutMinimumETHParsed
    amountOutMinimumHDTParsed,
    proof
    // fee,
    // { gasLimit: 5000000 }
  );
  await donateTx.wait();
  const transactionHashConfirmation = donateTx.hash;
  console.log(`Payment Hash: ${explorer}tx/${transactionHashConfirmation}`);
  console.log("Payment successful");
  return donateTx.hash;
}

async function Payable(
  tokenId,
  tokenQuantity,
  tokenInput,
  connectedSigner,
  chainId
) {
  console.log("payProcessTokenId donateToken chainId:", chainId);
  const { contractAddress, ABI, NATIVE } = await getNetworkConfig(chainId);
  const ETH = {
    name: NATIVE.name,
    address: "0x0000000000000000000000000000000000000000",
  };
  try {
    const { amountOutMinimumETHParsed, amountOutMinimumHDTParsed } =
      await calculateSlippage(
        tokenId,
        tokenQuantity,
        tokenInput,
        connectedSigner, // CHANGED
        chainId
      );
    console.log("---Payable---");
    console.log(
      "amountOutMinimumETHParsed amountOutMinimumHDTParsed  |  ",
      amountOutMinimumETHParsed,
      amountOutMinimumHDTParsed
    );
    if (tokenInput.name === ETH.name) {
      const HumbleDonations = new ethers.Contract(
        contractAddress,
        ABI,
        connectedSigner
      );
      const tokenQuantityInEthFormat = ethers.parseUnits(
        tokenQuantity,
        tokenInput.decimals
      );

      const fee = 3000; // @# CAN AND SHOULD LIKELY BE REMOVED
      const donateTx = await HumbleDonations.donate(
        tokenId,
        ETH.address,
        tokenQuantityInEthFormat,
        amountOutMinimumETHParsed,
        amountOutMinimumHDTParsed,
        [],
        // fee,
        {
          gasLimit: 1000000,
          value: tokenQuantityInEthFormat,
        }
      );
      const paymentReceipt = await donateTx.wait();
      console.log("Transaction Receipt:", paymentReceipt);
      return {
        transactionHashApproval: null,
        transactionHashConfirmation: donateTx.hash,
      };
    } else {
      const transactionHashApproval = await approveToken(
        tokenId,
        tokenQuantity,
        tokenInput,
        connectedSigner,
        chainId
      );
      const transactionHashConfirmation = await donateToken(
        tokenId,
        tokenQuantity,
        tokenInput,
        connectedSigner,
        chainId
      );
      return {
        transactionHashApproval,
        transactionHashConfirmation,
      };
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export { approveToken, donateToken, Payable };
