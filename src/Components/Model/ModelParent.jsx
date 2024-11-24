// Model Parent

import React from "react"
import Model from "./Model"
import { useConnect } from "wagmi"

const ModelParent = () => {
    const { connect } = useConnect()

    return (
        <div>
            {/* Other components */}
            <Model connect={connect} />
            {/* Other components */}
        </div>
    )
}

export default ModelParent
