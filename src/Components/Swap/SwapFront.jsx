// SwapFront.jsx

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import Style from "./SwapFront.module.css";
import images from "../../assets";
import { TokenSwapFront, SearchToken, LanguageToggle } from "../index";
import { ethers } from "ethers";
import { useWallet } from "../Wallet/WalletContext";
import { getConfig } from "../../utils/constants.js";
import { chainHttpRpcUrl } from "../../utils/chainHttpRpcUrl.js";
import { useTransaction } from "../Transaction/TransactionContext";
import CurrencyContext from "../LanguageToggle/CurrencyContext.jsx";
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { approveToken, Payable, swapNativeToken } from "./SwapLogic";
// Token Balance Logic
import useConditionalTokenBalance from "../w3-calls/useBalanceBothNoCond";
import {
  getQuote,
  getQuoteSonic,
} from "../w3-calls/priceFeeds/dynamic/quoteSwap.mjs";

import {
  getQuoteSonicUSD,
  getINtoUSD,
  getINtoJPY,
} from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";
import { arbitrumSepolia } from "thirdweb/chains";

/** When `chain` is not yet available (e.g. wallet hydrating), Swap/DEX paths use this id. */
const DEFAULT_SWAP_CHAIN_ID = arbitrumSepolia.id;

const SwapFront = ({
  accounts,
  tokenData,
  // toggleSwap,
  // tokenId,
}) => {
  const [openSetting, setOpenSetting] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const [openTokensTwo, setOpenTokensTwo] = useState(false);
  const [tokenQuantity, setTokenQuantity] = useState("");
  const { setApprovalHash, setDonationHash, setTransactionError } =
    useTransaction();
  const { walletType, thirdwebActiveAccount, chain, provider } = useWallet();
  const client = useThirdwebClient();
  const [usdValue, setUsdValue] = useState(null);
  const [jpyValue, setJpyValue] = useState(null);
  const [expand, setExpand] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [quoteValue, setQuoteValue] = useState("");
  const [usdQuote, setUSDquote] = useState("");
  const [slippageQuantity, setSlippageQuantity] = useState("0.10");

  const effectiveChainId =
    chain?.id !== undefined && chain?.id !== null && chain?.id !== ""
      ? Number(chain.id)
      : DEFAULT_SWAP_CHAIN_ID;

  console.log("effectiveChainId in SwapFront:", effectiveChainId, "wallet chain:", chain?.id);
  const {
    contractAddress,
    ABI,
    NATIVE,
    HDT,
    explorer,
    WRAPPED,
    provideLiquidity,
  } = getConfig(effectiveChainId);

  console.log("SwapFront top - ", parseFloat(slippageQuantity));

  const [TokenOne, setTokenOne] = useState({
    name: NATIVE.name,
    image: NATIVE.img,
    symbol: NATIVE.symbol,
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    chainId: effectiveChainId,
  });
  // -> WORKS
  // const [TokenOne, setTokenOne] = useState({
  //   name: "Wrapped Ether",
  //   image: "/etherlogo.png",
  //   symbol: "WETH",
  //   address: WRAPPED.address,
  //   decimals: 18,
  //   chainId: chainId,
  // });

  const [TokenTwo, setTokenTwo] = useState({
    name: "Humble Donations Token",
    image:
      "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmT8MzQti8QNuXrF5esttwCmDHVPWssXEC7YHJ61AzEnfE/HDTlogo-smaller-canvas.png",
    symbol: "HDT",
    address: HDT,
    decimals: 18,
    chainId: effectiveChainId,
  });

  const tokenBal = useConditionalTokenBalance(TokenOne, chain ?? arbitrumSepolia);

  // const toggleSwapClick = () => {
  //   toggleSwap();
  // };

  const handleQuantityChange = (e) => {
    setTokenQuantity(e.target.value);
  };

  const handleSwapTokens = () => {
    const a = TokenOne;
    const b = TokenTwo;
    setTokenOne(b);
    setTokenTwo(a);
    setTokenQuantity("");
    setQuoteValue("");
    setUsdValue(null);
    setJpyValue(null);
  };

  async function getConnectedSigner() {
    if (thirdwebActiveAccount && thirdwebActiveAccount.address) {
      console.log("Using thirdweb in-app wallet");

      const provider = ethers6Adapter.signer.toEthers({
        client: client,
        chain: chain,
        account: thirdwebActiveAccount,
      });
      console.log("client: ", client);
      console.log("provider: ", provider);
      return provider;
    } else {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      console.log("provider: ", provider);
      return provider.getSigner();
    }
  }

  async function resolveReadProviderForDex() {
    const chainForRpc = chain ?? arbitrumSepolia;

    const pickReadProvider = (p) => {
      if (!p) return null;
      if (typeof p.getCode === "function") return p;
      if (typeof p.provider?.getCode === "function") return p.provider;
      return null;
    };

    const fromContext = pickReadProvider(provider);
    if (fromContext) return fromContext;

    try {
      const signer = await getConnectedSigner();
      const fromSigner = pickReadProvider(signer?.provider ?? signer);
      if (fromSigner) return fromSigner;
    } catch (e) {
      console.warn("SwapFront resolveReadProviderForDex:", e);
    }

    const rpc = chainHttpRpcUrl(chainForRpc);
    if (rpc) {
      return new ethers.JsonRpcProvider(rpc);
    }
    return null;
  }

  const handleSwapClick = async () => {
    try {
      const connectedSigner = await getConnectedSigner();
      if (!connectedSigner) {
        console.error("Connected wallet not available");
        return;
      }

      const recipientAddress = await connectedSigner.getAddress();
      const slippageValue = parseFloat(slippageQuantity) || 0.1;

      if (TokenOne.name === NATIVE.name) {
        console.log("Swapping Native Currency...");

        const swapResult = await swapNativeToken(
          tokenQuantity,
          TokenTwo,
          connectedSigner,
          recipientAddress,
          slippageValue,
          effectiveChainId
        );

        if (swapResult.transactionHash) {
          setDonationHash(swapResult.transactionHash);
          console.log(
            `Transaction Hash: ${explorer}tx/${swapResult.transactionHash}`
          );
        }
      } else {
        console.log("Approving ERC-20 Token...");
        const approvalResult = await approveToken(
          tokenQuantity,
          TokenOne,
          connectedSigner,
          effectiveChainId
        );

        const { transactionHashApproval } = approvalResult;

        if (transactionHashApproval) {
          setApprovalHash(transactionHashApproval);
          console.log(
            `Approval Hash: ${explorer}tx/${transactionHashApproval}`
          );
        }

        console.log("Swapping ERC-20 Token...");
        const swapResult = await Payable(
          tokenQuantity,
          TokenOne,
          TokenTwo,
          connectedSigner,
          recipientAddress,
          slippageValue,
          effectiveChainId
        );

        const { transactionHashConfirmation } = swapResult;

        if (transactionHashConfirmation) {
          setDonationHash(transactionHashConfirmation);
          console.log(
            `Swap Hash: ${explorer}tx/${transactionHashConfirmation}`
          );
        }
      }
    } catch (error) {
      console.error("Error during swap:", error);
      setTransactionError(error.message);
    }
  };

  useEffect(() => {
    const fetchQuote = async () => {
      const qty = String(tokenQuantity ?? "").trim();
      if (!qty || !Number.isFinite(parseFloat(qty)) || parseFloat(qty) <= 0) {
        setQuoteValue("");
        return;
      }
      try {
        if (effectiveChainId === 146) {
          const connectedSigner = await getConnectedSigner();
          const sonicQuote = await getQuoteSonic(
            TokenOne,
            TokenTwo,
            tokenQuantity,
            connectedSigner,
            effectiveChainId
          );
          const parsedSonicQuote = ethers.formatUnits(
            sonicQuote,
            TokenTwo.decimals
          );
          setQuoteValue(parsedSonicQuote);
        } else {
          const readProvider = await resolveReadProviderForDex();
          if (!readProvider) {
            console.warn("fetchQuote: no read provider");
            return;
          }
          const quote = await getQuote(
            TokenOne,
            TokenTwo,
            tokenQuantity,
            readProvider,
            effectiveChainId
          );
          setQuoteValue(quote);
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
      }
    };

    fetchQuote();
  }, [tokenQuantity, TokenOne, TokenTwo, effectiveChainId, chain, provider]);
  const { selectedCurrency } = useContext(CurrencyContext);
  useEffect(() => {
    const fetchValue = async () => {
      let value = 0;
      try {
        const readProvider = await resolveReadProviderForDex();
        if (!readProvider) {
          console.warn("SwapFront fetchValue: no read provider");
          return;
        }
        if (selectedCurrency === "USD") {
          if (effectiveChainId === 146) {
            value = await getQuoteSonicUSD(
              TokenOne,
              tokenQuantity,
              readProvider,
              effectiveChainId,
              WRAPPED,
              NATIVE
            );
            console.log("value:", value);
          } else {
            console.log(
              "SwapFront getINtoUSD chain:",
              chain?.id,
              effectiveChainId
            );
            value = await getINtoUSD(
              TokenOne,
              tokenQuantity,
              readProvider,
              effectiveChainId
            );
          }
          const concatValue = "$" + value;
          setUsdValue(concatValue);
        } else if (selectedCurrency === "JPY") {
          value = await getINtoJPY(
            TokenOne,
            tokenQuantity,
            readProvider,
            effectiveChainId
          );
          setJpyValue(value);
        }
      } catch (error) {
        console.error("Error fetching value:", error);
      }
    };

    const qty = String(tokenQuantity ?? "").trim();
    if (TokenOne && qty) {
      fetchValue();
    }
  }, [
    TokenOne,
    tokenQuantity,
    selectedCurrency,
    thirdwebActiveAccount,
    chain,
    provider,
    effectiveChainId,
    WRAPPED,
    NATIVE,
  ]);

  const balance = tokenBal.isLoading
    ? "…"
    : tokenBal.isError
      ? "—"
      : parseFloat(tokenBal.displayValue || "0").toFixed(3);
  const balanceMax = tokenBal.isLoading ? "" : tokenBal.maxAmount || "";

  return (
    <main className={Style.swapMain}>
      <a
        className={Style.lp}
        href={provideLiquidity}
        target="_blank"
        rel="noopener noreferrer"
      >
        Provide liquidity
      </a>
      {effectiveChainId === 116 ? (
        <div className={Style.unsupportedNetwork}>
          <p>Swap is not yet supported on this network.</p>
        </div>
      ) : (
        <div className={Style.SwapFrontWrapper}>
          <div className={Style.SwapFront}>
            <div
              className={`${Style.SwapFront_box} ${
                expand ? Style.Expanded : ""
              }`}
            >
              <div className={Style.cardHeader}>
                <h2 className={Style.cardTitle}>Swap</h2>
                <button
                  type="button"
                  className={Style.settingsBtn}
                  aria-label="Swap settings"
                  onClick={() => setOpenSetting(true)}
                >
                  <Image
                    src={images.filledGrad}
                    alt=""
                    width={36}
                    height={36}
                  />
                </button>
              </div>

              <p className={Style.fieldLabel}>You pay</p>
              <div className={Style.SwapFront_box_input}>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={tokenQuantity}
                  onChange={handleQuantityChange}
                />

                <button
                  type="button"
                  className={Style.tokenPicker}
                  onClick={() => setOpenToken(true)}
                >
                  <Image
                    src={TokenOne.image || images.probablyBest}
                    width={24}
                    height={24}
                    alt=""
                  />
                  <span>{TokenOne.symbol || "ETH"}</span>
                </button>
              </div>

              <button
                type="button"
                className={Style.swapDividerBtn}
                onClick={handleSwapTokens}
                aria-label="Swap input and output tokens"
              >
                ⇅
              </button>

              <p className={Style.fieldLabel}>You receive</p>
              <div className={Style.SwapFront_box_input}>
                <input
                  type="text"
                  readOnly
                  placeholder="0"
                  value={quoteValue}
                  aria-label="Estimated output"
                />

                <button
                  type="button"
                  className={Style.tokenPicker}
                  onClick={() => setOpenTokensTwo(true)}
                >
                  <Image
                    src={TokenTwo.image || images.probablyBest}
                    width={24}
                    height={24}
                    alt=""
                  />
                  <span>{TokenTwo.symbol || "HDT"}</span>
                </button>
              </div>

              <div className={Style.metaRow}>
                <span className={Style.metaMuted}>
                  {selectedCurrency === "USD"
                    ? usdValue !== null
                      ? usdValue
                      : "Estimating…"
                    : jpyValue !== null
                    ? jpyValue
                    : "Estimating…"}
                </span>
                <span className={Style.metaBalance}>Balance {balance}</span>
              </div>

              <div className={Style.buttonBar}>
                <button
                  type="button"
                  className={`${Style.SwapFront_box_btn} ${
                    expand ? Style.MoveBtn : ""
                  }`}
                  onClick={handleSwapClick}
                >
                  Swap
                </button>
              </div>
            </div>

            {openSetting && (
              <TokenSwapFront
                setOpenSetting={setOpenSetting}
                accounts={accounts}
                tokenData={tokenData}
                tokenQuantity={tokenQuantity}
                setTokenQuantity={setTokenQuantity}
                currency={currency}
                setSlippageValue={setSlippageQuantity}
              />
            )}

            {openToken && (
              <SearchToken
                openToken={setOpenToken}
                tokens={setTokenOne}
                tokenData={tokenData}
              />
            )}
            {openTokensTwo && (
              <SearchToken
                openToken={setOpenTokensTwo}
                tokens={setTokenTwo}
                tokenData={tokenData}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default SwapFront;
