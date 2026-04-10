// DonateBox.jsx

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Image from "next/image";

// IMPORT INTERNAL
import Style from "./DonateBox.module.css";
import images from "../../assets";
import { Token, SearchToken, LanguageToggle } from "../index";

// Web3 tools
import { ethers } from "ethers";
import { pollErc20BalanceIncrease } from "../../utils/pollErc20BalanceIncrease.js";
import { createErc20BalanceReader } from "../../utils/createErc20BalanceReader.js";
import {
  approveToken,
  donateToken,
  Payable,
} from "../w3-calls/payProcessTokenId.mjs";

import {
  useApproveTokenAbstracted,
  useDonateTokenAbstracted,
} from "../w3-calls/payProcessTokenIdAbstracted.mjs";

import { useWallet } from "../Wallet/WalletContext";

import { useTransaction } from "../Transaction/TransactionContext";

// Token Balance Logic (call hook once — Rules of Hooks)
import useConditionalTokenBalance from "../w3-calls/useBalanceBothNoCond";
import StripeBuyHdt from "../ThirdWeb/Pay/StripeBuyHdt.jsx";
import InsufficientHdtModal from "./InsufficientHdtModal.jsx";
import DonateConfirmModal from "./DonateConfirmModal.jsx";

// ForEx Rates
import {
  getQuoteSonicUSD,
  getInUSDQuoteSonic,
  getINtoUSD,
  getUSDtoIN,
  getINtoJPY,
  getJPYtoIN,
} from "../w3-calls/priceFeeds/dynamic/DEXpriceFeed.mjs";

import CurrencyContext from "../LanguageToggle/CurrencyContext.jsx";

import { getConfig } from "../../utils/constants.js";
import { chainHttpRpcUrl } from "../../utils/chainHttpRpcUrl.js";
import { getHdtErc20AddressForChain } from "../../utils/hdtContractAddress.js";

// thirdweb
import { useThirdwebClient } from "../Model/ThirdWebClientProvider";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";

// Session
// import { useSession } from "../../pages/sessions/session"
// import SessionComponent from "../../pages/w3-calls/sessionComponent"

const ARBITRUM_ONE_ID = 42161;
const SEPOLIA_CHAIN_ID = 11155111;

/** Sepolia USD (card): fixed 10 HDT per $1 — no DEX (see DonateBox checkout + preview). */
const SEPOLIA_USD_CARD_HDT_PER_USD = 10;

function sepoliaUsdCardHdtAmount(usd) {
  const u = Number(usd);
  if (!Number.isFinite(u) || u <= 0) return null;
  return u * SEPOLIA_USD_CARD_HDT_PER_USD;
}

/** Placeholder address for “USD (card)” in token picker — not an ERC-20. */
const STRIPE_USD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000ccd";

/**
 * HDT preflight / insufficient modal: use symbol, not strict address match.
 * Token list and getConfig() can disagree (e.g. Sepolia list 0x9707… vs constants 0xA420…).
 */
function isHumbleHdtToken(token) {
  return Boolean(
    token &&
    !token.isStripeUsd &&
    typeof token.symbol === "string" &&
    token.symbol.toUpperCase() === "HDT",
  );
}

