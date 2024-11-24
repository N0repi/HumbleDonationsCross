// fetchDataFromSubgraphs.js

import { urqlClients } from "../urqlClientNOC";

export const fetchFromBothSubgraphs = async (query, variables = {}) => {
  const { sonic, sepolia } = urqlClients;

  const [sonicResult, sepoliaResult] = await Promise.all([
    sonic.query(query, variables).toPromise(),
    sepolia.query(query, variables).toPromise(),
  ]);

  if (sonicResult.error || sepoliaResult.error) {
    console.error(
      "Error fetching data:",
      sonicResult.error,
      sepoliaResult.error
    );
    return { error: sonicResult.error || sepoliaResult.error };
  }

  return [
    ...(sonicResult.data?.projects || []),
    ...(sepoliaResult.data?.projects || []),
  ];
};
