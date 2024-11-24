// TokenList.jsx

import React from "react"
import Image from "next/image"

// IMPORT INTERNAL
import Style from "./TokenList.module.css"
import images from "../../assets"

const TokenList = ({ tokenData, setOpenTokenBox }) => {
    // demo array
    const data = [1, 2, 3, 4, 5, 6, 7]
    return (
        <div className={Style.TokenList}>
            <p onClick={() => setOpenTokenBox(false)}></p>
            <div className={Style.TokenList_title}>
                <h2>Token List</h2>
            </div>

            {data.map((el, i) => (
                <div className={Style.TokenList_box}>
                    <div className={Style.TokenList_box_info}>
                        <p className={Style.TokenList_box_info_symbol}>HEY</p>
                        <p>
                            <span>34</span> GOLD COIN
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ;<div>
//     <p className="py-20">Press ESC key or click outside to close</p>
// </div>

export default TokenList