const DonateBox = ({
  accounts,
  tokenData,
  project,
  projectTitle,
  toggleDonateBox,
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
  const {
    walletType,
    thirdwebActiveAccount,
    chain,
    provider,
    wagmiAddress,
    requestBalanceRefresh,
  } = useWallet();
  const { selectedCurrency } = useContext(CurrencyContext);
  const client = useThirdwebClient();
  const approveTokenAbstracted = useApproveTokenAbstracted();
  const donateTokenAbstracted = useDonateTokenAbstracted();
  // const [showPaymentResult, setShowPaymentResult] = useState(false)
  // const { session, updateApprovalStatus } = useSession()
  const [usdValue, setUsdValue] = useState(null);
  const [jpyValue, setJpyValue] = useState(null);
  /** Same path as getINtoUSD in DEXpriceFeed (confirm modal), always USD for current amount. */
  const [donationUsdEstimate, setDonationUsdEstimate] = useState(null);
  const [expand, setExpand] = useState(false);
  const [moveBtn, setMoveBtn] = useState(false);
  const [currency, setCurrency] = useState("USD"); // State to track currency selection
  const [cardHdtPending, setCardHdtPending] = useState(null);
  const [waitingCardHdt, setWaitingCardHdt] = useState(false);
  const [cardHdtEquivalent, setCardHdtEquivalent] = useState(null);
  const [insufficientHdtModalOpen, setInsufficientHdtModalOpen] =
    useState(false);
  const [donateConfirmModalOpen, setDonateConfirmModalOpen] = useState(false);
  /** Fresh on-chain read for DonateConfirmModal (hook balance can be stale after transfers). */
  const [confirmModalBalance, setConfirmModalBalance] = useState({
    status: "idle",
    numeric: null,
  });
  const confirmBalanceFetchGen = useRef(0);
  const [stripeBuyHdtOpen, setStripeBuyHdtOpen] = useState(false);
  /** After “Buy HDT” from insufficient modal, wait for refreshed balance then open confirm. */
  const [awaitPostStripeBalance, setAwaitPostStripeBalance] = useState(false);
  const stripeBuyFromInsufficientRef = useRef(false);

  const chainId = chain?.id;
  /** viem/thirdweb may use bigint; strict === against 11155111 fails without this. */
  const numericChainId =
    chainId != null && chainId !== "" ? Number(chainId) : undefined;
  const { contractAddress, ABI, WRAPPED, NATIVE, HDT, explorer } =
    getConfig(numericChainId);

  const hdtTokenForDonation = useMemo(
    () => ({
      name: "Humble Donations Token",
      image:
        "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmT8MzQti8QNuXrF5esttwCmDHVPWssXEC7YHJ61AzEnfE/HDTlogo-smaller-canvas.png",
      symbol: "HDT",
      address:
        getHdtErc20AddressForChain(numericChainId ?? ARBITRUM_ONE_ID) || HDT,
      decimals: 18,
      chainId: numericChainId ?? ARBITRUM_ONE_ID,
    }),
    [HDT, numericChainId],
  );

  const hdtPollAddress = useMemo(
    () => getHdtErc20AddressForChain(numericChainId),
    [numericChainId],
  );

  const searchTokenPrepend = useMemo(() => {
    if (
      numericChainId !== ARBITRUM_ONE_ID &&
      numericChainId !== SEPOLIA_CHAIN_ID
    ) {
      return [];
    }
    return [
      {
        name: "USD (card)",
        symbol: "USD",
        address: STRIPE_USD_TOKEN_ADDRESS,
        decimals: 2,
        img: images.dollarSign,
        alt: "",
        isStripeUsd: true,
      },
    ];
  }, [numericChainId]);

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
    chainId: numericChainId ?? 42161,
  });
  console.log("TokenOne.name", TokenOne.name);

  const tokenBalanceUi = useConditionalTokenBalance(TokenOne, chain);

  // TOKEN 2
  const [TokenTwo, setTokenTwo] = useState({
    name: "",
    image: "",
    symbol: "",
  });
  const toggleDonateBoxClick = () => {
    toggleDonateBox();
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

  /** Uniswap / quoter calls need Provider#getCode; context `provider` is adapter.provider.toEthers. */
  async function resolveReadProviderForDex() {
    if (provider && typeof provider.getCode === "function") {
      return provider;
    }
    try {
      const signer = await getConnectedSigner(thirdwebActiveAccount);
      const p = signer?.provider;
      if (p && typeof p.getCode === "function") {
        return p;
      }
    } catch (e) {
      console.warn("resolveReadProviderForDex:", e);
    }
    const rpc = chainHttpRpcUrl(chain);
    if (rpc) {
      return new ethers.JsonRpcProvider(rpc);
    }
    return null;
  }

  /**
   * Single on-chain read when the confirm modal opens (not on every context/hook churn).
   * Unstable deps like `provider` / `balanceRefreshNonce` were retriggering this and hammering RPC.
   */
  useEffect(() => {
    if (!donateConfirmModalOpen) {
      setConfirmModalBalance({ status: "idle", numeric: null });
      return;
    }

    const walletAddr = thirdwebActiveAccount?.address || wagmiAddress;
    if (!walletAddr || !chain || TokenOne?.isStripeUsd) {
      setConfirmModalBalance({ status: "error", numeric: null });
      return;
    }

    const gen = ++confirmBalanceFetchGen.current;
    let cancelled = false;

    setConfirmModalBalance({ status: "loading", numeric: null });

    (async () => {
      try {
        let numeric;
        if (TokenOne.name === NATIVE.name) {
          let bal;
          if (provider && typeof provider.getBalance === "function") {
            bal = await provider.getBalance(walletAddr);
          } else {
            const rpc = chainHttpRpcUrl(chain);
            if (!rpc) throw new Error("No RPC for native balance");
            const p = new ethers.JsonRpcProvider(rpc);
            bal = await p.getBalance(walletAddr);
          }
          numeric = parseFloat(ethers.formatEther(bal));
        } else if (TokenOne?.address) {
          const read = createErc20BalanceReader({
            walletType,
            client,
            chain,
            provider,
            tokenAddress: TokenOne.address,
            walletAddress: walletAddr,
          });
          const wei = await read();
          const dec = Number.isFinite(Number(TokenOne.decimals))
            ? Number(TokenOne.decimals)
            : 18;
          numeric = parseFloat(ethers.formatUnits(wei, dec));
        } else {
          throw new Error("Missing token address");
        }

        if (cancelled || gen !== confirmBalanceFetchGen.current) return;
        if (!Number.isFinite(numeric)) {
          setConfirmModalBalance({ status: "error", numeric: null });
        } else {
          setConfirmModalBalance({ status: "ok", numeric });
        }
      } catch (e) {
        console.error("DonateBox confirm modal balance read:", e);
        if (!cancelled && gen === confirmBalanceFetchGen.current) {
          setConfirmModalBalance({ status: "error", numeric: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one fetch per modal open; avoid RPC loop from unstable refs
  }, [donateConfirmModalOpen]);

  // ***** Handling Payable in DonateBox.jsx *****
  const handleDonateClick = async (opts = {}) => {
    const { quantityOverride, skipConfirm = false, tokenInputOverride } = opts;
    const donateQty =
      quantityOverride != null ? String(quantityOverride) : tokenQuantity;
    const tokenForDonation = tokenInputOverride ?? TokenOne;

    // HDT ERC-20 donation: compare amount to wallet balance for selected HDT token.
    const donatingHdtErc20 = isHumbleHdtToken(tokenForDonation);

    if (donatingHdtErc20) {
      // skipConfirm: confirm modal already checked balance, or post–card flow passed
      // pollErc20BalanceIncrease. tokenBalanceUi tracks TokenOne only — if the user still has
      // "USD (card)" selected, the hook skips ERC-20 reads (numericBalance null) even when
      // tokenInputOverride is the real HDT token.
      if (!skipConfirm) {
        if (tokenBalanceUi.isLoading) {
          alert("Balance is still loading. Try again in a moment.");
          return;
        }
        if (tokenBalanceUi.isError) {
          alert("Could not read your HDT balance. Try again.");
          return;
        }
        const qty = parseFloat(String(donateQty).trim());
        const max = tokenBalanceUi.numericBalance;
        if (!Number.isFinite(qty) || qty <= 0) {
          alert("Enter a valid donation amount.");
          return;
        }
        if (max == null || !Number.isFinite(max)) {
          alert("Could not read your HDT balance. Try again.");
          return;
        }
        if (qty > max + 1e-12) {
          setInsufficientHdtModalOpen(true);
          return;
        }
      }
    }

    try {
      const connectedSigner = await getConnectedSigner(thirdwebActiveAccount);
      if (!connectedSigner) {
        console.error("Connected wallet not available");
        return;
      }
      if (tokenForDonation.name === NATIVE.name) {
        const paymentResult = await Payable(
          tokenId,
          donateQty,
          tokenForDonation,
          connectedSigner,
          numericChainId,
        );
        const { transactionHashConfirmation } = paymentResult;
        if (transactionHashConfirmation) {
          setDonationHash(transactionHashConfirmation);
          console.log(
            `Payment Hash: ${explorer}tx/${transactionHashConfirmation}`,
          );
        }
      } else {
        if (walletType == "wagmi") {
          const transactionHashApproval = await approveToken(
            tokenId,
            donateQty,
            tokenForDonation,
            connectedSigner,
            numericChainId,
          );
          setApprovalHash(transactionHashApproval);
          console.log(
            `Approval Hash: ${explorer}tx/${transactionHashApproval}`,
          );

          const transactionHashConfirmation = await donateToken(
            tokenId,
            donateQty,
            tokenForDonation,
            connectedSigner,
            numericChainId,
          );
          setDonationHash(transactionHashConfirmation);
          console.log(
            `Payment Hash: ${explorer}tx/${transactionHashConfirmation}`,
          );
        } else {
          if (walletType === "thirdweb") {
            const transactionHashApproval = await approveTokenAbstracted(
              tokenId,
              donateQty,
              tokenForDonation,
              setApprovalHash,
              setDonationHash,
              setTransactionError,
              chain,
              numericChainId,
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

  const handleDonateClickRef = useRef(handleDonateClick);
  handleDonateClickRef.current = handleDonateClick;

  const isDonatingHdtErc20 = useMemo(
    () => isHumbleHdtToken(TokenOne),
    [TokenOne?.isStripeUsd, TokenOne?.symbol],
  );

  /** Thirdweb: preflight HDT balance, then confirm modal (replaces window.confirm). */
  const handleThirdwebDonateEntry = useCallback(() => {
    if (walletType !== "thirdweb") {
      void handleDonateClickRef.current();
      return;
    }
    if (TokenOne?.isStripeUsd) {
      return;
    }
    if (isDonatingHdtErc20) {
      if (tokenBalanceUi.isLoading) {
        alert("Balance is still loading. Try again in a moment.");
        return;
      }
      if (tokenBalanceUi.isError) {
        alert("Could not read your HDT balance. Try again.");
        return;
      }
      const qty = parseFloat(String(tokenQuantity || "").trim());
      const max = tokenBalanceUi.numericBalance;
      if (!Number.isFinite(qty) || qty <= 0) {
        alert("Enter a valid donation amount.");
        return;
      }
      if (max == null || !Number.isFinite(max)) {
        alert("Could not read your HDT balance. Try again.");
        return;
      }
      if (qty > max + 1e-12) {
        setInsufficientHdtModalOpen(true);
        return;
      }
    }
    setDonateConfirmModalOpen(true);
  }, [
    walletType,
    TokenOne?.isStripeUsd,
    isDonatingHdtErc20,
    tokenBalanceUi.isLoading,
    tokenBalanceUi.isError,
    tokenBalanceUi.numericBalance,
    tokenQuantity,
  ]);

  const donateQtyParsed = parseFloat(String(tokenQuantity || "").trim());
  const donateConfirmEnabled =
    confirmModalBalance.status === "ok" &&
    Number.isFinite(donateQtyParsed) &&
    donateQtyParsed > 0 &&
    confirmModalBalance.numeric != null &&
    Number.isFinite(confirmModalBalance.numeric) &&
    donateQtyParsed <= confirmModalBalance.numeric + 1e-12;

  const donateConfirmDisabledHint =
    confirmModalBalance.status === "loading" ||
    confirmModalBalance.status === "idle"
      ? "Checking on-chain balance…"
      : confirmModalBalance.status === "error"
        ? "Could not verify wallet balance. Try again."
        : !Number.isFinite(donateQtyParsed) || donateQtyParsed <= 0
          ? "Enter a valid donation amount."
          : "Insufficient balance for donation.";

  useEffect(() => {
    if (!awaitPostStripeBalance) return;
    if (tokenBalanceUi.isLoading) return;
    if (!isDonatingHdtErc20) {
      setAwaitPostStripeBalance(false);
      return;
    }
    const qty = parseFloat(String(tokenQuantity || "").trim());
    const max = tokenBalanceUi.numericBalance;
    if (
      max != null &&
      Number.isFinite(qty) &&
      Number.isFinite(max) &&
      qty <= max + 1e-12
    ) {
      setAwaitPostStripeBalance(false);
      setDonateConfirmModalOpen(true);
    }
  }, [
    awaitPostStripeBalance,
    tokenBalanceUi.isLoading,
    tokenBalanceUi.numericBalance,
    tokenQuantity,
    isDonatingHdtErc20,
  ]);

  const handleUsdCardDonate = async () => {
    if (accounts) return;
    const cid = numericChainId;
    if (cid !== ARBITRUM_ONE_ID && cid !== SEPOLIA_CHAIN_ID) {
      alert(
        "USD card checkout releases HDT on Arbitrum One or Sepolia. Please switch network.",
      );
      return;
    }
    if (tokenId == null || tokenId === "") {
      alert("Missing project token for this donation.");
      return;
    }
    const wa = thirdwebActiveAccount?.address || wagmiAddress;
    if (!wa) {
      alert("Connect your wallet.");
      return;
    }
    const rawUsd = parseFloat(String(tokenQuantity || "").trim());
    const amountUSD = Math.round(rawUsd);
    if (!Number.isFinite(rawUsd) || amountUSD < 1) {
      alert("Enter a whole USD amount to pay (minimum $1).");
      return;
    }
    try {
      if (cid === ARBITRUM_ONE_ID) {
        const arbitrumRpcUrl = chainHttpRpcUrl(chain);
        if (!arbitrumRpcUrl) {
          alert(
            "No HTTP RPC on the current chain object. Reconnect your wallet and try again.",
          );
          return;
        }
        const res = await fetch("/api/payment/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountUSD,
            walletAddress: wa,
            network: "arbitrum",
            donationFlow: true,
            tokenId: String(tokenId),
            arbitrumRpcUrl,
          }),
        });
        const data = await res.json();
        if (!data.sessionUrl) {
          throw new Error(data.error || "Checkout failed");
        }
        const w = window.open(
          data.sessionUrl,
          "stripe-checkout",
          "width=600,height=700,scrollbars=yes,resizable=yes",
        );
        if (!w) alert("Allow popups to complete card checkout.");
        return;
      }

      const hdtAmt = sepoliaUsdCardHdtAmount(amountUSD);
      if (!Number.isFinite(hdtAmt) || hdtAmt <= 0) {
        alert("Could not compute HDT amount for this donation. Try again.");
        return;
      }
      const res = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUSD,
          walletAddress: wa,
          network: "sepolia",
          donationFlow: true,
          tokenId: String(tokenId),
          tokenAmount: String(hdtAmt),
        }),
      });
      const data = await res.json();
      if (!data.sessionUrl) {
        throw new Error(data.error || "Checkout failed");
      }
      const w = window.open(
        data.sessionUrl,
        "stripe-checkout",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );
      if (!w) alert("Allow popups to complete card checkout.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Checkout failed");
    }
  };

  // Update handleFixedButtons function to handle USD or JPY based on the selected currency
  const handleFixedButtons = async (fixedAmountIn) => {
    console.log(`handleFixedButtons chainId: ${numericChainId}`);
    try {
      console.log();
      if (TokenOne.isStripeUsd && selectedCurrency === "USD") {
        setTokenQuantity(String(fixedAmountIn));
        return;
      }
      if (TokenOne.isStripeUsd) {
        return;
      }
      const readProvider = await resolveReadProviderForDex();
      if (!readProvider) {
        console.warn("handleFixedButtons: no read provider for DEX quotes");
        return;
      }
      const cid = numericChainId ?? 42161;
      if (selectedCurrency === "USD") {
        // Call function for USD
        let usdInHdt;
        if (cid == 146) {
          // Needs some work - output is way too high
          usdInHdt = await getInUSDQuoteSonic(
            TokenOne,
            fixedAmountIn,
            readProvider,
            cid,
            WRAPPED,
            NATIVE,
          );
        } else {
          // getUSDtoIN
          usdInHdt = await getUSDtoIN(
            TokenOne,
            fixedAmountIn,
            readProvider,
            cid,
          );
        }

        // simply removing if else does not make it dynamic

        setTokenQuantity(usdInHdt.toString());
      } else if (selectedCurrency === "JPY") {
        // Call function for JPY
        const usdInJpy = await getJPYtoIN(
          TokenOne,
          fixedAmountIn,
          readProvider,
          cid,
        );
        // simply removing if else does not make it dynamic
        // if (TokenOne.address === "0x033b82aB3ba626cCCad412a2532897Af82890C72") {
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
    if (TokenOne?.isStripeUsd) {
      setDonationUsdEstimate(null);
      return;
    }
    const fetchValue = async () => {
      try {
        const cid = numericChainId ?? 42161;
        const readProvider = await resolveReadProviderForDex();
        if (!readProvider) {
          console.warn("fetchValue: no read provider for DEX quotes");
          setDonationUsdEstimate(null);
          return;
        }
        if (!tokenQuantity?.trim()) {
          setDonationUsdEstimate(null);
          return;
        }

        let usdEq;
        if (cid == 146) {
          usdEq = await getQuoteSonicUSD(
            TokenOne,
            tokenQuantity,
            readProvider,
            cid,
            WRAPPED,
            NATIVE,
          );
        } else {
          usdEq = await getINtoUSD(TokenOne, tokenQuantity, readProvider, cid);
        }
        setDonationUsdEstimate(usdEq);

        if (selectedCurrency === "USD") {
          setUsdValue(usdEq);
        } else if (selectedCurrency === "JPY") {
          const jpy = await getINtoJPY(
            TokenOne,
            tokenQuantity,
            readProvider,
            cid,
          );
          setJpyValue(jpy);
        }
      } catch (error) {
        console.error("Error fetching value:", error);
        setDonationUsdEstimate(null);
      }
    };

    if (TokenOne && tokenQuantity && !TokenOne.isStripeUsd) {
      fetchValue();
    } else {
      setDonationUsdEstimate(null);
    }
  }, [
    TokenOne,
    tokenQuantity,
    selectedCurrency,
    thirdwebActiveAccount,
    chain,
    provider,
    numericChainId,
    WRAPPED,
    NATIVE,
  ]);

  useEffect(() => {
    if (!TokenOne?.isStripeUsd) {
      setCardHdtEquivalent(null);
      return;
    }
    const run = async () => {
      const u = parseFloat(String(tokenQuantity || "").trim());
      if (!tokenQuantity?.trim() || !Number.isFinite(u)) {
        setUsdValue(null);
        setCardHdtEquivalent(null);
        return;
      }
      setUsdValue(u);
      try {
        if (numericChainId === SEPOLIA_CHAIN_ID) {
          const amountUSD = Math.round(u);
          if (amountUSD < 1) {
            setCardHdtEquivalent(null);
            return;
          }
          const hdtAmt = sepoliaUsdCardHdtAmount(amountUSD);
          setCardHdtEquivalent(
            hdtAmt != null && Number.isFinite(hdtAmt) ? hdtAmt : null,
          );
          return;
        }
        if (numericChainId !== ARBITRUM_ONE_ID) {
          setCardHdtEquivalent(null);
          return;
        }
        const readProvider = await resolveReadProviderForDex();
        if (!readProvider) {
          setCardHdtEquivalent(null);
          return;
        }
        const hdtAmt = await getUSDtoIN(
          hdtTokenForDonation,
          u,
          readProvider,
          ARBITRUM_ONE_ID,
        );
        setCardHdtEquivalent(Number.isFinite(hdtAmt) ? hdtAmt : null);
      } catch (e) {
        console.error(e);
        setCardHdtEquivalent(null);
      }
    };
    run();
  }, [
    TokenOne?.isStripeUsd,
    tokenQuantity,
    thirdwebActiveAccount,
    numericChainId,
    hdtTokenForDonation,
    chain,
    provider,
  ]);

  useEffect(() => {
    const onMsg = (event) => {
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (d?.type !== "HDT_PAYMENT_SUCCESS" || d.flow !== "donate") return;
      if (String(d.tokenId) !== String(tokenId)) return;
      setWaitingCardHdt(true);
      setCardHdtPending({ tokenAmount: d.tokenAmount });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [tokenId]);

  useEffect(() => {
    if (!waitingCardHdt || !cardHdtPending || !hdtPollAddress || !chain) return;
    const wa = thirdwebActiveAccount?.address || wagmiAddress;
    if (!wa) return;

    let readBalance;
    try {
      readBalance = createErc20BalanceReader({
        walletType,
        client,
        chain,
        provider,
        tokenAddress: hdtPollAddress,
        walletAddress: wa,
      });
    } catch (e) {
      console.error("DonateBox card HDT poll: cannot build balance reader", e);
      return;
    }

    const exp = Number(cardHdtPending.tokenAmount);
    const stop = pollErc20BalanceIncrease({
      readBalance,
      expectedAmountHuman: cardHdtPending.tokenAmount,
      onSuccess: () => {
        setWaitingCardHdt(false);
        setCardHdtPending(null);
        requestBalanceRefresh?.();
        handleDonateClickRef.current({
          quantityOverride: String(exp),
          skipConfirm: true,
          tokenInputOverride: hdtTokenForDonation,
        });
      },
      onTimeout: () => {
        setWaitingCardHdt(false);
        setCardHdtPending(null);
      },
    });

    return () => stop();
  }, [
    walletType,
    client,
    chain,
    provider,
    wagmiAddress,
    thirdwebActiveAccount,
    waitingCardHdt,
    cardHdtPending,
    hdtPollAddress,
    hdtTokenForDonation,
    requestBalanceRefresh,
  ]);

  const usdCardHdtMode = TokenOne.isStripeUsd === true;

  const balance = usdCardHdtMode
    ? "—"
    : tokenBalanceUi.isLoading
      ? "Loading..."
      : tokenBalanceUi.isError
        ? "—"
        : parseFloat(tokenBalanceUi.displayValue || "0").toFixed(3);
  const balanceMax = usdCardHdtMode ? "" : tokenBalanceUi.maxAmount || "";

  return (
    <div className={`${Style.donateMain} ${Style.DonateBox}`}>
      <div className={`${Style.DonateBox_box} ${expand ? Style.Expanded : ""}`}>
        <div className={Style.cardHeader}>
          <button
            type="button"
            className={Style.iconHeaderBtn}
            onClick={toggleDonateBoxClick}
            aria-label="Resize amount shortcuts"
          >
            <Image src={images.contract} alt="" width={32} height={32} />
          </button>
          <h2 className={Style.cardTitle}>Donate</h2>
          <button
            type="button"
            className={Style.settingsBtn}
            aria-label="Donation settings"
            onClick={() => setOpenSetting(true)}
          >
            <Image src={images.filledGrad} alt="" width={36} height={36} />
          </button>
        </div>

        <p className={Style.fieldLabel}>Amount</p>
        <div className={Style.DonateBox_box_input}>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={usdCardHdtMode ? "USD" : "0"}
            value={tokenQuantity}
            onChange={handleQuantityChange}
          />

          <button
            type="button"
            className={Style.tokenPicker}
            onClick={() => {
              setOpenToken(true);
            }}
          >
            <Image
              src={TokenOne.image || images.probablyBest}
              width={24}
              height={24}
              alt=""
            />
            <span>{TokenOne.symbol || "HDT"}</span>
          </button>
        </div>
        <div className={Style.balanceBar}>
          <span className={Style.metaMuted}>
            {usdCardHdtMode ? (
              cardHdtEquivalent != null ? (
                <>≈ {cardHdtEquivalent} HDT</>
              ) : (
                "…"
              )
            ) : selectedCurrency === "USD" ? (
              usdValue !== null ? (
                usdValue
              ) : (
                "Loading..."
              )
            ) : jpyValue !== null ? (
              jpyValue
            ) : (
              "Loading..."
            )}
          </span>
          <span className={Style.metaBalance}>Balance {balance}</span>
        </div>
        <div className={Style.buttonBar}>
          <div className={Style.maxButton}>
            <button
              type="button"
              disabled={usdCardHdtMode}
              onClick={() => {
                setTokenQuantity(balanceMax);
              }}
            >
              Max
            </button>
          </div>
          <div className={Style.maxButton}>
            <button
              type="button"
              onClick={() => {
                handleFixedButtons(
                  selectedCurrency === "USD" ? 5 : 300,
                  currency,
                );
              }}
            >
              {selectedCurrency === "USD" ? "$5" : "¥300"}
            </button>
          </div>
          <div className={Style.maxButton}>
            <button
              type="button"
              onClick={() => {
                handleFixedButtons(
                  selectedCurrency === "USD" ? 10 : 400,
                  currency,
                );
              }}
            >
              {selectedCurrency === "USD" ? "$10" : "¥400"}
            </button>
          </div>

          <div className={Style.maxButton}>
            <div className={Style.ellipses}>
              <button
                type="button"
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
                  type="button"
                  onClick={() =>
                    handleFixedButtons(
                      selectedCurrency === "USD" ? 15 : 500,
                      currency,
                    )
                  }
                >
                  {selectedCurrency === "USD" ? "$15" : "¥500"}
                </button>
              </div>
              <div className={Style.maxButton}>
                <button
                  type="button"
                  onClick={() => handleFixedButtons(25, currency)}
                >
                  $25
                </button>
              </div>
              <div className={Style.maxButton}>
                <button
                  type="button"
                  onClick={() => handleFixedButtons(50, currency)}
                >
                  $50
                </button>
              </div>
              <div className={Style.maxButton}>
                <button
                  type="button"
                  onClick={() => handleFixedButtons(100, currency)}
                >
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
            type="button"
            className={`${Style.DonateBox_box_btn} ${
              expand ? Style.MoveBtn : ""
            }`}
          >
            Connect Wallet
          </button>
        ) : usdCardHdtMode ? (
          <button
            className={`${Style.DonateBox_box_btn} ${
              expand ? Style.MoveBtn : ""
            }`}
            type="button"
            onClick={handleUsdCardDonate}
            disabled={waitingCardHdt}
          >
            {waitingCardHdt ? "Waiting for HDT…" : "Donate with card "}
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
        ) : (
          <button
            type="button"
            className={`${Style.DonateBox_box_btn} ${
              expand ? Style.MoveBtn : ""
            }`}
            onClick={() =>
              walletType === "thirdweb"
                ? handleThirdwebDonateEntry()
                : handleDonateClick()
            }
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
          prependTokens={searchTokenPrepend}
        />
      )}
      {openTokensTwo && (
        <SearchToken
          openToken={setOpenTokensTwo}
          tokens={setTokenTwo}
          tokenData={tokenData}
        />
      )}

      <InsufficientHdtModal
        isOpen={insufficientHdtModalOpen}
        onClose={() => setInsufficientHdtModalOpen(false)}
        onBuyHdt={() => {
          stripeBuyFromInsufficientRef.current = true;
          setInsufficientHdtModalOpen(false);
          setStripeBuyHdtOpen(true);
        }}
      />

      <DonateConfirmModal
        isOpen={donateConfirmModalOpen}
        onClose={() => setDonateConfirmModalOpen(false)}
        onConfirmDonate={() => {
          void handleDonateClick({ skipConfirm: true });
        }}
        projectTitle={projectTitle}
        amountDisplay={`${tokenQuantity || ""} ${TokenOne.symbol || ""}`.trim()}
        usdEquivalentDisplay={donationUsdEstimate}
        donateEnabled={donateConfirmEnabled}
        donateDisabledHint={donateConfirmDisabledHint}
      />

      <StripeBuyHdt
        isOpen={stripeBuyHdtOpen}
        onClose={() => {
          setStripeBuyHdtOpen(false);
          if (stripeBuyFromInsufficientRef.current) {
            stripeBuyFromInsufficientRef.current = false;
            requestBalanceRefresh?.();
            setAwaitPostStripeBalance(true);
          }
        }}
      />
    </div>
  );
};

export default DonateBox;
