// TagFilter.jsx

import React from "react";
import Style from "./TagFilter.module.css";
import { Noto_Sans } from "next/font/google";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["500", "800"],
});

function TagFilter({ tags = [], selectedTags = [], onSelectTag }) {
  return (
    <div className={`${Style.selectedTags} ${notoSans.className}`}>
      <button
        className={`${Style.selectedTag} ${Style.allButton} ${
          selectedTags.length === 0 ? Style.activeTag : ""
        }`}
        onClick={() => onSelectTag("All")}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          className={`${Style.selectedTag} ${
            selectedTags.includes(tag) ? Style.activeTag : ""
          }`}
          onClick={() => onSelectTag(tag)}
        >
          {tag}
          <span className={Style.removeTag}></span>
        </button>
      ))}
    </div>
  );
}

export default TagFilter;
