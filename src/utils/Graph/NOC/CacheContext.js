// CacheContext.js

// @# Replace with URQL's method commented-out in ProjectList4.js when Sonic is supported for TheGraph Stuido

import React, { createContext, useContext, useState } from "react";

const CacheContext = createContext();

export const CacheProvider = ({ children }) => {
  const [cache, setCache] = useState({});

  const updateCache = (key, data) => {
    setCache((prevCache) => ({ ...prevCache, [key]: data }));
  };

  return (
    <CacheContext.Provider value={{ cache, updateCache }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => useContext(CacheContext);
