// urqlClientNOC.jsx
import { createClient, cacheExchange, fetchExchange } from "@urql/core";

export const clientSonic = createClient({
  url: "https://api.studio.thegraph.com/query/94844/humbledonationssonic/v0.0.1",
  exchanges: [cacheExchange, fetchExchange],
});

export const clientSepolia = createClient({
  url: "https://api.studio.thegraph.com/query/81322/noc/v0.0.14",
  exchanges: [cacheExchange, fetchExchange],
});

export const clientArbitrum = createClient({
  url: "https://api.studio.thegraph.com/query/94844/humbledonations/v0.0.2",
  exchanges: [cacheExchange, fetchExchange],
});

// Export both clients
export const urqlClients = {
  sonic: clientSonic,
  sepolia: clientSepolia,
  arbitrum: clientArbitrum,
};
