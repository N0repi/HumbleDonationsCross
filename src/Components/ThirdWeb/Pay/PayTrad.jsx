// PayTrad.jsx

import React, { useState, useEffect } from "react";
import { PayEmbed, lightTheme, darkTheme } from "thirdweb/react";
import { NATIVE_TOKEN_ADDRESS } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { sonicMainnet } from "../../../constants/thirdwebChains/sonicMainnet";

import { supportedTokens } from "./SupportedTokens.json";

/*
* ADD TO SUPPORTED CHAINS WHEN SONIC IS SUPPORTED *
    "11155111": [
      {
        "address": "0x033b82aB3ba626cCCad412a2532897Af82890C72",
        "name": "Humble Donations Token",
        "symbol": "HDT",
        "icon": "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmYKTudDM3chor2KUUQVrRQgyaYvc1XQ6EggVkutpr1zJf"
      },

      {
        "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "name": "Sonic",
        "symbol": "S",
        "icon": "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/Qmasy6mWYuHkWd3icjicqWQshgFh2owwoCSMVK9oFvHJTZ"
      },
      {
        "address": "0x83582dcBE9A2897504C777E3E56344bdFAe610bf",
        "name": "Tether USD",
        "symbol": "USDT",
        "icon": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
      }
*/

const customTheme = lightTheme({
  colors: {
    modalBg: "rgba(175, 173, 173, 0.6)",
  },
});

export default function Buy({ client, isOpen, onClose, chain, HDT }) {
  const [error, setError] = useState(null);

  console.log(chain);
  /* 
  `chain` is not passed to `<PayEmbed />` because Thirdweb does not yet support Sonic
  ---> Once it does, pass chain and make allowEdits: { chain: true,}

  Same with the HDT address in `prefillBuy`
  */

  useEffect(() => {
    if (isOpen && !client) {
      setError("Client not initialized properly");
    }
  }, [isOpen, client]);

  return (
    <div>
      {isOpen && client ? (
        <PayEmbed
          client={client}
          payOptions={{
            prefillBuy: {
              token: {
                address: "0xBabe35F94fE6076474F65771Df60d99cb097323A",
                name: "Humble Donations Token",
                symbol: "HDT",
                icon: "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmYKTudDM3chor2KUUQVrRQgyaYvc1XQ6EggVkutpr1zJf",
              },

              chain: arbitrum,
              allowEdits: {
                amount: true, // allow editing buy amount
                token: true, // allow selecting buy token
                chain: false, // disable selecting buy chain
              },
            },
          }}
          supportedTokens={supportedTokens}
          theme={customTheme}
          onClose={onClose}
        />
      ) : (
        <p>{error}</p>
      )}
    </div>
  );
}
