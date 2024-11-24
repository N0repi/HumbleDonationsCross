// HeroSection.jsx

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";

// IMPORT INTERNAL
import Style from "./HeroSection.module.css";
import images from "../../assets";
import { Token, SearchToken, LanguageToggle } from "../index";

// Web3 tools
import { ethers } from "ethers";
import {
  approveToken,
  donateToken,
  Payable,
} from "../w3-calls/payProcessTokenId.mjs";

import {
  useApproveTokenAbstracted,
  useDonateTokenAbstracted,
} from "../w3-calls/payProcessTokenIdAbstracted.mjs";

import { useWallet } from "../../Components/Wallet/WalletContext";

import { useTransaction } from "../../pages/TransactionContext";

// Token Balance Logic
import conditionalBalance from "../w3-calls/useBalanceBothNoCond";

// ForEx Rates
import {
  getINtoUSD,
  getUSDtoIN,
  getINtoJPY,
  getJPYtoIN,
} from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";

import CurrencyContext from "../LanguageToggle/CurrencyContext.jsx";

import { getConfig } from "../../utils/constants.js";

// thirdweb
import { client } from "../../Components/Model/thirdWebClient";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";

// Session
// import { useSession } from "../../pages/sessions/session"
// import SessionComponent from "../../pages/w3-calls/sessionComponent"

