// StakingEthers5.jsx

// Reference for file is v3StakerInteraction.js

import * as ethers from "ethers-v5";
import { Token, Percent } from "@uniswap/sdk-core";
import {
  Pool,
  Position,
  nearestUsableTick,
  NonfungiblePositionManager,
} from "@uniswap/v3-sdk";

import { abi as EncodeIncentiveUniV3ABI } from "./liquidityABI/EncodeIncentivesUniV3.json";
import { abi as UniswapV3StakerABI } from "./liquidityABI/UniswapV3Staker.json";
import { key as iKey } from "./liquidityABI/unhashedKey.json";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as NonfungiblePositionManagerABI } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import erc20 from "./liquidityABI/erc20.json";

import "./StakingEthers5.module.css";
import { getINtoUSD } from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";
import { useTransaction } from "../../pages/TransactionContext";

const name0 = "Wrapped Ether";
const symbol0 = "WETH";
const decimals0 = 18;
const address0 = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const name1 = "Humble Donations Token";
const symbol1 = "HDT";
const decimals1 = 18;
const address1 = "0x9707Be4129F68B767aF550fe1c631BF1779623Cb";

const HDTtoken = {
  chainId: 11155111,
  name: "Humble Donations Token",
  symbol: "HDT",
  decimals: 18,
  address: "0x9707Be4129F68B767aF550fe1c631BF1779623Cb",
};

const rewardToken = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

// ------MINT ERC721 TOKEN------
const poolAddress = "0x326fDb8fB3D796124F9D7a3F8F0758D510823Aac"; // HDT/WETH Sepolia
const positionManagerAddress = "0x1238536071E1c677A632429e3655c799b22cDA52"; // NonfungiblePositionManager

const NonfungiblePositionManagerABIabi = NonfungiblePositionManagerABI;
const IUniswapV3PoolABIabi = IUniswapV3PoolABI;

const chainId = 11155111; // Sepolia
const WethToken = new Token(chainId, address0, decimals0, symbol0, name0);
const HdtToken = new Token(chainId, address1, decimals1, symbol1, name1);

const erc20abi = [
  // Functions
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
];

async function getConnectedSigner() {
  if (typeof window !== "undefined" && window.ethereum) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider;
  } else {
    console.error("Web3 provider not available");
    return null;
  }
}

// guess I'll pass `tokenQuantity` to createLP and call this from the frontend due to conflict invariance errors
export default async function createLP(tokenQuantity) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }

  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );

  await addLPtoPool(tokenQuantity);
}

function safeBigNumberFrom(value) {
  try {
    if (value == null) {
      throw new Error("Value is null or undefined");
    }
    return ethers.BigNumber.from(value);
  } catch (error) {
    console.error("Failed to convert to BigNumber:", error, "Value:", value);
    throw error; // Rethrow after logging
  }
}

