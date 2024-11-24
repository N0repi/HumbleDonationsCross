// LanguageToggle.jsx

import React, { useState, useContext } from "react"
import { ToggleLang } from "../index" // Assuming Toggle component is in the same directory
import Style from "./LanguageToggle.module.css"
import Image from "next/image"
import images from "../../assets"

import CurrencyContext from "./CurrencyContext.jsx"

const LanguageToggle = ({ onCurrencyToggle }) => {
    const [showImageA, setShowImageA] = useState(true) // State to track which image to display
    const { selectedCurrency, setSelectedCurrency } = useContext(CurrencyContext) // Get selectedCurrency and setSelectedCurrency from context

    const toggleImage = () => {
        const newCurrency = selectedCurrency === "USD" ? "JPY" : "USD"
        setSelectedCurrency(newCurrency) // Update the selectedCurrency in the context
        onCurrencyToggle(newCurrency) // Call the callback function with the updated currency
        setShowImageA((prevState) => !prevState) // Toggle between true and false
        console.log(`LanguageToggle - newCurrency: ${newCurrency}`)
    }

    return (
        <div className={Style.ToggleImages} onClick={toggleImage}>
            <label className={Style.Toggle_label} htmlFor="Toggle">
                {showImageA ? (
                    <Image src={images.usa} alt="usa" width={50} height={50} />
                ) : (
                    <Image src={images.jp} alt="jp" width={50} height={50} />
                )}
                <span className={Style.Toggle_switch} />
            </label>
        </div>
    )
}

export default LanguageToggle
