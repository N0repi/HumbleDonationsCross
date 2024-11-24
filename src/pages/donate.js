// donate.js

import { Inter } from "next/font/google";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WrappedProjectsList from "./projects/ProjectList4";
import TagFilter from "./projects/TagFilter";
import SortDropdown from "./projects/SortDropdown";
import Style from "./donate.module.css";
import images from "../assets";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(""); // State to track the selected tag
  const [showTagFilter, setShowTagFilter] = useState(false); // State to track the visibility of TagFilter
  const [tags, setTags] = useState([
    "Artistic",
    "Content Creator",
    "DeFi",
    "Educational",
    "Non-Profit",
  ]);
  const [sortByNewest, setSortByNewest] = useState(false);
  const [sortBySepolia, setSortBySepolia] = useState(false);
  const [sortBySonic, setSortBySonic] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);

  const handleSortClick = () => {
    setShowSortOptions(!showSortOptions);
  };

  const handleSortByNewest = () => {
    setSortByNewest(true);
    setShowSortOptions(false);
  };

  const handleSortByOldest = () => {
    setSortByNewest(false);
    setShowSortOptions(false);
  };

  const handleSortBySepolia = () => {
    setSortBySepolia(!sortBySepolia);
    setSortBySonic(false);
  };

  const handleSortBySonic = () => {
    setSortBySonic(!sortBySonic);
    setSortBySepolia(false);
  };

  let timeoutId;

  const handleMouseEnter = () => {
    clearTimeout(timeoutId);
    setShowTagFilter(true);
  };

  const handleMouseLeave = () => {
    timeoutId = setTimeout(() => {
      setShowTagFilter(false);
    }, 900);
  };

  return (
    <>
      <main className={Style.main}>
        <div className={Style.header}>
          <div className={Style.buttonContainer}>
            <Link legacyBehavior href="./newproject">
              <a className={`${Style.createButton}`}>Create Project</a>
            </Link>
            <div className={Style.searchBar}>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Filter Button */}
            <div className={Style.hideOnMobile}>
              <div
                className={Style.filter}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Image
                  src={images.filter}
                  alt="filter"
                  width={30}
                  height={30}
                  tags={tags}
                  onClick={() => setShowTagFilter(!showTagFilter)}
                  className={showTagFilter ? Style.filteredImage : ""}
                />
                {showTagFilter && (
                  <TagFilter tags={tags} onSelectTag={setSelectedTag} />
                )}
              </div>
            </div>
            {/* Sort Options */}
            <div className={Style.hideOnMobile}>
              <button onClick={handleSortClick} className={Style.sortLabel}>
                <span className={Style.sort}>Sort</span>
                <Image
                  src={images.sort}
                  alt="sort"
                  width={30}
                  height={30}
                  tags={tags}
                />
              </button>
              {showSortOptions && (
                <SortDropdown
                  onNewest={handleSortByNewest}
                  onOldest={handleSortByOldest}
                  onSepolia={handleSortBySepolia}
                  onSonic={handleSortBySonic}
                  onClose={() => setShowSortOptions(false)}
                />
              )}
            </div>
          </div>
        </div>
        {/* Mobile Filter and Sort Options */}
        <div className={Style.hideOnDesktop}>
          <div className={Style.mobileFilterSort}>
            <button onClick={handleSortClick} className={Style.sortLabel}>
              <span className={Style.sort}>Sort</span>
              <Image
                src={images.sort}
                alt="sort"
                width={31}
                height={31}
                tags={tags}
              />
            </button>
            {showSortOptions && (
              <SortDropdown
                onNewest={handleSortByNewest}
                onOldest={handleSortByOldest}
                onSepolia={handleSortBySepolia}
                onSonic={handleSortBySonic}
                onClose={() => setShowSortOptions(false)}
              />
            )}
            <div
              className={Style.filter}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className={Style.filterImage}>
                <Image
                  src={images.filter}
                  alt="filter"
                  tags={tags}
                  onClick={() => setShowTagFilter(!showTagFilter)}
                  className={showTagFilter ? Style.filteredImage : ""}
                />
              </div>
              {showTagFilter && (
                <TagFilter tags={tags} onSelectTag={setSelectedTag} />
              )}
            </div>
          </div>
        </div>

        <h1 className={Style.fundable}>Projects</h1>
      </main>

      <div>
        <WrappedProjectsList
          searchQuery={searchQuery}
          selectedTag={selectedTag}
          sortByNewest={sortByNewest}
          sortBySepolia={sortBySepolia}
          sortBySonic={sortBySonic}
        />
      </div>
    </>
  );
}