export async function addLPtoPool(
  tokenQuantity,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }
  const signerAddress = await signer.getAddress();

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABIabi,
    provider
  );
  const poolData = await getPoolData(poolContract);
  console.log("poolData log", poolData);

  const configuredPool = new Pool(
    WethToken,
    HdtToken,
    poolData.fee,
    poolData.sqrtPriceX96.toString(),
    poolData.liquidity.toString(),
    poolData.tick
  );

  console.log("configuredPool", configuredPool);

  const { token0: amount0Desired, token1: amount1Desired } =
    await calculateLiquidityPosition(tokenQuantity);
  console.log("amount0Desired:", amount0Desired);
  console.log("amount1Desired:", amount1Desired);

  const amount0 = ethers.utils.parseUnits(amount0Desired, 18);
  const amount1 = ethers.utils.parseUnits(amount1Desired, 18);
  console.log("amount0", amount0);
  console.log("amount1", amount1);

  const position = Position.fromAmounts({
    pool: configuredPool,
    tickLower:
      nearestUsableTick(poolData.tick, poolData.tickSpacing) -
      poolData.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(poolData.tick, poolData.tickSpacing) +
      poolData.tickSpacing * 2,
    amount0: amount0,
    amount1: amount1,
    useFullPrecision: true,
  });

  // ****MAKE THIS MULTICALL****
  const tokenContract0 = new ethers.Contract(address0, erc20, signer); // TypeError: Cannot read properties of undefined (reading 'map')

  const balance0 = await tokenContract0.balanceOf(signerAddress);
  console.log("WETH balance:", balance0.toString());

  if (balance0.lt(amount1)) {
    console.error("Insufficient WETH balance for approval");
    return;
  }

  const estimatedGasApprove0 = await estimateGasWithRetry(() =>
    tokenContract0.estimateGas.approve(positionManagerAddress, amount1)
  );
  const gasLimitApprove0 = estimatedGasApprove0.add(
    estimatedGasApprove0.mul(30).div(100)
  );
  const token0approve = await tokenContract0.approve(
    positionManagerAddress,
    amount1,
    {
      gasLimit: gasLimitApprove0,
    }
  );

  const tokenContract1 = new ethers.Contract(address1, erc20, signer);

  const balance1 = await tokenContract1.balanceOf(signerAddress);
  console.log("HDT balance:", balance1.toString());

  if (balance1.lt(amount0)) {
    console.error("Insufficient HDT balance for approval");
    return;
  }

  const estimatedGasApprove1 = await estimateGasWithRetry(() =>
    tokenContract1.estimateGas.approve(positionManagerAddress, amount0)
  );
  const gasLimitApprove1 = estimatedGasApprove1.add(
    estimatedGasApprove1.mul(30).div(100)
  );
  const token1approve = await tokenContract1.approve(
    positionManagerAddress,
    amount0,
    {
      gasLimit: gasLimitApprove1,
    }
  );

  // Wait for both approval transactions
  try {
    await Promise.all([token0approve.wait(), token1approve.wait()]);
    console.log("token0approve:", token0approve);
    console.log("token1approve:", token1approve);

    setApprovalHash(token0approve.hash);
    setApprovalHash(token1approve.hash);
  } catch (error) {
    console.error("Error:", error);
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
  console.log("after approvals");

  const mintOptions = {
    recipient: signerAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
  };

  const { calldata } = NonfungiblePositionManager.addCallParameters(
    position,
    mintOptions
  );
  console.log("calldata", calldata);
  const transaction = {
    data: calldata,
    to: positionManagerAddress,
  };
  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );
  // Set up the event listener before sending the transaction
  nonfungiblePositionManagerContract.on(
    "IncreaseLiquidity",
    async (tokenId, liquidity, amount0, amount1) => {
      console.log("IncreaseLiquidity event detected:", {
        tokenId,
        liquidity,
        amount0,
        amount1,
      });
      await handleIncreaseLiquidity(
        tokenId,
        liquidity,
        amount0,
        amount1,
        setConfirmationHash,
        setTransactionError
      );
    }
  );
  try {
    const estimatedGasTransaction = await estimateGasWithRetry(() =>
      signer.estimateGas(transaction)
    );
    const gasLimitTransaction = estimatedGasTransaction.add(
      estimatedGasTransaction.mul(30).div(100)
    );
    const txRes = await signer.sendTransaction({
      ...transaction,
      gasLimit: gasLimitTransaction,
    });

    await txRes.wait();
    setConfirmationHash(txRes.hash);
    console.log("txRes", txRes); // *@* Occurs somewhere after line 206 before multicall to transfer token to incentive
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
    console.error("Failed to estimate gas or send transaction:", error);
    handleTransactionError(error);
  }

  async function handleIncreaseLiquidity(
    tokenId,
    liquidity,
    amount0,
    amount1,
    setConfirmationHash,
    setTransactionError
  ) {
    console.log("handleIncreaseLiquidity called with:", {
      tokenId,
      liquidity,
      amount0,
      amount1,
    });

    try {
      if (!tokenId || !liquidity || !amount0 || !amount1) {
        console.error("Invalid arguments:", {
          tokenId,
          liquidity,
          amount0,
          amount1,
        });
        return; // Exit if any argument is invalid
      }

      const tokenIdSafe = safeBigNumberFrom(tokenId);
      const liquiditySafe = safeBigNumberFrom(liquidity);
      const amount0Safe = safeBigNumberFrom(amount0);
      const amount1Safe = safeBigNumberFrom(amount1);

      if (!tokenIdSafe || !liquiditySafe || !amount0Safe || !amount1Safe) {
        console.error("Invalid BigNumber conversion:", {
          tokenIdSafe,
          liquiditySafe,
          amount0Safe,
          amount1Safe,
        });
        return; // Exit if any conversion is invalid
      }

      const tokenIdint = tokenIdSafe.toNumber();
      console.log("tokenIdint CHECK", tokenIdint);
      const liquidityInt = liquiditySafe.toString();
      console.log("liquidityInt CHECK", liquidityInt);
      const amount0Int = amount0Safe.toString();
      console.log("amount0Int CHECK", amount0Int);
      const amount1Int = amount1Safe.toString();
      console.log("amount1Int CHECK", amount1Int);
      console.log("---");
      console.log("Token ID int:", tokenIdint);
      console.log("Token ID:", tokenIdSafe);
      console.log("Liquidity:", liquidityInt);
      console.log("amount0Int:", amount0Int);
      console.log("amount1Int:", ethers.utils.parseUnits(amount1Int, 18));

      nonfungiblePositionManagerContract.removeListener(
        "IncreaseLiquidity",
        handleIncreaseLiquidity
      );

      console.log(
        "Calling incentiveToTokenId with:",
        tokenIdSafe,
        setConfirmationHash,
        setTransactionError
      );
      incentiveToTokenId(tokenIdSafe, setConfirmationHash, setTransactionError);
    } catch (error) {
      console.error("Error in handleIncreaseLiquidity:", error);
      // Handle the error gracefully
    }
  }
}

