// SearchToken.jsx

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import Image from "next/image";
import Style from "./SearchToken.module.css";
import images from "../../assets";
import { myTokenList } from "./tokenListNoDupes.json";
import TokenListMulticall from "../../../artifacts/contracts/TokenListMulticall.sol/TokenListMulticall.json";
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { useWallet } from "../../Components/Wallet/WalletContext";
import { getConfig } from "../../utils/constants.js";

// Contract addresses defined in constants as `Multicall`
const SEPOLIA_MULTICALL_ADDRESS = "0x9391CBb694c96Ce68c5b6659d3Fff811F9EbA7dB";
const ARBITRUM_MULTICALL_ADDRESS = "0xFade011AaDCC05b373C2A679E73980d12095A1fc";

const ABI = TokenListMulticall.abi;

/** Matches getConfig fallback in constants — used when no wallet chain is available. */
const DEFAULT_TOKEN_LIST_CHAIN_ID = 42161;

const resolveTokensForChain = (chainId) => {
  if (!chainId) return [];
  return myTokenList
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
};

const fetchBalances = async (provider, chainId, userAddress) => {
  const { Multicall } = getConfig(chainId);
  const multicall = new ethers.Contract(Multicall, ABI, provider);

  const balanceOfAbi = [
    "function balanceOf(address account) view returns (uint256)",
  ];
  const iface = new ethers.Interface(balanceOfAbi);

  const tokens = resolveTokensForChain(chainId);

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
    throw error;
  }
};

const formatBalance = (balance) => {
  if (balance === "" || balance === null || balance === undefined) {
    return "";
  }

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

const SearchToken = ({ openToken, tokens, prependTokens = [] }) => {
  const [active, setActive] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState([]);
  const { walletType, chain, wagmiAddress, thirdwebActiveAccount } =
    useWallet();
  const client = useThirdwebClient();

  const effectiveChainId = chain?.id ?? DEFAULT_TOKEN_LIST_CHAIN_ID;
  const userAddress =
    walletType === "thirdweb"
      ? thirdwebActiveAccount?.address
      : wagmiAddress;

  useEffect(() => {
    let cancelled = false;

    const withPrepended = (list) => {
      const injected = prependTokens.map((t, idx) => ({
        ...t,
        balance: "",
        id: `prepend-${idx}-${t.symbol}`,
      }));
      return [...injected, ...list];
    };

    const staticListForChain = () =>
      withPrepended(
        resolveTokensForChain(effectiveChainId).map((t, i) => ({
          ...t,
          balance: "",
          id: t.id ?? `list-${effectiveChainId}-${i}-${t.address}`,
        }))
      );

    const load = async () => {
      if (!userAddress) {
        setBalances(staticListForChain());
        return;
      }

      try {
        let provider;
        if (walletType === "thirdweb") {
          provider = ethers6Adapter.provider.toEthers({
            client: client,
            chain: chain,
          });
        } else if (
          typeof window !== "undefined" &&
          window.ethereum
        ) {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          setBalances(staticListForChain());
          return;
        }

        const tokenBalances = await fetchBalances(
          provider,
          effectiveChainId,
          userAddress
        );
        if (!cancelled) {
          const withIds = tokenBalances.map((t, i) => ({
            ...t,
            id: t.id ?? `bal-${effectiveChainId}-${i}-${t.address}`,
          }));
          setBalances(withPrepended(withIds));
        }
      } catch (error) {
        console.error("SearchToken - Error fetching token balances:", error);
        if (!cancelled) {
          setBalances(staticListForChain());
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveChainId,
    userAddress,
    walletType,
    chain,
    thirdwebActiveAccount?.address,
    wagmiAddress,
    prependTokens,
  ]);

  // Filter tokens based on the search query
  const filteredTokens = balances.filter((el) => {
    return (
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const modal = (
    <div className={Style.ModalContainer}>
      <div
        className={`${Style.ModalClose} ${Style.modalBackdropEnter}`}
        onClick={() => openToken(false)}
        aria-hidden="true"
      />

      <div
        className={`${Style.SearchToken} ${Style.searchTokenPanelEnter}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-token-heading"
      >
        <div className={Style.SearchToken_box_tokens_container}>
          <div className={Style.SearchToken_box}>
            <div className={Style.SearchToken_box_heading}>
              <h4 id="search-token-heading">Select a token</h4>
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
                type="text"
                placeholder="Search by name or symbol"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={Style.SearchToken_box_tokens}>
              {filteredTokens.map((el, i) => (
                <TokenItem
                  key={el.id ?? `${el.address}-${el.symbol}-${i}`}
                  el={el}
                  active={active}
                  setActive={setActive}
                  tokens={tokens}
                  openToken={openToken}
                  selectionChainId={effectiveChainId}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modal, document.body);
};

const TokenItem = ({
  el,
  active,
  setActive,
  tokens,
  openToken,
  selectionChainId,
}) => {
  return (
    <span
      className={active === el.id ? `${Style.active}` : ""}
      onClick={() => {
        console.log("Rendering Token:", el);
        console.log("Selected Token ChainId:", selectionChainId);
        setActive(el.id);
        const tokenData = {
          name: el.name,
          image: el.img,
          symbol: el.symbol,
          address: el.address,
          chainId: selectionChainId,
          decimals: el.decimals,
          ...(el.isStripeUsd ? { isStripeUsd: true } : {}),
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
