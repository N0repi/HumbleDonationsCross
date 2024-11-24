// DisconnectButton.jsx

import React from "react"
import { useDisconnect, useAccount, isConnected } from "wagmi"
import { useDisconnect as thirdwebDisconnect, useActiveWallet } from "thirdweb/react"

import { useWallet } from "./WalletContext"

export default function DisconnectButton({ onLogout }) {
    const { thirdwebActiveWallet, wagmiIsConnected } = useWallet()
    const { disconnect } = useDisconnect()
    const { disconnect: thirdwebDisconnectFunction } = thirdwebDisconnect()

    const disconnectAll = async () => {
        console.log("Initiating disconnect sequence...")

        if (wagmiIsConnected) {
            await disconnect()
            console.log("Wagmi wallet disconnected")
        }

        if (thirdwebActiveWallet) {
            try {
                await thirdwebDisconnectFunction(thirdwebActiveWallet)
                console.log("Thirdweb wallet disconnected successfully")
            } catch (error) {
                console.error("Error disconnecting thirdweb wallet:", error)
            }
        }

        // Clear SIWE session
        const response = await fetch("/api/auth/logout", { method: "POST" })
        const result = await response.json()
        if (result.ok) {
            console.log("SIWE session destroyed successfully")
        } else {
            console.error("Error destroying SIWE session")
        }

        onLogout() // This should immediately update the state to reflect the disconnected status
    }

    return <button onClick={disconnectAll}>Disconnect</button>
}
