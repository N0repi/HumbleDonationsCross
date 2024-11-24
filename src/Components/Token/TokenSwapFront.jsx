// TokenSwapFront.jsx

import React, { useState, useEffect } from "react";
import Image from "next/image";

// IMPORT INTERNAL
import Style from "./TokenSwapFront.module.css";
import images from "../../assets";
import { Toggle, LanguageToggle } from "../index";

const TokenSwapFront = ({ setOpenSetting, setSlippageValue }) => {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState(0);
  const [priceInHDT, setPriceInHDT] = useState(null);
  const [slippageQuantity, setSlippageQuantity] = useState("");

  const handleQuantityChange = (e) => {
    setSlippageQuantity(e.target.value);
    setSlippageValue(e.target.value); // Pass the updated value back to SwapFront
  };

  const handleCurrencyToggle = (newCurrency) => {
    setCurrency(newCurrency);
  };

  return (
    <div className={Style.Token}>
      <div className={Style.Token_box}>
        <div className={Style.Token_box_heading}>
          <h4>Settings</h4>
          <div className={Style.box_heading_img}>
            <Image
              src={images.filledGrad}
              alt="close"
              width={50}
              height={50}
              onClick={() => setOpenSetting(false)}
            />
          </div>
        </div>
        <div className={Style.currency}>
          <h3>Currency</h3>
          <h4>
            <LanguageToggle onCurrencyToggle={handleCurrencyToggle} />
          </h4>
        </div>

        <p className={Style.Token_box_para}>Slippage tolerance{""}</p>
        <div className={Style.Token_box_input}>
          <button>Auto</button>
          <input
            type="text"
            placeholder="0.10%"
            value={slippageQuantity}
            onChange={handleQuantityChange}
          />
        </div>

        <div className={Style.Token_box_input}>
          <input type="text" placeholder="30" />
          <button>minutes</button>
        </div>

        <h2>Interface Setting</h2>

        <div className={Style.Token_box_toggle}>
          <p className={Style.Token_box_para}>Transcation dealine</p>
          <Toggle Label="No" />
        </div>
      </div>
    </div>
  );
};

export default TokenSwapFront;
