// TagFilter.jsx

import React from "react"
import Style from "./TagFilter.module.css"

function TagFilter({ tags = [], onSelectTag }) {
    return (
        <div className={Style.selectedTags}>
            <button
                className={`${Style.selectedTag} ${Style.allButton}`}
                onClick={() => onSelectTag("")}
            >
                All
            </button>
            {tags.map((tag) => (
                <button className={Style.selectedTag} key={tag} onClick={() => onSelectTag(tag)}>
                    {tag}
                    <span className={Style.removeTag}></span>
                </button>
            ))}
        </div>
    )
}

export default TagFilter