async function estimateGasWithRetry(estimateGasFunc, retries = 3) {
  let attempts = 0;
  while (attempts < retries) {
    try {
      return await estimateGasFunc();
    } catch (error) {
      attempts += 1;
      if (attempts >= retries) {
        throw error;
      }
      console.log(`Retrying gas estimation... (${attempts}/${retries})`);
    }
  }
}

function handleTransactionError(error) {
  console.error("Transaction Error:", error);
  if (error.code === ethers.errors.UNPREDICTABLE_GAS_LIMIT) {
    console.error(
      "The transaction is likely to fail due to gas estimation issues."
    );
  } else {
    console.error("An unexpected error occurred:", error.message);
  }
}

// ------APPROVAL & STF MULTICALL TO STAKER CONTRACT------
async function incentiveToTokenId(
  tokenId,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }
  const signerAddress = await signer.getAddress();

  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";
  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );

  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );

  console.log("tokenId incentive:", tokenId);
  const approveRewardsTokenEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData("approve", [
      UniswapV3StakerInstance.address,
      tokenId,
    ]);

  const STFencoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData(
      "safeTransferFrom(address,address,uint256,bytes)",
      [signerAddress, STAKER_ADDRESS, tokenId, iKey]
    );

  const stakingMulticallData = [approveRewardsTokenEncoded, STFencoded];

  // const estimatedGasMulticall = await nonfungiblePositionManagerContract.estimateGas[
  //     "multicall(bytes[])"
  // ](stakingMulticallData)
  // const gasLimitMulticall = estimatedGasMulticall.add(estimatedGasMulticall.mul(20).div(100))
  const stakingMulticall = await nonfungiblePositionManagerContract[
    "multicall(bytes[])"
  ](stakingMulticallData);
  try {
    await stakingMulticall.wait();
    setConfirmationHash(stakingMulticall.hash);
    console.log("stakingMulticall:", stakingMulticall);
  } catch (error) {
    console.error("Error:", error);
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
}

export async function getRewards(tokenId) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }

  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";
  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  // DECODE AND CHECK REWARDS
  const decodedKey = await iKeyInstance.decode(iKey);

  const rewardInfo = await UniswapV3StakerInstance.getRewardInfo(
    decodedKey,
    tokenId
  );
  console.log("Reward Info:", {
    reward: rewardInfo[0].toString(),
    secondsInsideX128: rewardInfo[1].toString(),
  });

  return {
    reward: rewardInfo[0].toString(),
    secondsInsideX128: rewardInfo[1].toString(),
  };
}

export async function unstakeClaimRestake(
  tokenId,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }
  const signerAddress = await signer.getAddress();
  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";
  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  // DECODE AND CALL MULTICALL
  const decodedKey = await iKeyInstance.decode(iKey);

  const unstakeEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "unstakeToken",
    [decodedKey, tokenId]
  );

  const claimEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "claimReward",
    [rewardToken, signerAddress, 0]
  );

  const stakeEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "stakeToken",
    [decodedKey, tokenId]
  );

  // only call approve and STF if positioned is withdrawed

  const multicallStakeClaimRestake = [
    unstakeEncoded,
    claimEncoded,
    stakeEncoded,
  ];

  try {
    const multicallCall = await UniswapV3StakerInstance["multicall(bytes[])"](
      multicallStakeClaimRestake,
      { gasLimit: 10000000 }
    );
    await multicallCall.wait();
    setConfirmationHash(multicallCall.hash);
    console.log("multicall tx:", multicallCall);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
}

