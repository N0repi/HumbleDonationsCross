// ConnectedWallet.jsx

import { useWallet } from "../../Wallet/WalletContext"

export default function ConnectedWallet() {
    const { wagmiAddress, thirdwebActiveAccount } = useWallet()

    const walletAddress = wagmiAddress || thirdwebActiveAccount?.address

    console.log("ConnectedWallet - ", thirdwebActiveAccount?.address)

    const formattedWalletAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

    return <span>{formattedWalletAddress}</span>
}
