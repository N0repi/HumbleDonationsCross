// Liquidity.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Provider } from "urql";
import client from "../../utils/Graph/Liquidity/urqlClient";
import { useAccount } from "wagmi";
import {
  addLPtoPool,
  getRewards,
  unstakeClaimRestake,
  unstakeClaimWithdraw,
  DecreaseLiquidity,
  IncreaseLiquidity,
  calculateReserves,
  calculateLiquidityPosition,
  calculateIncentiveAPR,
} from "./StakingEthers5";
import Position from "../../utils/Graph/Liquidity/graphReact.jsx";
import { getINtoUSD } from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";
import { useTransaction } from "../Transaction/TransactionContext";
import Style from "./Liquidity.module.css";
import Image from "next/image";
import images from "../../assets";

import { useWallet } from "../Wallet/WalletContext";

const convertToHumanReadable = (rawValue, decimals = 18) => {
  const value = BigInt(rawValue); // Ensure the value is treated as a big integer
  const divisor = BigInt(10 ** decimals);
  const humanReadableValue = (Number(value) / Number(divisor)).toFixed(
    decimals
  );
  return humanReadableValue;
};

const Liquidity = () => {
  const { address } = useAccount();
  const [tokenQuantity, setTokenQuantity] = useState("");
  const [rewards, setRewards] = useState({});
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [hasPosition, setHasPosition] = useState(false);
  const [quoteAmounts, setQuoteAmounts] = useState({ amount0: 0, amount1: 0 });
  const [usdValue, setUsdValue] = useState({});
  const [incentiveAPR, setIncentiveAPR] = useState(null);
  const [reserves, setReserves] = useState({ token0: {}, token1: {} });
  const [positionsUpdated, setPositionsUpdated] = useState(0);
  const { setApprovalHash, setConfirmationHash, setTransactionError } =
    useTransaction();
  const { chain } = useWallet();
  const chainId = chain?.id;

  const SUPPORTED_CHAIN_ID = 11155111; // Sepolia chainId

  // Fallback UI for unsupported networks
  const safeBlockchainCall = async (fn, defaultValue = null) => {
    try {
      return await fn();
    } catch (error) {
      console.error("Blockchain call error:", error);
      return defaultValue;
    }
  };

  const handleQuantityChange = async (e) => {
    const quantity = e.target.value;
    setTokenQuantity(quantity);

    if (!isNaN(quantity) && quantity.trim() !== "") {
      const { token0, token1 } = await safeBlockchainCall(
        () => calculateLiquidityPosition(quantity),
        { token0: 0, token1: 0 }
      );
      setQuoteAmounts({ amount0: token0, amount1: token1 });
    } else {
      setQuoteAmounts({ amount0: 0, amount1: 0 });
    }
  };

  const handleTokenId = useCallback(async (tokenId) => {
    try {
      if (!tokenId) {
        throw new Error("Received invalid tokenId");
      }

      const rewardInfo = await safeBlockchainCall(() => getRewards(tokenId), {
        reward: "0",
      });
      const reward = convertToHumanReadable(rewardInfo.reward);

      const formattedReward = parseFloat(reward).toFixed(5);

      setRewards((prevRewards) => ({
        ...prevRewards,
        [tokenId]: {
          tokenId,
          rewardInfo: {
            ...rewardInfo,
            reward: formattedReward,
          },
        },
      }));

      setHasPosition(true);
      setSelectedTokenId(tokenId);

      const usdValue = await safeBlockchainCall(
        () => getINtoUSD({ name: "Wrapped Ether" }, reward),
        "0"
      );
      setUsdValue((prevUsdValue) => ({
        ...prevUsdValue,
        [tokenId]: usdValue,
      }));
    } catch (error) {
      console.error("Error in handleTokenId:", error);
    }
  }, []);

  const fetchAndCalculateReserves = async () => {
    const reservesData = await safeBlockchainCall(calculateReserves, {
      token0: { reserve: 0 },
      token1: { reserve: 0 },
    });
    setReserves(reservesData);
  };

  useEffect(() => {
    fetchAndCalculateReserves();
  }, []);
  const handleDecreaseLiquidity = async () => {
    console.warn(
      "handleDecreaseLiquidity called on unsupported network or undefined setup."
    );
  };

  const handleIncreaseLiquidity = async () => {
    console.warn(
      "handleIncreaseLiquidity called on unsupported network or undefined setup."
    );
  };

  const handleAddLPtoPool = async () => {
    console.warn(
      "handleAddLPtoPool called on unsupported network or undefined setup."
    );
  };

  const handleUnstakeClaimWithdraw = async () => {
    console.warn(
      "handleUnstakeClaimWithdraw called on unsupported network or undefined setup."
    );
  };
  useEffect(() => {
    async function fetchIncentiveAPR() {
      const apr = await safeBlockchainCall(calculateIncentiveAPR, 0);
      setIncentiveAPR(apr);
    }
    fetchIncentiveAPR();
  }, []);

  useEffect(() => {
    if (positionsUpdated > 0) {
      handleTokenId(selectedTokenId);
    }
  }, [positionsUpdated, selectedTokenId, handleTokenId]);

  return (
    <Provider value={client}>
      {chainId !== SUPPORTED_CHAIN_ID && (
        <div className={Style.unsupportedNetwork}>
          <h2>Unsupported Network</h2>
          <p>
            This feature is only available on the Sepolia Testnet. The custom
            staking pool will be initialized on Arbitrum One in the near future.
          </p>
        </div>
      )}
      <div className={`${Style.ParentLP} ${Style.glassBackground}`}>
        <div className={Style.CenteredItem}>
          <Image src={images.HDTETH} width={170} height={170} alt="HDTETH" />
        </div>
        {incentiveAPR && (
          <div className={Style.aprTopRight}>
            <p>APR: {incentiveAPR}%</p>
          </div>
        )}
        <div className={Style.stakedRewards}>
          {address && (
            <Position
              key={positionsUpdated}
              owner={address}
              onTokenId={handleTokenId}
              positionsUpdated={positionsUpdated}
            />
          )}
        </div>
        <div className={Style.InputWrapper}>
          <div className={Style.ImageWrapper} onClick={handleDecreaseLiquidity}>
            <Image
              src={images.minusCircle}
              width={42}
              height={42}
              alt="minusCircle"
            />
          </div>
          <div className={Style.DonateBox_box_input}>
            <input
              type="text"
              placeholder={
                tokenQuantity && Number(tokenQuantity) > 0 ? tokenQuantity : "0"
              }
              value={tokenQuantity}
              onChange={handleQuantityChange}
            />
          </div>

          <div className={Style.ImageWrapper} onClick={handleIncreaseLiquidity}>
            <Image
              src={images.plusCircle}
              width={42}
              height={42}
              alt="plusCircle"
            />
          </div>
        </div>
        <div className={Style.CenteredItem}>
          {!hasPosition ? (
            <div className={Style.button}>
              <button onClick={handleAddLPtoPool}>Mint</button>
            </div>
          ) : (
            <>
              <div className={Style.button}>
                <button
                  onClick={() => {
                    if (selectedTokenId) {
                      unstakeClaimRestake(
                        selectedTokenId,
                        setApprovalHash,
                        setConfirmationHash,
                        setTransactionError
                      );
                    } else {
                      console.error("No tokenId selected");
                    }
                  }}
                >
                  Claim
                </button>
              </div>
              <div className={Style.button}>
                <button onClick={handleUnstakeClaimWithdraw}>Withdraw</button>
              </div>
            </>
          )}
        </div>
        {tokenQuantity.trim() !== "" && !isNaN(tokenQuantity) && (
          <>
            <div className={Style.CenteredItem}>
              <p>{quoteAmounts.amount0} HDT </p>
            </div>
            <div className={Style.CenteredItem}>
              <p>{quoteAmounts.amount1} WETH</p>
            </div>
          </>
        )}
        <div className={Style.rewards}>
          {Object.values(rewards).map(({ tokenId, rewardInfo }) => (
            <div key={tokenId} style={{ cursor: "pointer" }}>
              <p>
                Rewards: {rewardInfo.reward} WETH | {usdValue[tokenId]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Provider>
  );
};

export default Liquidity;
