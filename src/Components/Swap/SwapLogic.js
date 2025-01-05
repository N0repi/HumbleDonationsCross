// SwapLogic.js

import { ethers } from "ethers";
import erc20ABI from "./ABIs/erc20.json" assert { type: "json" };
import {
  slippageEqualizer,
  getAmountOutWithSlippageUniswap,
} from "./slippageSwap.js";
import { getConfig } from "../../utils/constants.js";

// Arbitrum
import SwapRouter02 from "./ABIs/SwapRouter02.json" assert { type: "json" };

// Sonic
// import SolidlyExtendedRouter03 from "../../../artifacts/contracts/SolidlyExtendedRouter03.sol/SolidlyExtendedRouter03.json" assert { type: "json" };

import { useWallet } from "../Wallet/WalletContext";

export async function approveToken(
  tokenQuantity,
  tokenInput,
  connectedSigner,
  chainId
) {
  // **
  // added routerABI which is Uniswap SwapRouter02 and Equalizer RouterV3
  const { uniSwapRouter, swapRouterAbi, NATIVE, explorer, WRAPPED, roterABI } =
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

  // Reset approval to zero before updating for tokens like USDT
  // const currentAllowance = await erc20Contract.allowance(
  //   connectedSigner.address,
  //   uniSwapRouter
  // );
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

async function swapTokensUniswap(
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

  const poolFee = 3000;

  console.log("before if statement:", tokenOut.address);
  if (tokenOut.address == "") {
    const wrappedTokenOut = WRAPPED.address;

    console.log("wrappedTokenOut:", wrappedTokenOut);
    const calcSlippage = await getAmountOutWithSlippageUniswap(
      tokenIn.address,
      wrappedTokenOut,
      amountIn,
      poolFee,
      slippage,
      connectedSigner,
      uniQuoter,
      chainId
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
    const calcSlippage = await getAmountOutWithSlippageUniswap(
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

// Also need to change to fucntion name to Uniswap ->>> make Sonic function
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

  const calcSlippage = await getAmountOutWithSlippageUniswap(
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

async function swapTokensEqualizer(
  explorer,
  router,
  routerABI,
  tokenIn,
  tokenOut,
  amountIn,
  slippage,
  connectedSigner,
  chainId,
  WRAPPED,
  NATIVE
) {
  console.log("amountIn - swapTokensEqualizer:", amountIn); // logs 1000000000000000000n

  console.log("swapTokensEqualizer chainId:", chainId);

  console.log("tokenIn:", tokenIn);
  console.log("tokenOut:", tokenOut);
  const calcSlippage = await slippageEqualizer(
    tokenIn,
    tokenOut,
    amountIn,
    slippage,
    connectedSigner,
    WRAPPED,
    NATIVE
  );

  console.log("calcSlippage Sonic swap:", calcSlippage);

  const swapRouter = new ethers.Contract(
    router,
    routerABI.abi,
    connectedSigner
  );

  // Router
  /*
  from: WETH,
  to: HDT,
  stable: false
  */

  // PARAMS
  /*
  amountIn,
  slippageWETH,
  routesToWETH,
  address(this),
  deadline 
  */

  // Soidity
  /*
  uint amountIn,
  uint amountOutMin,
  Route[] calldata routes,
  address to,
  uint deadline
  */

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

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  console.log("amountIn -", amountIn);
  console.log("calcSlippage -", calcSlippage);

  console.log("connectedSigner.address:", connectedSigner.address);

  const swapTx = await swapRouter.swapExactTokensForTokens(
    amountIn, // amountIn
    calcSlippage, // amountOutMin
    equalizerRoute, // routes
    connectedSigner.address, // to
    deadline, // deadline,
    {
      gasLimit: 1000000,
    }
  );
  await swapTx.wait();
  console.log(`Swap Hash: ${explorer}tx/${swapTx.hash}`);
  return swapTx.hash;
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
  const { uniSwapRouter, explorer, routerABI, router, WRAPPED, NATIVE } =
    getConfig(chainId);

  console.log("-----Payable chainId-----", chainId);

  const amountIn = ethers.parseUnits(
    tokenQuantity.toString(),
    tokenIn.decimals
  );
  if (chainId == 146) {
    // Swap tokens Sonic
    console.log("Payable chain after if:", chainId);
    const transactionHashConfirmation = await swapTokensEqualizer(
      explorer,
      router,
      routerABI,
      tokenIn,
      tokenOut,
      amountIn,
      slippage,
      connectedSigner,
      chainId,
      WRAPPED,
      NATIVE
    );
    return transactionHashConfirmation;
  } else {
    console.log("Payable chain after else:", chainId);
    // Swap tokens Arbitrum/Sepolia
    const transactionHashConfirmation = await swapTokensUniswap(
      tokenIn,
      tokenOut,
      amountIn,
      connectedSigner,
      recipientAddress,
      slippage,
      chainId
    );
    return transactionHashConfirmation;
  }

  return { transactionHashConfirmation };
}
