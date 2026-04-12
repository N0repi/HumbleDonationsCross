// SortDropdown.jsx

import React from "react";
import Style from "./SortDropdown.module.css";

export default function SortDropdown({
  onAll,
  onNewest,
  onOldest,
  onArbitrum,
  onSonic,
  onClose,
}) {
  return (
    <div className={Style.dropdownMenu}>
      <button className={Style.dropdownItem} onClick={onAll}>
        All
      </button>
      <button className={Style.dropdownItem} onClick={onNewest}>
        Newest
      </button>
      <button className={Style.dropdownItem} onClick={onOldest}>
        Oldest
      </button>
      <button className={Style.dropdownItem} onClick={onArbitrum}>
        Arbitrum
      </button>
      <button className={Style.dropdownItem} onClick={onSonic}>
        Sonic
      </button>

      <button className={Style.closeButton} onClick={onClose}>
        Close
      </button>
    </div>
  );
}
