// CurrencyContext.js
import React, { createContext, useState } from "react"

const CurrencyContext = createContext()

export const CurrencyProvider = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState("USD")

    return (
        <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export default CurrencyContext
