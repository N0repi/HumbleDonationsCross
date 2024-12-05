// donate.js

// import { Parkinsans } from "next/font/google";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WrappedProjectsList from "./projects/ProjectList4";
import TagFilter from "./projects/TagFilter";
import SortDropdown from "./projects/SortDropdown";
import Style from "./donate.module.css";
import images from "../assets";

// const parkinsans = Parkinsans({ subsets: ["latin"] });

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]); // State to track selected tags
  const [showTagFilter, setShowTagFilter] = useState(false); // State to track the visibility of TagFilter
  const [tags] = useState([
    "AI",
    "Art",
    "Content Creator",
    "DeFi",
    "Developer",
    "E-commerce",
    "Educational",
    "Fashion & Beauty",
    "Health & Wellness",
    "Medical",
    "Non-Profit",
    "Protocol",
    "Research",
    "Science",
    "Simply Struggling",
    "Small Business",
    "Start-up",
    "Technology",
    "Video Game",
    "Web3",
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

  // const handleMouseLeave = () => {
  //   timeoutId = setTimeout(() => {
  //     setShowTagFilter(false);
  //   }, 900);
  // };

  const handleTagSelect = (tag) => {
    if (tag === "All") {
      setSelectedTags([]);
    } else {
      setSelectedTags((prevTags) =>
        prevTags.includes(tag)
          ? prevTags.filter((t) => t !== tag)
          : [...prevTags, tag]
      );
    }
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
                onClick={handleMouseEnter}
                // onMouseLeave={handleMouseLeave}
              >
                <Image
                  src={images.filter}
                  alt="filter"
                  width={30}
                  height={30}
                  onClick={() => setShowTagFilter(!showTagFilter)}
                  className={showTagFilter ? Style.filteredImage : ""}
                />
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
              // onMouseLeave={handleMouseLeave}
            >
              <div className={Style.filterImage}>
                <Image
                  src={images.filter}
                  alt="filter"
                  width={30}
                  height={30}
                  onClick={() => setShowTagFilter(!showTagFilter)}
                  className={showTagFilter ? Style.filteredImage : ""}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Render the Tag Filter before the heading and project list */}
        {showTagFilter && (
          <TagFilter
            tags={tags}
            selectedTags={selectedTags}
            onSelectTag={handleTagSelect}
          />
        )}

        <h1 className={Style.fundable}>Projects</h1>
        <div>
          <WrappedProjectsList
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            sortByNewest={sortByNewest}
            sortBySepolia={sortBySepolia}
            sortBySonic={sortBySonic}
          />
        </div>
      </main>
    </>
  );
}
