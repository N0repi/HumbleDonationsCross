// Send.jsx

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { arbitrum } from "thirdweb/chains";
import { sonicMainnet } from "../../../constants/thirdwebChains/sonicMainnet";
import { useWallet } from "../../Wallet/WalletContext";
import { getConfig } from "../../../utils/constants.js";

import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { client } from "../../Model/thirdWebClient";
// TransactionProvider
import { useTransaction } from "../../Transaction/TransactionContext";

import SearchToken from "../../SearchToken/SearchToken";
import erc20ABI from "../../w3-calls/erc20.json" assert { type: "json" };

import { supportedTokens } from "./SupportedTokens.json";
import Style from "./Send.module.css";

const Send = ({ isOpen, onClose }) => {
  // States
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { setTransferHash, setTransactionError } = useTransaction();

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [isSearchTokenOpen, setIsSearchTokenOpen] = useState(false);

  // Wallet and chain context
  const { chain, provider, walletType, thirdwebActiveAccount } = useWallet();
  const { NATIVE, HDT, chainId } = getConfig(chain?.id);

  const DEFAULT_TOKEN = {
    name: "Humble Donations Token",
    image:
      "https://maroon-blank-stoat-172.mypinata.cloud/ipfs/QmT8MzQti8QNuXrF5esttwCmDHVPWssXEC7YHJ61AzEnfE/HDTlogo-smaller-canvas.png",
    symbol: "HDT",
    address: HDT,
    decimals: 18,
    chainId: chainId ?? 42161,
  };
  const [selectedToken, setSelectedToken] = useState(DEFAULT_TOKEN);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      setStatusMessage("Please enter a valid recipient and amount.");
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      let signer;
      if (walletType === "thirdweb") {
        signer = ethers6Adapter.signer.toEthers({
          client: client,
          chain: chain,
          account: thirdwebActiveAccount,
        });
        console.log("signer:", signer);
      } else {
        signer = await provider.getSigner();
      }

      // Handle Native Currency Transfer
      if (selectedToken.name === NATIVE.name) {
        const formattedAmount = ethers.parseEther(amount);
        const tx = await signer.sendTransaction({
          to: recipient,
          value: formattedAmount,
        });

        const transferHash = await tx.wait();
        console.log("Native transfer hash:", transferHash.hash);
        setTransferHash(transferHash.hash);

        // Handle ERC-20 Token Transfer
      } else {
        const contractERC20 = new ethers.Contract(
          selectedToken.address,
          erc20ABI,
          signer
        );

        const formattedAmount = ethers.parseUnits(
          amount,
          selectedToken.decimals
        ); // Use ethers v6 parseEther
        //

        // const gasEstimate = await contractERC20.transfer.estimateGas(
        //   recipient,
        //   formattedAmount
        // );
        // console.log("Estimated Gas:", gasEstimate.toString());
        //

        // console.log("formattedAmount:", formattedAmount);
        // console.log("recipient:", recipient);

        const transfertx = await contractERC20.transfer(
          recipient,
          formattedAmount
          // { gasLimit: 1000000 }
        );
        const transferHash = await transfertx.wait();
        console.log("transferHash:", transferHash.hash);
        setTransferHash(transferHash.hash);

        setStatusMessage("Transaction sent successfully!");
        setRecipient("");
        setAmount("");
      }
    } catch (error) {
      console.error("Transaction Error:", error);
      setStatusMessage("Transaction failed. Please try again.");
      // if (error) {
      //   setTransactionError(transferHash.hash);
      // } else {
      //   setTransactionError(error);
      // }
    } finally {
      setIsLoading(false);
    }
  };

  return isOpen ? (
    <div className={Style.modalContainer}>
      <div className={Style.modalBox}>
        {/* <div className={Style.container}></div> */}
        <h2 className={Style.title}>Send Box</h2>
        <form onSubmit={handleSend} className={Style.form}>
          <div className={Style.formGroup}>
            <label>Recipient Address</label>
            <input
              type="text"
              placeholder="0xRecipientAddress"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              className={Style.input}
            />
          </div>
          <div className={Style.formGroup}>
            <label>Amount</label>
            <input
              type="number"
              step="0.0001"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={Style.input}
            />
          </div>
          <div className={Style.token}>
            <label>Token:</label>
            <button
              type="button"
              className={Style.tokenButton}
              onClick={() => setIsSearchTokenOpen(true)}
            >
              <div className={Style.tokenDisplay}>
                <img
                  src={selectedToken.image}
                  alt={selectedToken.symbol}
                  width={20}
                  height={20}
                  className={Style.tokenImage}
                />
                <span className={Style.tokenSymbol}>
                  {selectedToken.symbol}
                </span>
              </div>
            </button>
          </div>
          {isSearchTokenOpen && (
            <SearchToken
              openToken={setIsSearchTokenOpen}
              tokens={(tokenData) => setSelectedToken(tokenData)}
            />
          )}
          {statusMessage && (
            <div className={Style.statusMessage}>{statusMessage}</div>
          )}
          <div className={Style.buttonContainer}>
            <button
              type="submit"
              className={Style.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              className={Style.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;
};

export default Send;
