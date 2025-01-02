// fetchDataFromSubgraphs.js

import { urqlClients } from "../urqlClientNOC";

export const fetchFromBothSubgraphs = async (query, variables = {}) => {
  const { arbitrum, sonic, sepolia } = urqlClients;

  const [arbitrumResult, sonicResult] = await Promise.all([
    arbitrum.query(query, variables).toPromise(),
    sonic.query(query, variables).toPromise(),
    sepolia.query(query, variables).toPromise(),
  ]);

  if (arbitrumResult.error || sonicResult.error) {
    console.error(
      "Error fetching data:",
      arbitrumResult.error,
      sonicResult.error
    );
    return { error: arbitrumResult.error || sonicResult.error };
  }

  return [
    ...(arbitrumResult.data?.projects || []),
    ...(sonicResult.data?.projects || []),
  ];
};
