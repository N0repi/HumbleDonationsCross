// SearchToken.jsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import Style from "./SearchToken.module.css";
import images from "../../assets";
import { myTokenList } from "./tokenListNoDupes.json";
import TokenListMulticall from "../../../artifacts/contracts/TokenListMulticall.sol/TokenListMulticall.json";
import { client } from "../Model/thirdWebClient";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { useWallet } from "../../Components/Wallet/WalletContext";
import { getConfig } from "../../utils/constants.js";

// Contract addresses defined in constants as `Multicall`
const SEPOLIA_MULTICALL_ADDRESS = "0x9391CBb694c96Ce68c5b6659d3Fff811F9EbA7dB";
const ARBITRUM_MULTICALL_ADDRESS = "0xFade011AaDCC05b373C2A679E73980d12095A1fc";

const ABI = TokenListMulticall.abi;

const fetchBalances = async (provider, chainId, userAddress) => {
  const { Multicall } = getConfig(chainId);
  const multicall = new ethers.Contract(Multicall, ABI, provider);

  const balanceOfAbi = [
    "function balanceOf(address account) view returns (uint256)",
  ];
  const iface = new ethers.Interface(balanceOfAbi);

  const tokens = myTokenList
    .filter((token) => {
      return (
        token.chainId === chainId || token.extensions?.bridgeInfo?.[chainId]
      );
    })
    .map((token) => {
      const resolvedAddress =
        token.extensions?.bridgeInfo?.[chainId]?.tokenAddress || token.address;
      return { ...token, address: resolvedAddress };
    });

  const nativeToken = tokens.find((token) => token.address === "");
  const erc20Tokens = tokens.filter((token) => token.address !== "");

  const calls = erc20Tokens.map((token) => ({
    target: token.address,
    callData: iface.encodeFunctionData("balanceOf", [userAddress]),
  }));

  try {
    const { returnData } = await multicall.aggregate(calls);

    const erc20Balances = returnData.map((data, index) => {
      if (data === "0x") {
        console.warn(
          `SearchToken - Token ${erc20Tokens[index].symbol} returned empty data`
        );
        return {
          ...erc20Tokens[index],
          balance: "0",
        };
      }
      const balance = ethers.getBigInt(data);
      return {
        ...erc20Tokens[index],
        balance: ethers.formatUnits(balance, erc20Tokens[index].decimals),
      };
    });

    let nativeBalance = null;
    if (nativeToken) {
      const balance = await provider.getBalance(userAddress);
      nativeBalance = {
        ...nativeToken,
        balance: ethers.formatUnits(balance, nativeToken.decimals),
      };
    }

    return nativeBalance ? [nativeBalance, ...erc20Balances] : erc20Balances;
  } catch (error) {
    console.error("SearchToken - Error fetching balances:", error);
    return [];
  }
};

const formatBalance = (balance) => {
  const parsedBalance = parseFloat(balance);

  if (isNaN(parsedBalance)) {
    return "Loading...";
  }

  if (parsedBalance === 0) {
    return "";
  }

  if (parsedBalance >= 1000000) {
    return `${(parsedBalance / 1000000).toFixed(2)}M`;
  }

  if (parsedBalance >= 1000) {
    return `${(parsedBalance / 1000).toFixed(2)}K`;
  }

  return parsedBalance.toFixed(3);
};

const SearchToken = ({ openToken, tokens }) => {
  const [active, setActive] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState([]);
  const { walletType, chain, wagmiAddress, thirdwebActiveAccount } =
    useWallet();
  console.log("SearchToken - log1");
  console.log("wagmiAddress:", wagmiAddress);
  console.log("thirdwebActiveAccount:", thirdwebActiveAccount);

  if (walletType == "thirdweb") {
    const provider = ethers6Adapter.provider.toEthers({
      client: client,
      chain: chain,
    });
    useEffect(() => {
      const fetchTokenBalances = async () => {
        try {
          console.log("SearchToken - log2");
          if (thirdwebActiveAccount.address && chain?.id) {
            const tokenBalances = await fetchBalances(
              provider,
              chain?.id,
              thirdwebActiveAccount.address
            );
            console.log("SearchToken - log3");
            setBalances(tokenBalances);
            console.log("SearchToken - tokenBalances:", tokenBalances);
          }
        } catch (error) {
          console.error("SearchToken - Error fetching token balances:", error);
        }
      };

      fetchTokenBalances();
    }, [chain, thirdwebActiveAccount.address]);
  } else {
    const provider = new ethers.BrowserProvider(window.ethereum);
    useEffect(() => {
      const fetchTokenBalances = async () => {
        try {
          console.log("SearchToken - log2");
          if (wagmiAddress && chain?.id) {
            const tokenBalances = await fetchBalances(
              provider,
              chain?.id,
              wagmiAddress
            );
            console.log("SearchToken - log3");
            setBalances(tokenBalances);
            console.log("SearchToken - tokenBalances:", tokenBalances);
          }
        } catch (error) {
          console.error("SearchToken - Error fetching token balances:", error);
        }
      };

      fetchTokenBalances();
    }, [chain, wagmiAddress]);
  }

  // Filter tokens based on the search query
  const filteredTokens = balances.filter((el) => {
    return (
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className={Style.ModalContainer}>
      <div className={Style.ModalClose} onClick={() => openToken(false)}></div>

      <div className={Style.SearchToken}>
        <div className={Style.SearchToken_box_tokens_container}>
          <div className={Style.SearchToken_box}>
            <div className={Style.SearchToken_box_heading}>
              <h4>Select a token</h4>
            </div>
            <div className={Style.SearchToken_box_search}>
              <div className={Style.SearchToken_box_search_img}>
                <Image
                  src={images.search}
                  alt="search"
                  width={20}
                  height={20}
                />
              </div>
              <input
                style={{ color: "#1e1e1e" }}
                type="text"
                placeholder="Search token by name or symbol"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={Style.SearchToken_box_tokens}>
              {filteredTokens.map((el, i) => (
                <TokenItem
                  key={i + 1}
                  el={el}
                  active={active}
                  setActive={setActive}
                  tokens={tokens}
                  openToken={openToken}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TokenItem = ({ el, active, setActive, tokens, openToken }) => {
  const { chain } = useWallet();
  return (
    <span
      className={active === el.id ? `${Style.active}` : ""}
      onClick={() => {
        console.log("Rendering Token:", el);
        console.log("Selected Token ChainId (overridden):", chain?.id);
        setActive(el.id);
        const tokenData = {
          name: el.name,
          image: el.img,
          symbol: el.symbol,
          address: el.address,
          chainId: chain?.id,
          decimals: el.decimals,
        };
        tokens(tokenData); // Pass the token data to tokens
        console.log("Rendering Token After:", tokenData);
        openToken(false); // Closes SearchToken component
      }}
    >
      <Image
        src={el.img || images.etherlogo}
        alt="close"
        width={50}
        height={50}
      />
      <div className={Style.tokenInfoBalance}>
        <div className={Style.tokenInfo}>
          <div>{el.name}</div>
          <div>{el.symbol}</div>
        </div>
        <div className={Style.Balances}>{formatBalance(el.balance)}</div>
      </div>
    </span>
  );
};

export default SearchToken;