export async function unstakeClaimWithdraw(
  tokenId,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }
  const signerAddress = await signer.getAddress();
  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";
  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );
  const rewardToken = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  const decodedKey = await iKeyInstance.decode(iKey);

  const unstakeEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "unstakeToken",
    [decodedKey, tokenId]
  );
  const claimEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "claimReward",
    [rewardToken, signerAddress, 0]
  );
  const withdrawEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "withdrawToken",
    [tokenId, signerAddress, ethers.utils.hexlify([])]
  );

  const multicallStakeClaimRestake = [
    unstakeEncoded,
    claimEncoded,
    withdrawEncoded,
  ];

  try {
    const estimatedGasMulticall = await UniswapV3StakerInstance.estimateGas[
      "multicall(bytes[])"
    ](multicallStakeClaimRestake);
    const gasLimitMulticall = estimatedGasMulticall.add(
      estimatedGasMulticall.mul(20).div(100)
    );
    const multicallCall = await UniswapV3StakerInstance["multicall(bytes[])"](
      multicallStakeClaimRestake,
      { gasLimit: gasLimitMulticall }
    );
    await multicallCall.wait();
    setConfirmationHash(multicallCall.hash);
    console.log("multicall tx:", multicallCall);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }

  await removeLiquidity(
    tokenId,
    setApprovalHash,
    setConfirmationHash,
    setTransactionError
  );
}

export async function initializePoolContract() {
  const provider = await getConnectedSigner();
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABIabi,
    provider
  );
  return poolContract;
}

