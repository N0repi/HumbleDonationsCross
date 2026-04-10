import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { createThirdwebClient } from "thirdweb";

const ThirdwebClientContext = createContext(null);

export function ThirdwebClientProvider({ children }) {
  const [client, setClient] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get("/api/thirdweb/config");
        setClient(
          createThirdwebClient({
            clientId: data.clientId,
          }),
        );
      } catch (error) {
        console.error("Error fetching Thirdweb config:", error);
      }
    };
    fetchConfig();
  }, []);

  if (!client) {
    return (
      <div className="hdThirdwebBoot" role="status" aria-live="polite">
        <p className="hdThirdwebBootText">Loading wallet configuration…</p>
      </div>
    );
  }

  return (
    <ThirdwebClientContext.Provider value={client}>
      {children}
    </ThirdwebClientContext.Provider>
  );
}

export const useThirdwebClient = () => useContext(ThirdwebClientContext);