const HeroSection = ({
  accounts,
  tokenData,
  project,
  projectTitle,
  toggleHeroSection,
  tokenId,
}) => {
  //USESTATE

  const [openSetting, setOpenSetting] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const [openTokensTwo, setOpenTokensTwo] = useState(false);
  const [tokenQuantity, setTokenQuantity] = useState("");
  // need to return txHash as a modal or pop-up
  // const [approvalHash, setApprovalHash] = useState(null)
  // const [confirmationHash, setDonationHash] = useState(null)
  const { setApprovalHash, setDonationHash, setTransactionError } =
    useTransaction();
  const { walletType, thirdwebActiveAccount, chain } = useWallet();
  const approveTokenAbstracted = useApproveTokenAbstracted();
  const donateTokenAbstracted = useDonateTokenAbstracted();
  // const [showPaymentResult, setShowPaymentResult] = useState(false)
  // const { session, updateApprovalStatus } = useSession()
  const [usdValue, setUsdValue] = useState(null);
  const [jpyValue, setJpyValue] = useState(null);
  const [expand, setExpand] = useState(false);
  const [moveBtn, setMoveBtn] = useState(false);
  const [currency, setCurrency] = useState("USD"); // State to track currency selection

  const chainId = chain?.id;
  const { contractAddress, ABI, NATIVE, HDT, explorer } = getConfig(chainId);

  // TOKEN 1
  const [TokenOne, setTokenOne] = useState({
    // name: "",
    // image: "",
    // symbol: "",
    // address: "",

    // decimals: "",
    // chainId: "",
    name: "Humble Donations Token",
    image:
      "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmT8MzQti8QNuXrF5esttwCmDHVPWssXEC7YHJ61AzEnfE/HDTlogo-smaller-canvas.png",
    symbol: "HDT",
    address: HDT,
    decimals: 18,
    chainId: chainId ?? 42161,
  });
  console.log("TokenOne.name", TokenOne.name);

  // TOKEN 2
  const [TokenTwo, setTokenTwo] = useState({
    name: "",
    image: "",
    symbol: "",
  });
  const toggleHeroSectionClick = () => {
    toggleHeroSection();
  };

  const handleQuantityChange = (e) => {
    setTokenQuantity(e.target.value);
  };
  async function getConnectedSigner(thirdwebActiveAccount) {
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
  // ***** Handling Payable in HeroSection.jsx *****
  const handleDonateClick = async () => {
    try {
      if (walletType === "thirdweb") {
        const userConfirmed = window.confirm(
          "Do you want to proceed with the donation?"
        );
        if (!userConfirmed) {
          console.log("Donation canceled by the user.");
          return; // Exit the function if user does not confirm
        }
      }

      const connectedSigner = await getConnectedSigner(thirdwebActiveAccount);
      if (!connectedSigner) {
        console.error("Connected wallet not available");
        return;
      }
      if (TokenOne.name === NATIVE.name) {
        const paymentResult = await Payable(
          tokenId,
          tokenQuantity,
          TokenOne,
          connectedSigner,
          chainId
        );
        const { transactionHashConfirmation } = paymentResult;
        if (transactionHashConfirmation) {
          setDonationHash(transactionHashConfirmation);
          console.log(
            `Payment Hash: ${explorer}tx/${transactionHashConfirmation}`
          );
        }
      } else {
        if (walletType == "wagmi") {
          const transactionHashApproval = await approveToken(
            tokenId,
            tokenQuantity,
            TokenOne,
            connectedSigner,
            chainId
          );
          setApprovalHash(transactionHashApproval);
          console.log(
            `Approval Hash: ${explorer}tx/${transactionHashApproval}`
          );

          const transactionHashConfirmation = await donateToken(
            tokenId,
            tokenQuantity,
            TokenOne,
            connectedSigner,
            chainId
          );
          setDonationHash(transactionHashConfirmation);
          console.log(
            `Payment Hash: ${explorer}tx/${transactionHashConfirmation}`
          );
        } else {
          if (walletType === "thirdweb") {
            const transactionHashApproval = await approveTokenAbstracted(
              tokenId,
              tokenQuantity,
              TokenOne,
              setApprovalHash,
              setDonationHash,
              setTransactionError,
              chain,
              chainId
            );
            setApprovalHash(transactionHashApproval);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.transactionHash) {
        setTransactionError(error.transactionHash.hash);
      } else if (error.receipt && error.receipt.hash) {
        setTransactionError(error.receipt.hash);
      } else {
        setTransactionError("Unknown error occurred");
      }
    }
  };

  const { selectedCurrency } = useContext(CurrencyContext);

  // Update handleFixedButtons function to handle USD or JPY based on the selected currency
  const handleFixedButtons = async (fixedAmountIn) => {
    try {
      const provider = await getConnectedSigner(thirdwebActiveAccount);
      if (selectedCurrency === "USD") {
        // Call function for USD
        // getUSDtoIN
        const usdInHdt = await getUSDtoIN(
          TokenOne,
          fixedAmountIn,
          provider,
          chainId
        );
        // simply removing if else does not make it dynamic

        setTokenQuantity(usdInHdt.toString());
      } else if (selectedCurrency === "JPY") {
        // Call function for JPY
        const usdInJpy = await getJPYtoIN(
          TokenOne,
          fixedAmountIn,
          provider,
          chainId
        );
        // simply removing if else does not make it dynamic
        // if (TokenOne.address === "0xD8812d5d42ED80977d21213E3088EE7a24aC8B75") {
        setTokenQuantity(usdInJpy.toString());
        // } else {
        //     console.log("TokenOne is not HDT, skipping update of tokenQuantity")
        // }
      }
    } catch (error) {
      console.error("Error fetching value:", error);
    }
  };

  // Hardcoded JPY price feed for testing
  //
  // const handleFixedButtonsJP = async (fixedAmountIn) => {
  //     try {
  //         const usdInHdt = await getJPYtoHDT(fixedAmountIn)
  //         // simply removing if else does not make it dynamic
  //         if (TokenOne.address === "0x59964556eE1673479c973D8B04e7fFd0eccB1544") {
  //             setTokenQuantity(usdInHdt.toString())
  //         } else {
  //             console.log("TokenOne is not HDT, skipping update of tokenQuantity")
  //         }
  //     } catch (error) {
  //         console.error("Error fetching HDT value:", error)
  //     }
  // }

  useEffect(() => {
    const fetchValue = async () => {
      let value = 0;
      try {
        const chainId = chain?.id ?? 42161;
        const provider = await getConnectedSigner(thirdwebActiveAccount);
        if (selectedCurrency === "USD") {
          console.log("HeroSection getIntoUSD chainId:", chain?.id, chainId);
          value = await getINtoUSD(TokenOne, tokenQuantity, provider, chainId);
          setUsdValue(value);
        } else if (selectedCurrency === "JPY") {
          value = await getINtoJPY(TokenOne, tokenQuantity, provider, chainId);
          setJpyValue(value);
        }
      } catch (error) {
        console.error("Error fetching value:", error);
      }
    };

    if (TokenOne && tokenQuantity) {
      fetchValue();
    }
  }, [TokenOne, tokenQuantity, selectedCurrency, thirdwebActiveAccount]);

  const balance = parseFloat(conditionalBalance(TokenOne, chain)).toFixed(3);
  const balanceMax = conditionalBalance(TokenOne, chain);

  return (
    <div className={Style.HeroSection}>
      <div
        className={`${Style.HeroSection_box} ${expand ? Style.Expanded : ""}`}
      >
        <div className={Style.HeroSection_box_heading}>
          <button
            onClick={toggleHeroSectionClick}
            className={Style.buttonContainer}
          >
            <div className={Style.expandContract}>
              <Image src={images.contract} alt="expand" />
            </div>
          </button>
          <div className={Style.HeroSection_box_heading_img}>
            <Image
              src={images.filledGrad}
              alt="image"
              width={45}
              height={45}
              onClick={() => setOpenSetting(true)}
            />
          </div>
        </div>

        <div className={Style.HeroSection_box_input}>
          <input
            type="text"
            placeholder="0"
            value={tokenQuantity}
            onChange={handleQuantityChange}
          />

          <button
            onClick={() => {
              setOpenToken(true);
            }}
          >
            <Image
              src={TokenOne.image || images.probablyBest}
              width={25}
              height={25}
              alt="HDTpurpleFullShaded"
            />
            {TokenOne.symbol || "HDT"}
            {console.log("Token:", TokenOne.address)}
            {/* {console.log(TokenOne.symbol)}
                        {console.log(TokenOne.name)} */}
          </button>
        </div>
        <div className={Style.balanceBar}>
          <div className={Style.HeroSection_box_balance}>
            Balance: {balance}
          </div>
          <div className={Style.HeroSection_box_balance}>
            {selectedCurrency === "USD"
              ? usdValue !== null
                ? usdValue
                : "Loading..."
              : jpyValue !== null
              ? jpyValue
              : "Loading..."}{" "}
            {/* change to jpyValue for price in JPY */}
          </div>
        </div>
        <div className={Style.buttonBar}>
          <div className={Style.maxButton}>
            <button
              onClick={() => {
                setTokenQuantity(balanceMax);
              }}
            >
              Max
            </button>
          </div>
          <div className={Style.maxButton}>
            <button
              onClick={() => {
                handleFixedButtons(
                  selectedCurrency === "USD" ? 5 : 300,
                  currency
                );
              }}
            >
              {selectedCurrency === "USD" ? "$5" : "¥300"}
            </button>
          </div>
          <div className={Style.maxButton}>
            <button
              onClick={() => {
                handleFixedButtons(
                  selectedCurrency === "USD" ? 10 : 400,
                  currency
                );
              }}
            >
              {selectedCurrency === "USD" ? "$10" : "¥400"}
            </button>
          </div>

          <div className={Style.maxButton}>
            <div className={Style.ellipses}>
              <button
                onClick={() => {
                  setExpand(!expand); // Toggle the expand state
                }}
              >
                ...
              </button>
            </div>
          </div>
          {expand && (
            <>
              <div className={Style.maxButton}>
                <button
                  onClick={() =>
                    handleFixedButtons(
                      selectedCurrency === "USD" ? 15 : 500,
                      currency
                    )
                  }
                >
                  {selectedCurrency === "USD" ? "$15" : "¥500"}
                </button>
              </div>
              <div className={Style.maxButton}>
                <button onClick={() => handleFixedButtons(25, currency)}>
                  $25
                </button>
              </div>
              <div className={Style.maxButton}>
                <button onClick={() => handleFixedButtons(50, currency)}>
                  $50
                </button>
              </div>
              <div className={Style.maxButton}>
                <button onClick={() => handleFixedButtons(100, currency)}>
                  $100
                </button>
              </div>
              {/* <div className={Style.maxButton}>
                                <button onClick={() => handleFixedButtonsJP(100, currency)}>
                                    ¥100
                                </button>
                            </div> */}
            </>
          )}
        </div>

        {/* If account connected to swap then display the following */}
        {accounts ? (
          <button
            className={`${Style.HeroSection_box_btn} ${
              expand ? Style.MoveBtn : ""
            }`}
          >
            Connect Wallet
          </button>
        ) : (
          <button
            className={`${Style.HeroSection_box_btn} ${
              expand ? Style.MoveBtn : ""
            }`}
            onClick={handleDonateClick}
          >
            Donate
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {openSetting && (
        <Token
          setOpenSetting={setOpenSetting}
          accounts={accounts}
          tokenData={tokenData}
          project={project}
          projectTitle={projectTitle}
          tokenQuantity={tokenQuantity}
          setTokenQuantity={setTokenQuantity}
          currency={currency}
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
  );
};

export default HeroSection;