export async function getPoolData(poolContract) {
  try {
    const [tickSpacing, fee, liquidity, slot0, token0, token1] =
      await Promise.all([
        poolContract.tickSpacing(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
        poolContract.token0(),
        poolContract.token1(),
      ]);
    return {
      tickSpacing: tickSpacing,
      fee: fee,
      liquidity: liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
      token0: token0,
      token1: token1,
    };
  } catch (error) {
    console.error("Error fetching pool data:", error);
    throw error;
  }
}

function sqrtPriceX96ToPrice(sqrtPriceX96) {
  return sqrtPriceX96.mul(sqrtPriceX96).div(ethers.BigNumber.from(2).pow(192));
}

export async function calculateLiquidityPosition(tokenQuantity) {
  const poolContract = await initializePoolContract();
  const poolData = await getPoolData(poolContract);

  const configuredPool = new Pool(
    WethToken,
    HdtToken,
    poolData.fee,
    poolData.sqrtPriceX96.toString(),
    poolData.liquidity.toString(),
    poolData.tick
  );

  console.log("configuredPool", configuredPool);

  const amountIn = ethers.utils.parseUnits(tokenQuantity, 18);

  // ***
  const position = new Position({
    pool: configuredPool,
    liquidity: amountIn,
    tickLower:
      nearestUsableTick(poolData.tick, poolData.tickSpacing) -
      poolData.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(poolData.tick, poolData.tickSpacing) +
      poolData.tickSpacing * 2,
    // useFullPrecision: true, //disabled for testing --> only used when Position.fromAmounts
  });

  const amount0 = position.amount0.toSignificant(18);
  const amount1 = position.amount1.toSignificant(18);
  console.log("amount0", amount0);
  console.log("amount1", amount1);
  return {
    token0: amount0,
    token1: amount1,
  };
}

export async function calculateReserves() {
  const poolContract = await initializePoolContract();
  const poolData = await getPoolData(poolContract);
  const sqrtPriceX96 = poolData.sqrtPriceX96;
  const price = sqrtPriceX96ToPrice(sqrtPriceX96);

  const reserve0 = poolData.liquidity
    .mul(sqrtPriceX96)
    .div(ethers.BigNumber.from(2).pow(96));
  const reserve1 = poolData.liquidity
    .mul(ethers.BigNumber.from(2).pow(96))
    .div(sqrtPriceX96);
  const reserve0Parsed = ethers.utils.formatUnits(reserve0, 18);
  const reserve1Parsed = ethers.utils.formatUnits(reserve1, 18);

  return {
    token0: {
      address: poolData.token0,
      reserve: reserve0Parsed,
    },
    token1: {
      address: poolData.token1,
      reserve: reserve1Parsed,
    },
  };
}

// ********* MULTICALL w/ single burn check ****************
export async function removeLiquidity(
  tokenId,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }

  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );

  const signerAddress = await signer.getAddress();
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const poolData = await getPoolData(poolContract);
  console.log("poolData log", poolData);

  let positionData = await nonfungiblePositionManagerContract.positions(
    tokenId
  );
  console.log("positionData", positionData);

  const readablePositionData = {
    nonce: positionData.nonce.toString(),
    operator: positionData.operator,
    token0: positionData.token0,
    token1: positionData.token1,
    tickLower: positionData.tickLower,
    tickUpper: positionData.tickUpper,
    liquidity: positionData.liquidity.toString(),
    feeGrowthInside0LastX128: positionData.feeGrowthInside0LastX128.toString(),
    feeGrowthInside1LastX128: positionData.feeGrowthInside1LastX128.toString(),
    tokensOwed0: positionData.tokensOwed0.toString(),
    tokensOwed1: positionData.tokensOwed1.toString(),
  };
  console.log("readablePositionData:", readablePositionData);

  // Decrease Liquidity
  const decreaseParams = {
    tokenId: tokenId,
    liquidity: ethers.BigNumber.from(readablePositionData.liquidity),
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  };
  const decreaseTxEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData(
      "decreaseLiquidity",
      [decreaseParams]
    );

  // Collect Tokens & fees
  const collectParams = {
    tokenId: tokenId,
    recipient: signerAddress,
    amount0Max: ethers.BigNumber.from("999999999999999999"),
    amount1Max: ethers.BigNumber.from("999999999999999999"),
  };
  const collectTxEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData("collect", [
      collectParams,
    ]);

  // Multicall to decrease liquidity and collect tokens
  try {
    try {
      const multicallDecreaseCollect = [decreaseTxEncoded, collectTxEncoded];
      const estimatedGasMulticall =
        await nonfungiblePositionManagerContract.estimateGas[
          "multicall(bytes[])"
        ](multicallDecreaseCollect);
      const gasLimitMulticall = estimatedGasMulticall.add(
        estimatedGasMulticall.mul(20).div(100)
      );
      const multicallCall = await nonfungiblePositionManagerContract[
        "multicall(bytes[])"
      ](multicallDecreaseCollect, { gasLimit: gasLimitMulticall });
      await multicallCall.wait();
      setConfirmationHash(multicallCall.hash);
      console.log("multicall tx:", multicallCall);
    } catch (error) {
      if (error.transactionHash) {
        setTransactionError(error.transactionHash.hash);
      } else if (error.receipt && error.receipt.hash) {
        setTransactionError(error.receipt.hash);
      } else {
        setTransactionError("Unknown error occurred");
      }
    }
  } catch (error) {
    console.error("Failed to execute decrease and collect multicall:", error);
    return;
  }
}

