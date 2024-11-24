// withUrqlProvider.js

import React from "react";
import { Provider } from "urql";
import { urqlClients, clientArbitrum } from "./urqlClientNOC";
import { useWallet } from "../../../Components/Wallet/WalletContext";
const withUrqlProvider = (Component) => (props) => {
  // Access chain from useWallet
  const { chain } = useWallet();
  const chainId = chain?.id;

  // Dynamically set the appropriate client based on chainId
  const selectedClient =
    chainId === 42161 // Arbitrum chain ID
      ? clientArbitrum
      : urqlClients; // Default or other client

  return (
    <Provider value={selectedClient}>
      <Component {...props} />
    </Provider>
  );
};

export default withUrqlProvider;
