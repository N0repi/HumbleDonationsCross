// ConnectedWalletFull.jsx

import { useState, useEffect } from "react"
import Image from "next/image"
import images from "../../../assets"
import { useWallet } from "../../Wallet/WalletContext"

export default function ConnectedWalletFull() {
    const { wagmiAddress, thirdwebActiveAccount } = useWallet()
    const [copied, setCopied] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    const walletAddress = wagmiAddress || thirdwebActiveAccount?.address

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000) // Reset back to `copy` after 2 seconds
    }

    // Check window width to determine if mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768) // Example threshold for mobile devices
        }

        handleResize() // Initial check
        window.addEventListener("resize", handleResize)

        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const slicedAddress = `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <span>{isMobile ? slicedAddress : walletAddress}</span>

            <button onClick={handleCopy}>
                <Image
                    src={copied ? images.copyDark : images.copy}
                    alt="copy"
                    width={24}
                    height={24}
                />
            </button>
        </div>
    )
}
