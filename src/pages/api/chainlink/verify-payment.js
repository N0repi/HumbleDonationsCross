import { ethers } from "ethers";
import Stripe from "stripe";
import { createSafeClient } from "@safe-global/sdk-starter-kit";
import StripePaymentVerifierABI from "../../../abis/StripePaymentVerifier3.json";

async function initializeSafeClient({ rpcUrl, signerPrivateKey, safeAddress }) {
  const config = {
    provider: rpcUrl,
    signer: signerPrivateKey,
    safeAddress: safeAddress,
  };
  return createSafeClient(config);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_PROD);

function getNetworkConfig(network) {
  const configs = {
    sepolia: {
      rpcUrl: process.env.API_URL_SEPOLIA,
      envSuffix: "_SEPOLIA",
    },
    arbitrum: {
      rpcUrl: process.env.RPC_URL_ARB,
      envSuffix: "_ARB",
    },
  };
  const config = configs[network];
  if (!config) {
    throw new Error(
      `Unsupported network: ${network}. Use "arbitrum" or "sepolia".`,
    );
  }
  return config;
}

/** Normalize client body: default production chain is Arbitrum One. */
function resolveNetwork(bodyNetwork) {
  const trimmed = bodyNetwork == null ? "" : String(bodyNetwork).trim();
  const raw = trimmed === "" ? "arbitrum" : trimmed;
  const n = String(raw).toLowerCase();
  if (n === "arb" || n === "arbitrum-one" || n === "42161") return "arbitrum";
  if (n === "sepolia" || n === "11155111") return "sepolia";
  return n;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }
  try {
    const {
      paymentIntentId,
      walletAddress,
      tokenAmount,
      network: networkRaw,
      checkoutSessionId,
    } = req.body;

    if (!paymentIntentId) {
      throw new Error("Missing paymentIntentId");
    }

    const network = resolveNetwork(networkRaw);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      throw new Error("Payment not confirmed by Stripe");
    }

    const networkConfig = getNetworkConfig(network);
    const RPC_URL = networkConfig.rpcUrl;
    const envSuffix = networkConfig.envSuffix;

    const SAFE_ADDRESS =
      process.env[`SAFE_ADDRESS${envSuffix}`] || process.env.SAFE_ADDRESS_ARB;
    const contractAddress =
      process.env[`STRIPE_PAYMENT_VERIFIER_ADDRESS3${envSuffix}`] ||
      process.env.STRIPE_PAYMENT_VERIFIER_ADDRESS3_ARB;

    if (!SAFE_ADDRESS) {
      throw new Error("Safe address not configured");
    }
    if (!contractAddress) {
      throw new Error("StripePaymentVerifier3 contract address not configured");
    }

    const SIGNER_1_KEY = process.env.SIGNER_1_KEY;
    const SIGNER_2_KEY = process.env.SIGNER_2_KEY;

    if (!SIGNER_1_KEY || !SIGNER_2_KEY) {
      throw new Error(
        "Required signer keys not set: SIGNER_1_KEY, SIGNER_2_KEY",
      );
    }
    if (!RPC_URL) {
      throw new Error(`RPC URL not configured for network: ${network}`);
    }

    /* Per-network only — never fall back to Sepolia secrets on Arbitrum (would break DON). */
    const encryptedSecretsUrls =
      process.env[`ENCRYPTED_SECRET${envSuffix}`] ||
      (network === "sepolia" ? process.env.ENCRYPTED_SECRET_ARB : undefined);

    if (!encryptedSecretsUrls) {
      throw new Error(
        network === "arbitrum"
          ? "Set ENCRYPTED_SECRET_ARB for Arbitrum Chainlink Functions secrets URL"
          : `Set ENCRYPTED_SECRET${envSuffix} or ENCRYPTED_SECRET_SEPOLIA for this network`,
      );
    }

    const safeClient1 = await initializeSafeClient({
      rpcUrl: RPC_URL,
      signerPrivateKey: SIGNER_1_KEY,
      safeAddress: SAFE_ADDRESS,
    });

    const safeClient2 = await initializeSafeClient({
      rpcUrl: RPC_URL,
      signerPrivateKey: SIGNER_2_KEY,
      safeAddress: SAFE_ADDRESS,
    });

    let recipient = walletAddress;
    let tokenAmountHuman;

    if (network === "sepolia" && checkoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(
        String(checkoutSessionId),
      );
      const sessionPi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (sessionPi !== paymentIntentId) {
        throw new Error("Checkout session does not match this payment intent");
      }
      const meta = session.metadata || {};
      const metaPaid = meta.amountPaid;
      if (metaPaid == null || metaPaid === "") {
        throw new Error("Checkout session missing amount metadata");
      }
      const paidUsd = Number(metaPaid);
      if (!Number.isFinite(paidUsd)) {
        throw new Error("Invalid amountPaid in session metadata");
      }
      if (Math.round(paidUsd * 100) !== paymentIntent.amount) {
        throw new Error("Session amount does not match Stripe payment total");
      }
      const metaRecipient = meta.walletAddress;
      if (!metaRecipient) {
        throw new Error("Checkout session missing wallet address");
      }
      if (
        walletAddress &&
        metaRecipient.toLowerCase() !== String(walletAddress).toLowerCase()
      ) {
        throw new Error("Wallet address does not match checkout session");
      }
      recipient = metaRecipient;
      const metaHdt = meta.tokenAmount;
      if (metaHdt == null || metaHdt === "") {
        throw new Error("Checkout session missing token amount");
      }
      tokenAmountHuman = String(metaHdt);
    } else if (network === "sepolia") {
      if (!walletAddress) {
        throw new Error("Missing walletAddress");
      }
      recipient = walletAddress;
      const netFrac = (() => {
        const raw = process.env.STRIPE_HDT_NET_USD_FRACTION;
        if (raw == null || raw === "") return 0.94;
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.94;
        return n;
      })();
      const { getCheckoutHdtAmount } =
        await import("../../../lib/server/hdtImpliedUsdArbitrum.mjs");
      const chargedUsd = paymentIntent.amount / 100;
      const { hdtHuman } = await getCheckoutHdtAmount({
        chargedUsd,
        netUsdFraction: netFrac,
        rpcUrl: RPC_URL,
      });
      tokenAmountHuman = hdtHuman;
    } else {
      if (!walletAddress || tokenAmount == null) {
        throw new Error("Missing walletAddress or tokenAmount");
      }
      recipient = walletAddress;
      tokenAmountHuman = String(tokenAmount);
    }

    const tokenAmountWei = ethers.parseEther(tokenAmountHuman);

    const donHostedSecretsSlotID = 0;
    const donHostedSecretsVersion = 0;
    const gasLimit = 300000;
    const donIdString =
      network === "sepolia"
        ? "fun-ethereum-sepolia-1"
        : "fun-arbitrum-mainnet-1";
    const donID = ethers.encodeBytes32String(donIdString);

    const subscriptionId =
      process.env[`CHAINLINK_SUBSCRIPTION_ID${envSuffix}`] ||
      (network === "sepolia"
        ? process.env.CHAINLINK_SUBSCRIPTION_ID_SEPOLIA
        : process.env.CHAINLINK_SUBSCRIPTION_ID_ARB);
    if (!subscriptionId) {
      throw new Error("CHAINLINK_SUBSCRIPTION_ID not configured");
    }

    console.log("-----------------------------------");
    console.log("network:", network);
    console.log("subscriptionId:", subscriptionId);
    console.log("paymentIntentId:", paymentIntentId);
    console.log("donID:", donID);
    console.log("recipient:", recipient);
    console.log("tokenAmountWei:", tokenAmountWei);
    console.log("encryptedSecretsUrls:", encryptedSecretsUrls);
    console.log("-----------------------------------");

    const StripeVerifierFactory = new ethers.Interface(
      StripePaymentVerifierABI.abi,
    );
    const requestPaymentData = StripeVerifierFactory.encodeFunctionData(
      "requestPaymentVerification",
      [
        subscriptionId,
        paymentIntentId,
        recipient,
        tokenAmountWei,
        encryptedSecretsUrls,
        donHostedSecretsSlotID,
        donHostedSecretsVersion,
        gasLimit,
        donID,
      ],
    );

    const txResult = await safeClient1.send({
      transactions: [
        {
          to: contractAddress,
          data: requestPaymentData,
          value: "0",
        },
      ],
    });

    const safeTxHash = txResult.transactions.safeTxHash;
    const currentStatus = txResult.status;
    console.log("-----------------------------------");
    console.log("safeTxHash:", safeTxHash);
    console.log("currentStatus:", currentStatus);
    console.log("-----------------------------------");
    if (
      currentStatus === "EXECUTED" ||
      currentStatus === "DEPLOYED_AND_EXECUTED"
    ) {
      const transaction = { txHash: txResult.transactions?.ethereumTxHash };
      if (!transaction.txHash) {
        throw new Error("No ethereum transaction hash available");
      }
      return res.status(200).json({
        success: true,
        txHash: transaction.txHash,
        safeTxHash: safeTxHash,
        requestId: "Will be available in transaction logs",
        status: "already_executed",
      });
    }

    let confirmResult;
    try {
      confirmResult = await safeClient2.confirm({
        safeTxHash: safeTxHash,
      });
    } catch (error) {
      console.error("Error confirming transaction:", error);
      if (error.message.includes("GS013")) {
        return res.status(500).json({
          error: "Safe transaction execution failed (GS013)",
          details:
            "Treasury balance, DON secrets, or subscription LINK may be insufficient",
          safeTxHash: safeTxHash,
        });
      }
      return res.status(500).json({
        error: "Failed to confirm transaction",
        message: error.message,
        safeTxHash: safeTxHash,
      });
    }

    if (confirmResult.transactions?.ethereumTxHash) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      await provider.waitForTransaction(
        confirmResult.transactions.ethereumTxHash,
        1,
      );
      res.status(200).json({
        success: true,
        txHash: confirmResult.transactions.ethereumTxHash,
        safeTxHash: safeTxHash,
        requestId: "Will be available in transaction logs",
      });
    } else {
      res.status(500).json({
        error: "Transaction was created but not fully executed",
        safeTxHash: txResult.transactions?.safeTxHash,
        status: confirmResult.status,
        description: confirmResult.description,
      });
    }
  } catch (error) {
    console.error("Error in verify-payment endpoint:", error);
    if (error.safeTxHash) {
      res.status(500).json({
        error: error.message,
        safeTxHash: error.safeTxHash,
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}
