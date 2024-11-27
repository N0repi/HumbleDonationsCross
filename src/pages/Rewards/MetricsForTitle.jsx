// MetricsForTitle.jsx

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { myTokenList } from "../../Components/SearchToken/tokenListNoDupes.json";
import {
  getINtoUSD,
  getINtoJPY,
} from "../../Components/w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";

import { useQuery } from "urql";
import { Provider } from "urql";
import { GET_DONATIONS_BY_PROJECT } from "../../utils/Graph/NOC/graphReactNOC.jsx";
import { getConfig } from "../../utils/constants";

import Style from "./MetricsForRewards.module.css";

const GetTokenBalance = ({ tokenId, chainId, provider }) => {
  console.log("chainId:", chainId);
  const [totalBalanceInUSD, setTotalBalanceInUSD] = useState(0);
  const [totalBalanceInJPY, setTotalBalanceInJPY] = useState(0);
  const [tokenBalances, setTokenBalances] = useState([]);

  // GraphQL query for donations
  const [{ data, fetching, error }] = useQuery({
    query: GET_DONATIONS_BY_PROJECT,
    variables: { projectId: tokenId?.toString() },
  });

  useEffect(() => {
    if (data) {
      try {
        // Get chain-specific configuration
        const { NATIVE } = getConfig(chainId);

        // Group donations by token (erc20Token) and calculate total amounts
        const tokenDonationMap = data.donations.reduce((acc, donation) => {
          const tokenAddress = donation.erc20Token.toLowerCase();
          const tokenAmount = BigInt(donation.amount); // Parse donation amount as BigInt

          if (!acc[tokenAddress]) {
            acc[tokenAddress] = tokenAmount;
          } else {
            acc[tokenAddress] += tokenAmount;
          }

          return acc;
        }, {});

        // Map donation data with metadata from myTokenList
        const balances = Object.entries(tokenDonationMap).map(
          ([erc20Token, totalAmount]) => {
            if (erc20Token === ethers.ZeroAddress) {
              // Handle native token (e.g., ETH)
              return {
                name: NATIVE.name,
                symbol: NATIVE.symbol,
                balance: Number(totalAmount) / 10 ** 18, // Convert using decimals
                decimals: 18,
                chainId: chainId,
              };
            }

            // Find metadata from myTokenList for the current token
            const tokenMetadata = myTokenList.find((token) => {
              const tokenAddress = token.address.toLowerCase();
              const bridgeInfo =
                token.extensions?.bridgeInfo?.[
                  chainId
                ]?.tokenAddress?.toLowerCase();
              // Check if the token address or its bridged address matches erc20Token
              return (
                tokenAddress === erc20Token ||
                (bridgeInfo && bridgeInfo === erc20Token)
              );
            });

            if (!tokenMetadata) {
              console.warn(
                `No match found for erc20Token: ${erc20Token} on chainId: ${chainId}`
              );
            }

            if (tokenMetadata) {
              // Resolve the correct address for the token based on bridgeInfo or fallback
              const resolvedAddress =
                tokenMetadata.extensions?.bridgeInfo?.[chainId]?.tokenAddress ||
                tokenMetadata.address;

              const resolvedDecimals = tokenMetadata.decimals || 18;
              const balance = Number(totalAmount) / 10 ** resolvedDecimals; // Convert using decimals

              return {
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                address: resolvedAddress,
                balance,
                decimals: resolvedDecimals,
                chainId: chainId,
              };
            }

            // Fallback for tokens not in myTokenList
            return {
              name: "Unknown Token",
              symbol: "UNKNOWN",
              balance: Number(totalAmount) / 10 ** 18, // Default to 18 decimals
              decimals: 18,
            };
          }
        );

        // Filter out tokens with zero balance
        const nonZeroBalances = balances.filter((token) => token.balance > 0);

        setTokenBalances(nonZeroBalances);

        // Fetch USD & JPY values for the balances
        const fetchCurrencyValues = async () => {
          const [balancesWithUSD, balancesWithJPY] = await Promise.all([
            Promise.all(
              nonZeroBalances.map(async (token) => {
                console.log("Token passed to getINtoUSD:", token);
                try {
                  const balanceInUSD = await getINtoUSD(
                    token,
                    token.balance.toString(),
                    provider,
                    chainId
                  );
                  console.log(
                    `MetricsUSD - USD value for ${token.name}:`,
                    balanceInUSD
                  );
                  return { ...token, balanceInUSD };
                } catch (error) {
                  console.error(
                    `Error converting balance to USD for ${token.name}:`,
                    error
                  );
                  console.log(
                    `MetricsJPY - JPY value for ${token.name}:`,
                    balanceInJPY
                  );
                  return { ...token, balanceInUSD: 0 };
                }
              })
            ),
            Promise.all(
              nonZeroBalances.map(async (token) => {
                try {
                  const balanceInJPY = await getINtoJPY(
                    token,
                    token.balance.toString(),
                    provider,
                    chainId
                  );
                  return { ...token, balanceInJPY };
                } catch (error) {
                  console.error(
                    `Error converting balance to JPY for ${token.name}:`,
                    error
                  );
                  return { ...token, balanceInJPY: 0 };
                }
              })
            ),
          ]);

          setTokenBalances(
            balancesWithUSD.map((token, index) => ({
              ...token,
              balanceInJPY: balancesWithJPY[index]?.balanceInJPY || 0,
            }))
          );

          const totalBalanceInUSD = balancesWithUSD.reduce((total, token) => {
            const balanceInUSDNumeric = parseFloat(
              token.balanceInUSD.replace("$", "")
            );
            return total + balanceInUSDNumeric;
          }, 0);

          const totalBalanceInJPY = balancesWithJPY.reduce((total, token) => {
            const balanceInJPYNumeric = parseFloat(
              token.balanceInJPY.replace("¥", "")
            );
            return total + balanceInJPYNumeric;
          }, 0);

          setTotalBalanceInUSD(totalBalanceInUSD);
          setTotalBalanceInJPY(totalBalanceInJPY);
        };

        fetchCurrencyValues();
      } catch (error) {
        console.error("Error processing token balances:", error);
      }
    }
  }, [data, chainId]);

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div className={Style.receivedBox}>
      <div className={Style.sizingBox}>
        <h2 className={Style.totalReceivedTitle}>Total Donations Received:</h2>
        <ul className={Style.balances}>
          {tokenBalances.map((token, index) => (
            <li key={index}>
              {token.name} ({token.symbol}): {token.balance}
            </li>
          ))}
        </ul>
        <div className={Style.balanceInUSD}>
          Donations value: ${totalBalanceInUSD.toFixed(2)} | ¥
          {totalBalanceInJPY.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

const WrappedGetTokenBalance = (props) => {
  const { chainId } = props;

  // Dynamically get the urqlClient for the specified chainId
  const { urqlClient } = getConfig(chainId);

  return (
    <Provider value={urqlClient}>
      <GetTokenBalance {...props} />
    </Provider>
  );
};

export default WrappedGetTokenBalance;
