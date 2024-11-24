import { ethers } from "ethers";
import erc20ABI from "./ABIs/erc20.json" assert { type: "json" };
import getAmountOutWithSlippage from "./slippageSwap.js";
import { getConfig } from "../../utils/constants.js";
import SwapRouter02 from "./ABIs/SwapRouter02.json" assert { type: "json" };

import { useWallet } from "../Wallet/WalletContext";

export async function approveToken(
  tokenQuantity,
  tokenInput,
  connectedSigner,
  chainId
) {
  const { uniSwapRouter, swapRouterAbi, NATIVE, explorer, WRAPPED } =
    getConfig(chainId);

  const erc20Contract = new ethers.Contract(
    tokenInput.address,
    erc20ABI,
    connectedSigner
  );

  const tokenQuantityInEthFormat = ethers.parseUnits(
    tokenQuantity.toString(),
    tokenInput.decimals
  );
  const currentAllowance = await erc20Contract.allowance(
    connectedSigner.address,
    uniSwapRouter
  );

  // Reset approval to zero before updating for tokens like USDT
  // if (currentAllowance > 0) {
  //   const resetTx = await erc20Contract.approve(uniSwapRouter, 0);
  //   await resetTx.wait();
  //   console.log("Reset approval successful");
  // }

  const approvalTx = await erc20Contract.approve(
    uniSwapRouter,
    tokenQuantityInEthFormat
  );
  await approvalTx.wait();

  const transactionHashApproval = approvalTx.hash;
  console.log(`Approval Hash: ${explorer}tx/${transactionHashApproval}`);
  return { transactionHashApproval };
}

async function swapTokens(
  tokenIn,
  tokenOut,
  amountIn,
  connectedSigner,
  recipientAddress,
  slippage,
  chainId
) {
  // const chainId = 11155111;

  console.log("-----swapTokens chainId-----", chainId);

  const { uniSwapRouter, uniQuoter, explorer, WRAPPED } = getConfig(chainId);

  console.log("swapTokens:", chainId);

  const poolFee = 3000; // Example fee tier, adjust as needed
  // console.log("-----calcSlippage params-----");
  // console.log("Parameter: tokenIn.address", tokenIn.address);
  // console.log("Parameter: tokenOut.address", tokenOut.address);
  // console.log("Parameter: amountIn", amountIn);
  // console.log("Parameter: poolFee", poolFee);
  // console.log("Parameter: slippage", slippage);
  // console.log("Parameter: connectedSigner", connectedSigner);
  // console.log("Parameter: uniQuoter", uniQuoter);
  // console.log("Parameter: WRAPPED", WRAPPED);
  console.log("before if statement:", tokenOut.address);
  if (tokenOut.address == "") {
    const wrappedTokenOut = WRAPPED.address;

    console.log("wrappedTokenOut:", wrappedTokenOut);
    const calcSlippage = await getAmountOutWithSlippage(
      tokenIn.address,
      wrappedTokenOut,
      amountIn,
      poolFee,
      slippage,
      connectedSigner,
      uniQuoter
    );

    console.log("uniSwapRouter  -  ", uniSwapRouter);
    console.log("connectedSigner  -  ", connectedSigner);
    const swapRouter = new ethers.Contract(
      uniSwapRouter,
      SwapRouter02.abi,
      connectedSigner
    );

    const params = {
      tokenIn: tokenIn.address,
      tokenOut: wrappedTokenOut,
      fee: poolFee,
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
      amountIn: amountIn.toString(),
      amountOutMinimum: calcSlippage.toString(),
      sqrtPriceLimitX96: 0,
    };

    const swapTx = await swapRouter.exactInputSingle(params, {
      gasLimit: 1000000,
    });
    await swapTx.wait();
    console.log(`Swap Hash: ${explorer}tx/${swapTx.hash}`);
    return swapTx.hash;
  } else {
    const calcSlippage = await getAmountOutWithSlippage(
      tokenIn.address,
      tokenOut.address,
      amountIn,
      poolFee,
      slippage,
      connectedSigner,
      uniQuoter
    );
    console.log("uniSwapRouter  -  ", uniSwapRouter);
    console.log("connectedSigner  -  ", connectedSigner);
    const swapRouter = new ethers.Contract(
      uniSwapRouter,
      SwapRouter02.abi,
      connectedSigner
    );

    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      fee: poolFee,
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
      amountIn: amountIn.toString(),
      amountOutMinimum: calcSlippage.toString(),
      sqrtPriceLimitX96: 0,
    };

    const swapTx = await swapRouter.exactInputSingle(params, {
      gasLimit: 1000000,
    });
    await swapTx.wait();
    console.log(`Swap Hash: ${explorer}tx/${swapTx.hash}`);
    return swapTx.hash;
  }
}

export async function swapNativeToken(
  amountIn,
  tokenOut,
  connectedSigner,
  recipientAddress,
  slippage,
  chainId
) {
  const { uniSwapRouter, uniQuoter, explorer, WRAPPED } = getConfig(chainId);

  const amountInEthers = ethers.parseEther(amountIn); // Convert input to Ether format
  console.log("amountInEthers:", amountInEthers);

  const calcSlippage = await getAmountOutWithSlippage(
    WRAPPED.address, // Native token as WRAPPED
    tokenOut.address,
    amountInEthers.toString(),
    3000, // Example pool fee
    slippage,
    connectedSigner,
    uniQuoter
  );

  const swapRouter = new ethers.Contract(
    uniSwapRouter,
    SwapRouter02.abi,
    connectedSigner
  );

  const params = {
    tokenIn: WRAPPED.address,
    tokenOut: tokenOut.address,
    fee: 3000, // Example pool fee
    recipient: recipientAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
    amountIn: amountInEthers,
    amountOutMinimum: calcSlippage.toString(),
    sqrtPriceLimitX96: 0,
  };

  console.log("Swap Params:", params);

  const swapTx = await swapRouter.exactInputSingle(params, {
    gasLimit: 1000000,
    value: amountInEthers, // Pass Ether value for native swaps
  });

  console.log("Swap Transaction Submitted:", swapTx.hash);

  // Wait for the transaction to be mined
  const receipt = await swapTx.wait();
  console.log("Swap Transaction Receipt:", receipt);

  return {
    transactionHash: swapTx.hash, // Ensure the hash is returned
  };
}

export async function Payable(
  tokenQuantity,
  tokenIn,
  tokenOut,
  connectedSigner,
  recipientAddress,
  slippage,
  chainId
) {
  const { uniSwapRouter, explorer } = getConfig(chainId);

  console.log("-----Payable chainId-----", chainId);

  const amountIn = ethers.parseUnits(
    tokenQuantity.toString(),
    tokenIn.decimals
  );

  // Swap tokens
  const transactionHashConfirmation = await swapTokens(
    tokenIn,
    tokenOut,
    amountIn,
    connectedSigner,
    recipientAddress,
    slippage,
    chainId
  );

  return { transactionHashConfirmation };
}
