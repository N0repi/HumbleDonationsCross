// SwapFront.jsx

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import Style from "./SwapFront.module.css";
import images from "../../assets";
import { TokenSwapFront, SearchToken, LanguageToggle } from "../index";
import { ethers } from "ethers";
import { useWallet } from "../Wallet/WalletContext";
import { getConfig } from "../../utils/constants.js";
import { useTransaction } from "../Transaction/TransactionContext";
import CurrencyContext from "../LanguageToggle/CurrencyContext.jsx";
import { client } from "../Model/thirdWebClient";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { approveToken, Payable, swapNativeToken } from "./SwapLogic";
// import { getQuote } from "../w3-calls/priceFeeds/dynamic/quoteToQuote.mjs";
// import { getQuote } from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";
import { getQuote } from "../w3-calls/priceFeeds/dynamic/quoteSwap.mjs";
import { arbitrum } from "thirdweb/chains";

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
  const { walletType, thirdwebActiveAccount, chain } = useWallet();
  const [usdValue, setUsdValue] = useState(null);
  const [jpyValue, setJpyValue] = useState(null);
  const [expand, setExpand] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [quoteValue, setQuoteValue] = useState("");
  const [slippageQuantity, setSlippageQuantity] = useState("0.10");

  const chainId = chain?.id;
  console.log("chainId in SwapFront:", chainId);
  const {
    contractAddress,
    ABI,
    NATIVE,
    HDT,
    explorer,
    WRAPPED,
    provideLiquidity,
  } = getConfig(chainId);

  console.log("SwapFront top - ", parseFloat(slippageQuantity));

  const [TokenOne, setTokenOne] = useState({
    name: NATIVE.name,
    image: "/etherlogo.png",
    symbol: NATIVE.symbol,
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    chainId: chainId || chain?.id,
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
    chainId: chainId || chain?.id,
  });

  // const toggleSwapClick = () => {
  //   toggleSwap();
  // };

  const handleQuantityChange = (e) => {
    setTokenQuantity(e.target.value);
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
          chainId
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
          chainId
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
          chainId
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
      try {
        const connectedSigner = await getConnectedSigner();
        const quote = await getQuote(
          TokenOne,
          TokenTwo,
          tokenQuantity,
          connectedSigner,
          chain?.id
        );
        setQuoteValue(quote);
      } catch (error) {
        console.error("Error fetching quote:", error);
      }
    };

    fetchQuote();
  }, [tokenQuantity, TokenOne, TokenTwo]);

  return (
    <main>
      <a
        className={Style.lp}
        href={provideLiquidity}
        target="_blank"
        rel="noopener noreferrer"
      >
        Provide Liquidity
      </a>
      <div className={Style.SwapFrontWrapper}>
        <div className={Style.SwapFront}>
          <div
            className={`${Style.SwapFront_box} ${expand ? Style.Expanded : ""}`}
          >
            <div className={Style.SwapFront_box_heading}>
              <div></div>{" "}
              <div className={Style.SwapFront_box_heading_img}>
                <Image
                  src={images.filledGrad}
                  alt="image"
                  width={45}
                  height={45}
                  onClick={() => setOpenSetting(true)}
                />
              </div>
            </div>

            <div className={Style.SwapFront_box_input}>
              <input
                type="text"
                placeholder="0"
                value={tokenQuantity}
                onChange={handleQuantityChange}
              />

              <button onClick={() => setOpenToken(true)}>
                <Image
                  src={TokenOne.image || images.probablyBest}
                  width={25}
                  height={25}
                  alt="HDTpurpleFullShaded"
                />
                {TokenOne.symbol || "ETH"}
              </button>
            </div>

            <div className={Style.SwapFront_box_input}>
              <input
                type="text"
                placeholder="0"
                value={quoteValue}
                onChange={handleQuantityChange}
              />

              <button onClick={() => setOpenTokensTwo(true)}>
                <Image
                  src={TokenTwo.image || images.probablyBest}
                  width={25}
                  height={25}
                  alt="HDTpurpleFullShaded"
                />
                {TokenTwo.symbol || "HDT"}
              </button>
            </div>
            <div className={Style.balanceBar}>
              <div className={Style.SwapFront_box_balance}>
                <p>Quote: {quoteValue ? quoteValue : "Fetching quote..."}</p>
              </div>
            </div>

            <div className={Style.buttonBar}>
              <button
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
    </main>
  );
};

export default SwapFront;
