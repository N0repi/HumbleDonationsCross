// withUrqlProviderSolo.js

import React from "react";
import { Provider } from "urql";
import { urqlClients, clientArbitrum } from "./urqlClientNOC";

const withUrqlProvider = (Component) => (props) =>
  (
    <Provider value={clientArbitrum}>
      <Component {...props} />
    </Provider>
  );

export default withUrqlProvider;
