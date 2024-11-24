// useAggregatedProjects.js

import { useEffect, useState } from "react";
import { GET_PROJECTS } from "../graphReactNOC";
import { fetchFromBothSubgraphs } from "./fetchDataFromSubgraphs";

export const useAggregatedProjects = (query, variables = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await fetchFromBothSubgraphs(query, variables);

      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
      setLoading(false);
    };

    fetchData();
  }, [query, variables]);

  return { data, loading, error };
};
