// PayTrad.jsx

import React, { useState, useEffect } from "react";
import { PayEmbed, lightTheme, darkTheme } from "thirdweb/react";
import { NATIVE_TOKEN_ADDRESS } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { sonicTestnet } from "../../../constants/thirdwebChains/sonicTestnet";

import { supportedTokens } from "./SupportedTokens.json";
import Style from "./PadTrad.module.css";

/*
* ADD TO SUPPORTED CHAINS WHEN SONIC IS SUPPORTED *
    "11155111": [
      {
        "address": "0xD8812d5d42ED80977d21213E3088EE7a24aC8B75",
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
  console.log(HDT);

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
                address: "0xBabe338052d822233Df0CD27Be40d6209B86Bae7",
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
