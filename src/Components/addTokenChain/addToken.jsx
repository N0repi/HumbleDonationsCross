// addToken.jsx

import React from "react";
import Image from "next/image";
import images from "../../assets";

// Define token details

// Sonic
// const tokenDetails = {
//   address: "0xD8812d5d42ED80977d21213E3088EE7a24aC8B75", // The contract address of the ERC-20 token
//   symbol: "HDT", // The symbol of your token
//   decimals: 18, // The decimals used by the token
//   image:
//     "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmYGjZoQAHzhqwJhFhxvpZ3ijEFZAgqWKNtg4RiyK7GBue", // URL of the token logo (must be HTTPS)
// };

// Arbitrum
const tokenDetails = {
  address: "0xBabe338052d822233Df0CD27Be40d6209B86Bae7", // The contract address of the ERC-20 token
  symbol: "HDT", // The symbol of your token
  decimals: 18, // The decimals used by the token
  image:
    "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmYGjZoQAHzhqwJhFhxvpZ3ijEFZAgqWKNtg4RiyK7GBue", // URL of the token logo (must be HTTPS)
};

const addTokenToMetaMask = async () => {
  try {
    // Check if MetaMask is available
    if (window.ethereum) {
      // Request to add the token to MetaMask
      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20", // Token type
          options: {
            address: tokenDetails.address,
            symbol: tokenDetails.symbol,
            decimals: tokenDetails.decimals,
            image: tokenDetails.image,
          },
        },
      });

      // Display result to the user
      if (wasAdded) {
        console.log("Token added successfully!");
      } else {
        console.log("Token addition canceled.");
      }
    } else {
      console.error("MetaMask is not available");
    }
  } catch (error) {
    console.error("Error adding token to MetaMask:", error);
  }
};

export default addTokenToMetaMask;
