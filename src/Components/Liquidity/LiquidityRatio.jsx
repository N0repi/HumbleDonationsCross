// LiquidityRatio.jsx

import React, { useEffect, useState } from "react"
import { ethers } from "ethers"
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"

const poolAddress = "0x326fDb8fB3D796124F9D7a3F8F0758D510823Aac" // HDT/WETH Sepolia
const IUniswapV3PoolABIabi = IUniswapV3PoolABI

async function getConnectedSigner() {
    if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" })
        const provider = new ethers.BrowserProvider(window.ethereum)

        return provider
    } else {
        console.error("Web3 provider not available")
        return null
    }
}

async function getPoolData() {
    const provider = await getConnectedSigner()
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABIabi, provider)
    const [liquidity, sqrtPriceX96] = await Promise.all([
        poolContract.liquidity(),
        poolContract.slot0().then((slot0) => slot0[0]),
    ])

    return {
        liquidity,
        sqrtPriceX96,
    }
}

function sqrtPriceX96ToPrice(sqrtPriceX96) {
    const bigInt2Pow96 = BigInt(2) ** BigInt(96)
    const price = (BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96)) / bigInt2Pow96
    return Number(price) / 1e18 // Adjust for the correct decimal places
}

const LiquidityRatio = () => {
    const [ratio, setRatio] = useState({ hdtPerLiquidity: 0, wethPerLiquidity: 0 })

    useEffect(() => {
        async function fetchAndCalculate() {
            const poolData = await getPoolData()
            const price = sqrtPriceX96ToPrice(poolData.sqrtPriceX96)
            const liquidity = Number(poolData.liquidity.toString())

            console.log("Price:", price)
            console.log("Liquidity:", liquidity)

            // Calculate the amount of each token for 1000 liquidity units
            const wethPerLiquidity = 1000 / (price * liquidity)
            const hdtPerLiquidity = (1000 * price) / liquidity

            console.log("WETH per 1000 Liquidity Units:", wethPerLiquidity)
            console.log("HDT per 1000 Liquidity Units:", hdtPerLiquidity)

            setRatio({
                hdtPerLiquidity: hdtPerLiquidity.toFixed(18),
                wethPerLiquidity: wethPerLiquidity.toFixed(18),
            })
        }

        fetchAndCalculate()
    }, [])

    return (
        <div>
            <p>1000 Liquidity Units:</p>
            <p>{ratio.hdtPerLiquidity} HDT</p>
            <p>{ratio.wethPerLiquidity} WETH</p>
        </div>
    )
}

export default LiquidityRatio
