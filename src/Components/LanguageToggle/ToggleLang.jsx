// ToggleLang.jsx

import React from "react"

// IMPORT INTERNAL
import Style from "./ToggleLang.module.css"
const ToggleLang = ({ Label }) => {
    return (
        <div>
            <div>
                <input type="checkbox" className={Style.Toggle_checkbox} name={Label} id={Label} />
                <label className={Style.Toggle_label} htmlFor={Label}>
                    <span className={Style.Toggle_inner} />
                    <span className={Style.Toggle_switch} />
                </label>
            </div>
        </div>
    )
}

export default ToggleLang
