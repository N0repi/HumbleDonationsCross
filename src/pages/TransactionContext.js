// TransactionContext.js

import React, { createContext, useContext, useState } from "react"

const TransactionContext = createContext()

export const TransactionProvider = ({ children }) => {
    const [approvalHash, setApprovalHash] = useState(null)
    const [confirmationHash, setConfirmationHash] = useState(null)
    const [donationHash, setDonationHash] = useState(null)
    const [burnHash, setBurnHash] = useState(null)
    const [transactionError, setTransactionError] = useState(null) // for transaction errors / failures

    const resetTransactionState = () => {
        setApprovalHash(null)
        setConfirmationHash(null)
        setDonationHash(null)
        setBurnHash(null)
        setTransactionError(null)
    }

    return (
        <TransactionContext.Provider
            value={{
                approvalHash,
                setApprovalHash,
                confirmationHash,
                setConfirmationHash,
                donationHash,
                setDonationHash,
                burnHash,
                setBurnHash,
                transactionError,
                setTransactionError,
                resetTransactionState,
            }}
        >
            {children}
        </TransactionContext.Provider>
    )
}

export const useTransaction = () => {
    const context = useContext(TransactionContext)
    if (!context) {
        throw new Error("useTransaction must be used within a TransactionProvider")
    }
    return context
}

const TransactionContextWrapper = ({ children }) => (
    <TransactionProvider>{children}</TransactionProvider>
)

export default TransactionContextWrapper