export async function IncreaseLiquidity(
  tokenId,
  tokenQuantity,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }

  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";
  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  // DECODE AND CALL MULTICALL
  const decodedKey = await iKeyInstance.decode(iKey);
  console.log("tits");

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );
  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const poolData = await getPoolData(poolContract);
  console.log("poolData log", poolData);

  // Fetch position details from NonfungiblePositionManager
  let positionData = await nonfungiblePositionManagerContract.positions(
    tokenId
  );
  console.log("positionData", positionData);

  const readablePositionData = {
    nonce: positionData.nonce.toString(),
    operator: positionData.operator,
    token0: positionData.token0,
    token1: positionData.token1,
    tickLower: positionData.tickLower,
    tickUpper: positionData.tickUpper,
    liquidity: positionData.liquidity.toString(),
    feeGrowthInside0LastX128: positionData.feeGrowthInside0LastX128.toString(),
    feeGrowthInside1LastX128: positionData.feeGrowthInside1LastX128.toString(),
    tokensOwed0: positionData.tokensOwed0.toString(),
    tokensOwed1: positionData.tokensOwed1.toString(),
  };
  console.log("readablePositionData before increase:", readablePositionData);

  const amountIn = ethers.utils.parseEther(tokenQuantity);

  const { token0: amount0Desired, token1: amount1Desired } =
    await calculateLiquidityPosition(tokenQuantity);

  const increaseParams = {
    tokenId: tokenId,
    amount0Desired: ethers.utils.parseUnits(amount0Desired.toString(), 18),
    amount1Desired: ethers.utils.parseUnits(amount1Desired.toString(), 18),
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  };
  // WETH contract
  const tokenContract0 = new ethers.Contract(address0, erc20abi, signer);
  // HDT contract
  const tokenContract1 = new ethers.Contract(address1, erc20abi, signer);

  // ****MAKE THIS MULTICALL****
  try {
    const tokenContract0Approval = await tokenContract0.approve(
      positionManagerAddress,
      increaseParams.amount1Desired,
      {
        gasLimit: 1000000,
      }
    );

    setApprovalHash(tokenContract0Approval.hash);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
  try {
    const tokenContract1Approval = await tokenContract1.approve(
      positionManagerAddress,
      increaseParams.amount0Desired,
      {
        gasLimit: 1000000,
      }
    );

    setApprovalHash(tokenContract1Approval.hash);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
  try {
    const increaseTx =
      await nonfungiblePositionManagerContract.increaseLiquidity(
        increaseParams,
        {
          gasLimit: 1000000,
        }
      );
    await increaseTx.wait();
    setConfirmationHash(increaseTx.hash);
    console.log("increaseTx", increaseTx);

    console.log("readablePositionData after increase:", readablePositionData);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
}

export async function DecreaseLiquidity(
  tokenId,
  tokenQuantity,
  setApprovalHash,
  setConfirmationHash,
  setTransactionError
) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }
  const signerAddress = await signer.getAddress();

  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";
  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  // DECODE AND CALL MULTICALL
  const decodedKey = await iKeyInstance.decode(iKey);

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );
  const nonfungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    NonfungiblePositionManagerABIabi,
    signer
  );

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const poolData = await getPoolData(poolContract);

  // Fetch position details from NonfungiblePositionManager
  let positionData = await nonfungiblePositionManagerContract.positions(
    tokenId
  );

  const readablePositionData = {
    nonce: positionData.nonce.toString(),
    operator: positionData.operator,
    token0: positionData.token0,
    token1: positionData.token1,
    tickLower: positionData.tickLower,
    tickUpper: positionData.tickUpper,
    liquidity: positionData.liquidity.toString(),
    feeGrowthInside0LastX128: positionData.feeGrowthInside0LastX128.toString(),
    feeGrowthInside1LastX128: positionData.feeGrowthInside1LastX128.toString(),
    tokensOwed0: positionData.tokensOwed0.toString(),
    tokensOwed1: positionData.tokensOwed1.toString(),
  };

  const amountIn = ethers.utils.parseEther(tokenQuantity);

  const increaseParams = {
    tokenId: tokenId,
    liquidity: amountIn,
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  };

  // Unstake from position, claim rewards, and withdraw ERC721 token to caller's wallet
  const unstakeEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "unstakeToken",
    [decodedKey, tokenId]
  );

  const claimEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "claimReward",
    [rewardToken, signerAddress, 0]
  );

  const withdrawEncoded = UniswapV3StakerInstance.interface.encodeFunctionData(
    "withdrawToken",
    [tokenId, signerAddress, ethers.utils.hexlify([])]
  );

  const multicallStakeClaimRestake = [
    unstakeEncoded,
    claimEncoded,
    withdrawEncoded,
  ];

  const approveEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData("approve", [
      positionManagerAddress,
      tokenId,
    ]);

  const decreaseEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData(
      "decreaseLiquidity",
      [increaseParams]
    );

  const collectParams = {
    tokenId: tokenId,
    recipient: signerAddress,
    amount0Max: ethers.BigNumber.from("99999999999999999"),
    amount1Max: ethers.BigNumber.from("99999999999999999"),
  };
  const collectTxEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData("collect", [
      collectParams,
    ]);

  const approveDecreaseCollectMulticallData = [
    approveEncoded,
    decreaseEncoded,
    collectTxEncoded,
  ];

  const approveRewardsTokenEncoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData("approve", [
      UniswapV3StakerInstance.address,
      tokenId,
    ]);

  const STFencoded =
    nonfungiblePositionManagerContract.interface.encodeFunctionData(
      "safeTransferFrom(address,address,uint256,bytes)",
      [signerAddress, STAKER_ADDRESS, tokenId, iKey]
    );

  const approveSTFmulticallData = [approveRewardsTokenEncoded, STFencoded];
  try {
    // Estimate gas for the first multicall
    const estimatedGasMulticall1 = await UniswapV3StakerInstance.estimateGas[
      "multicall(bytes[])"
    ](multicallStakeClaimRestake);
    const gasLimitMulticall1 = estimatedGasMulticall1.add(
      estimatedGasMulticall1.mul(20).div(100)
    ); // Adding 20% buffer

    const multicallCall1 = await UniswapV3StakerInstance["multicall(bytes[])"](
      multicallStakeClaimRestake,
      { gasLimit: gasLimitMulticall1 }
    );
    await multicallCall1.wait();
    setConfirmationHash(multicallCall1.hash);
    console.log("unstake-claim-withdraw multicall tx:", multicallCall1);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }

  // Estimate gas for the second multicall
  const estimatedGasMulticall2 =
    await nonfungiblePositionManagerContract.estimateGas["multicall(bytes[])"](
      approveDecreaseCollectMulticallData
    );
  const gasLimitMulticall2 = estimatedGasMulticall2.add(
    estimatedGasMulticall2.mul(20).div(100)
  ); // Adding 20% buffer

  try {
    const approveDecreaseCollectMulticall =
      await nonfungiblePositionManagerContract["multicall(bytes[])"](
        approveDecreaseCollectMulticallData,
        { gasLimit: gasLimitMulticall2 }
      );

    await approveDecreaseCollectMulticall.wait();
    setApprovalHash(approveDecreaseCollectMulticall.hash);
    console.log(
      "approveDecreaseCollectMulticall:",
      approveDecreaseCollectMulticall
    );
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }

  try {
    // Estimate gas for the third multicall
    const estimatedGasMulticall3 =
      await nonfungiblePositionManagerContract.estimateGas[
        "multicall(bytes[])"
      ](approveSTFmulticallData);
    const gasLimitMulticall3 = estimatedGasMulticall3.add(
      estimatedGasMulticall3.mul(20).div(100)
    ); // Adding 20% buffer

    const approveSTFmulticall = await nonfungiblePositionManagerContract[
      "multicall(bytes[])"
    ](approveSTFmulticallData, { gasLimit: gasLimitMulticall3 });
    await approveSTFmulticall.wait();
    setConfirmationHash(approveSTFmulticall.hash);
    console.log("approveSTFmulticall:", approveSTFmulticall);
  } catch (error) {
    if (error.transactionHash) {
      setTransactionError(error.transactionHash.hash);
    } else if (error.receipt && error.receipt.hash) {
      setTransactionError(error.receipt.hash);
    } else {
      setTransactionError("Unknown error occurred");
    }
  }
}

