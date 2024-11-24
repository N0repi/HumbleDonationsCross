// Liquidity.jsx

import React, { useState, useEffect, useCallback } from "react"
import { Provider } from "urql"
import client from "../../utils/Graph/Liquidity/urqlClient"
import { useAccount } from "wagmi"
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
} from "./StakingEthers5"
import Position from "../../utils/Graph/Liquidity/graphReact.jsx"
import { getINtoUSD } from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs"
import { useTransaction } from "../../pages/TransactionContext"
import Style from "./Liquidity.module.css"
import Image from "next/image"
import images from "../../assets"

const convertToHumanReadable = (rawValue, decimals = 18) => {
    const value = BigInt(rawValue) // Ensure the value is treated as a big integer
    const divisor = BigInt(10 ** decimals)
    const humanReadableValue = (Number(value) / Number(divisor)).toFixed(decimals)
    return humanReadableValue
}

const Liquidity = () => {
    const { address } = useAccount()
    const [tokenQuantity, setTokenQuantity] = useState("")
    const [rewards, setRewards] = useState({})
    const [selectedTokenId, setSelectedTokenId] = useState(null)
    const [hasPosition, setHasPosition] = useState(false)
    const [quoteAmounts, setQuoteAmounts] = useState({ amount0: 0, amount1: 0 })
    const [usdValue, setUsdValue] = useState({})
    const [incentiveAPR, setIncentiveAPR] = useState(null)
    const [reserves, setReserves] = useState({ token0: {}, token1: {} })
    const [positionsUpdated, setPositionsUpdated] = useState(0)
    const { setApprovalHash, setConfirmationHash, setTransactionError } = useTransaction()

    const handleQuantityChange = async (e) => {
        const quantity = e.target.value
        setTokenQuantity(quantity)

        if (!isNaN(quantity) && quantity.trim() !== "") {
            const { token0, token1 } = await calculateLiquidityPosition(quantity)
            setQuoteAmounts({ amount0: token0, amount1: token1 })
        } else {
            setQuoteAmounts({ amount0: 0, amount1: 0 })
        }
    }

    const handleTokenId = useCallback(async (tokenId) => {
        try {
            if (!tokenId) {
                throw new Error("Received invalid tokenId")
            }

            const rewardInfo = await getRewards(tokenId)
            const reward = convertToHumanReadable(rewardInfo.reward)

            const formattedReward = parseFloat(reward).toFixed(5)

            setRewards((prevRewards) => ({
                ...prevRewards,
                [tokenId]: {
                    tokenId,
                    rewardInfo: {
                        ...rewardInfo,
                        reward: formattedReward,
                    },
                },
            }))

            setHasPosition(true)
            setSelectedTokenId(tokenId)

            const usdValue = await getINtoUSD({ name: "Wrapped Ether" }, reward)
            setUsdValue((prevUsdValue) => ({
                ...prevUsdValue,
                [tokenId]: usdValue,
            }))
        } catch (error) {
            console.error("Error in handleTokenId:", error)
            // Handle the error gracefully
        }
    }, [])

    const fetchAndCalculateReserves = async () => {
        const reservesData = await calculateReserves()
        setReserves(reservesData)
    }

    useEffect(() => {
        fetchAndCalculateReserves()
    }, [])

    useEffect(() => {
        async function fetchIncentiveAPR() {
            const apr = await calculateIncentiveAPR()
            setIncentiveAPR(apr)
        }
        fetchIncentiveAPR()
    }, [])

    useEffect(() => {
        if (positionsUpdated > 0) {
            handleTokenId(selectedTokenId)
        }
    }, [positionsUpdated, selectedTokenId, handleTokenId])

    const handleAddLPtoPool = async () => {
        await addLPtoPool(tokenQuantity, setApprovalHash, setConfirmationHash, setTransactionError)
        setPositionsUpdated((prev) => prev + 1)
    }

    const handleIncreaseLiquidity = async () => {
        await IncreaseLiquidity(
            selectedTokenId,
            tokenQuantity,
            setApprovalHash,
            setConfirmationHash,
            setTransactionError
        )
        setPositionsUpdated((prev) => prev + 1)
    }

    const handleDecreaseLiquidity = async () => {
        await DecreaseLiquidity(
            selectedTokenId,
            tokenQuantity,
            setApprovalHash,
            setConfirmationHash,
            setTransactionError
        )
        setPositionsUpdated((prev) => prev + 1)
    }

    const handleUnstakeClaimWithdraw = async () => {
        await unstakeClaimWithdraw(
            selectedTokenId,
            setApprovalHash,
            setConfirmationHash,
            setTransactionError
        )
        setPositionsUpdated((prev) => prev + 1)
    }

    return (
        <Provider value={client}>
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
                        <Image src={images.minusCircle} width={42} height={42} alt="minusCircle" />
                    </div>
                    <div className={Style.HeroSection_box_input}>
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
                        <Image src={images.plusCircle} width={42} height={42} alt="plusCircle" />
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
                                            )
                                        } else {
                                            console.error("No tokenId selected")
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

                {/* <div>Pool Reserve</div>
                <div className={Style.CenteredItem}>
                    <p>{reserves.token1.reserve?.toString()} HDT</p>
                </div>
                <div className={Style.CenteredItem}>
                    <p>{reserves.token0.reserve?.toString()} WETH</p>
                </div> */}
            </div>
        </Provider>
    )
}

export default Liquidity
