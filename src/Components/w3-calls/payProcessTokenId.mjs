// payProcessTokenId.mjs

import { ethers } from "ethers";
import erc20ABI from "./erc20.json" assert { type: "json" };
import getAmountOutMinimum, {
  getQuote,
  getQuoteSonic,
} from "./priceFeeds/slippage";
import { getTokensForChain } from "./priceFeeds/libs/conversion.mjs";
import { computeMerkleProof } from "./whiteList/merkle";

import { getConfig } from "../../utils/constants.js";

function toFixedWithoutScientificNotation(num, decimals) {
  return Number(num).toFixed(decimals);
}

async function getNetworkConfig(chainId) {
  const { contractAddress, ABI, NATIVE, HDT, explorer } = getConfig(
    chainId || FALLBACK_CHAIN_ID
  );
  return { contractAddress, ABI, NATIVE, HDT, explorer };
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
  connectedSigner,
  chainId
) {
  const { WETH_TOKEN, HDT_TOKEN } = getTokensForChain(chainId);
  const { contractAddress, ABI, NATIVE } = await getNetworkConfig(chainId);

  // Define ETH as the native token
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
  console.log("donateToken tokenInput.name", tokenInput.name);

  // Get the tax percentage from the contract
  const taxPercentage = await HumbleDonations.getPercentage();
  console.log("taxPercentage:", taxPercentage);
  const formattedTaxPercentage = (Number(taxPercentage) / 1000).toString();
  console.log("Tax Percentage:", formattedTaxPercentage);

  const taxAmount = tokenQuantity * formattedTaxPercentage; // eg 0.001 (in) * 0.015 = 0.000015
  console.log("Tax Amount:", taxAmount); // 0.000015

  // Skip the call to `getQuote` if tokenInput is WETH or ETH
  let tokenInWETHquote;
  if (
    tokenInput.address === WETH_TOKEN.address ||
    tokenInput.name === ETH.name
  ) {
    console.log("tokenInput is WETH or ETH, skipping getQuote...");
    tokenInWETHquote = ethers.parseUnits(
      toFixedWithoutScientificNotation(taxAmount, 18),
      18
    ); // Use taxAmount directly
  } else {
    if (
      chainId === 64165 // Special handling for Sonic
    ) {
      console.log("Using Sonic-specific logic...");
      const slippageResult = await getQuoteSonic(
        tokenInput,
        WETH_TOKEN,
        toFixedWithoutScientificNotation(taxAmount, 18),
        connectedSigner.provider,
        chainId
      );
      tokenInWETHquote = slippageResult;
    }
    console.log("Getting quote for tokenInput to WETH...");
    tokenInWETHquote = await getQuote(
      tokenInput,
      WETH_TOKEN,
      toFixedWithoutScientificNotation(taxAmount, 18),
      connectedSigner.provider,
      chainId
    );
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

  // Slippage logic
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
        connectedSigner.provider,
        chainId
      );
    } else {
      console.log("Calculating slippage for WETH and HDT...");
      amountOutMinimumETH = await getAmountOutMinimum(
        tokenInput,
        WETH_TOKEN,
        taxAmount,
        connectedSigner.provider,
        chainId
      );

      amountOutMinimumHDT = await getAmountOutMinimum(
        WETH_TOKEN,
        HDT_TOKEN,
        splitHDT,
        connectedSigner.provider,
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
    tokenQuantityInEthFormat
    // { gasLimit: 1000000 }
    // #@
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
  const { slippageETH, slippageHDT } = await calculateSlippage(
    tokenId,
    tokenQuantity,
    tokenInput,
    connectedSigner, // CHANGED
    chainId
  );
  console.log("---Payable---");
  console.log("slippageETH:", slippageETH);
  console.log("slippageHDT", slippageHDT);
  console.log(
    `donateToken - slippageETH ${slippageETH} | slippageHDT ${slippageHDT}`
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
  console.log(
    "donateToken - tokenQuantityInEthFormat:",
    tokenQuantityInEthFormat
  );

  console.log("tokenQuantityInEthFormat:", tokenQuantityInEthFormat);
  const donateTx = await HumbleDonations.donate(
    tokenId,
    tokenInput.address,
    tokenQuantityInEthFormat,
    slippageETH, // works if 0 | I think I need more liquidity to use amountOutMinimumETHParsed
    slippageHDT,
    proof
    // { gasLimit: 1000000 }
    // #@
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
    const { slippageETH, slippageHDT } = await calculateSlippage(
      tokenId,
      tokenQuantity,
      tokenInput,
      connectedSigner, // CHANGED
      chainId
    );
    console.log("---Payable---");
    console.log(
      "amountOutMinimumETHParsed amountOutMinimumHDTParsed  |  ",
      slippageETH,
      slippageHDT
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

      const donateTx = await HumbleDonations.donate(
        tokenId,
        ETH.address,
        tokenQuantityInEthFormat,
        slippageETH,
        slippageHDT,
        [],
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