export async function ReStake(tokenId, setApprovalHash, setConfirmationHash) {
  const provider = await getConnectedSigner();
  const signer = await provider.getSigner();

  if (!signer) {
    console.error("Connected wallet not available");
    return;
  }

  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";
  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;

  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    signer
  );
  // DECODE AND CALL MULTICALL
  const decodedKey = await iKeyInstance.decode(iKey);
  console.log("tits");

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    signer
  );

  const reStakeTx = await UniswapV3StakerInstance.stakeToken(
    decodedKey,
    tokenId
  );
  await reStakeTx.wait();
  setConfirmationHash(reStakeTx.hash);
  console.log("Token Restaked:", reStakeTx);
}

// Function to calculate incentive APR
export async function calculateIncentiveAPR() {
  const provider = await getConnectedSigner();

  const IKEY_ADDRESS = "0xA0644ea21EDd55F454fB57FE62c6092E27b011b4";
  const STAKER_ADDRESS = "0xf9a1CF576D52F63FdbA1012b72759a0135dF9d16";

  const uniswapV3StakerABIAbi = UniswapV3StakerABI;
  const UniswapV3StakerInstance = new ethers.Contract(
    STAKER_ADDRESS,
    uniswapV3StakerABIAbi,
    provider
  );

  const EncodeIncentiveUniV3ABIAbi = EncodeIncentiveUniV3ABI;
  const iKeyInstance = new ethers.Contract(
    IKEY_ADDRESS,
    EncodeIncentiveUniV3ABIAbi,
    provider
  );

  const rewardTokenAbi = ["function decimals() view returns (uint8)"];
  const rewardTokenContract = new ethers.Contract(
    rewardToken,
    rewardTokenAbi,
    provider
  );
  const rewardTokenDecimals = await rewardTokenContract.decimals();

  const decodedKey = await iKeyInstance.decode(iKey);
  const encodedKey = await iKeyInstance.compute(decodedKey);
  const stakesPerIncentives = await UniswapV3StakerInstance.incentives(
    encodedKey
  );
  const totalRewardUnclaimed = BigInt(stakesPerIncentives[0].toString());
  const totalRewardUnclaimedFormatted =
    Number(totalRewardUnclaimed) / 10 ** rewardTokenDecimals;

  const incentiveDurationInSeconds =
    decodedKey[3].toNumber() - decodedKey[2].toNumber();
  const incentiveDurationInDays = incentiveDurationInSeconds / (60 * 60 * 24);

  const rewardPerDay =
    totalRewardUnclaimedFormatted / Number(incentiveDurationInDays);

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );
  const totalLiquidityRaw = await poolContract.liquidity();
  const totalLiquidity = Number(totalLiquidityRaw) / 10 ** 18;

  // Calculate the amounts of HDT and WETH per unit of liquidity
  const liquidityPosition = await calculateLiquidityPosition("1"); // pass 1 unit/liquidity
  const hdtPerLiquidity = Number(liquidityPosition.token0);
  const wethPerLiquidity = Number(liquidityPosition.token1);

  console.log("hdtPerLiquidity:", hdtPerLiquidity);
  console.log("wethPerLiquidity:", wethPerLiquidity);

  // Convert the token amounts to USD
  const hdtPerLiquidityUSD = await getINtoUSD(HDTtoken, hdtPerLiquidity);
  const wethPerLiquidityUSD = await getINtoUSD(
    { name: "Wrapped Ether" },
    wethPerLiquidity
  );

  // Remove dollar sign from the return of getINtoUSD
  const hdtPerLiquidityUSDNumber = parseFloat(
    hdtPerLiquidityUSD.replace("$", "")
  );
  const wethPerLiquidityUSDNumber = parseFloat(
    wethPerLiquidityUSD.replace("$", "")
  );

  // ---COMMENTED OUT LOG STATEMENTS FOR DEBUGGING---

  // console.log("----totalLiquidityUSD calc----")
  // console.log("hdtPerLiquidityUSD:", hdtPerLiquidityUSD)
  // console.log("wethPerLiquidityUSD:", wethPerLiquidityUSD)
  // console.log("hdtPerLiquidityUSDNumber:", hdtPerLiquidityUSDNumber)
  // console.log("wethPerLiquidityUSDNumber:", wethPerLiquidityUSDNumber)
  // console.log("totalLiquidity:", totalLiquidity)

  const totalLiquidityUSD =
    (hdtPerLiquidityUSDNumber + wethPerLiquidityUSDNumber) * totalLiquidity;
  console.log("totalLiquidityUSD", totalLiquidityUSD); //This returns `NaN

  // Convert the reward per day to USD
  const rewardPerDayUSD = await getINtoUSD(
    { name: "Wrapped Ether" },
    rewardPerDay
  );

  // Calculate for APR
  const calculateAPR = (rewardPerDayUSD, totalLiquidityUSD) => {
    const rewardPerDayUSDUSDNumber = parseFloat(
      rewardPerDayUSD.replace("$", "")
    );
    // console.log("----calulateAPR----")
    // console.log("rewardPerDayUSD:", rewardPerDayUSD)
    // console.log("totalLiquidityUSD", totalLiquidityUSD)
    const daysInYear = 365;
    const apr =
      ((rewardPerDayUSDUSDNumber * daysInYear) / totalLiquidityUSD) * 100;
    // console.log("apr:", apr)
    // console.log("apr.toFixed(2):", apr.toFixed(2))
    return apr.toFixed(2); // Format to 2 decimal places
  };

  const apr = calculateAPR(rewardPerDayUSD, totalLiquidityUSD);
  console.log("Incentive APR in USD:", apr);
  return apr;
}
