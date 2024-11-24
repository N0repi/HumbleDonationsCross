// graphReact.jsx

import React, { useEffect } from "react"
import { useQuery } from "urql"
import { gql } from "@urql/core"
import { ethers } from "ethers"

const GET_POSITIONS = gql`
    query GetPositions($incentiveId: String!, $owner: String!) {
        positions(first: 50, where: { incentiveId: $incentiveId, owner: $owner }) {
            id
            tokenId
            owner
            incentiveId
            isIdle
            isStaked
            liquidity
        }
    }
`

const Position = ({ owner, onTokenId, positionsUpdated }) => {
    const INCENTIVE_ID = "0xb279444caa7539c9dbf08290505d95222e0093f48afe48e6b48bf1313a816448"

    const [result, reexecuteQuery] = useQuery({
        query: GET_POSITIONS,
        variables: { incentiveId: INCENTIVE_ID, owner },
        pause: !owner,
    })

    console.log("Query Result:", result)

    useEffect(() => {
        if (result.data) {
            try {
                console.log("Processing result data:", result.data)
                const uniqueTokenIds = new Set(result.data.positions.map((p) => p.tokenId))
                if (uniqueTokenIds.size === 0) {
                    console.log("No token IDs found in positions.")
                } else {
                    uniqueTokenIds.forEach((tokenId) => {
                        if (tokenId) {
                            console.log("Valid tokenId:", tokenId)
                            onTokenId(tokenId)
                        } else {
                            console.error("Invalid tokenId found:", tokenId)
                        }
                    })
                }
            } catch (error) {
                console.error("Error processing token IDs:", error)
                // Handle the error gracefully, e.g., by logging it and continuing
            }
        }
    }, [result.data, onTokenId])

    useEffect(() => {
        if (positionsUpdated > 0) {
            reexecuteQuery({ requestPolicy: "network-only" })
        }
    }, [positionsUpdated, reexecuteQuery])

    if (result.fetching) return <p>Loading...</p>
    if (result.error) return <p>Oh no... {result.error.message}</p>

    if (result.data.positions.length === 0) return <p>No positions found.</p>

    return (
        <div>
            {result.data.positions.map((position) => (
                <div key={position.id}>
                    <p>Staked: {ethers.formatUnits(position.liquidity, 18)}</p>
                </div>
            ))}
        </div>
    )
}

export default Position
