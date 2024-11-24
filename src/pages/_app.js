// _app.js

import Head from "next/head";
import { useEffect, useState, useRef } from "react";
// wagmi
import { sepolia, arbitrum, fantomSonicTestnet } from "wagmi/chains";
import { sonicTestnet } from "../constants/wagmiChains/sonicTestnet";
import { createConfig, configureChains, WagmiConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
// wallets
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
// import "@rainbow-me/rainbowkit/styles.css"
// import { RainbowKitProvider } from "@rainbow-me/rainbowkit"

// INTERNAL IMPORT
import { Header } from "../Components/index";

import styles from "../styles/Home.module.css";
import "../styles/globals.css";
import { explorer } from "../utils/constants.js";
// import walletArray from "./rainbowkit-wallets"

// Transaction Components
import { TransactionProvider } from "./TransactionContext.js";
import PaymentResult from "../Components/HeroSection/PaymentResult";

// Currency Context | USD or JPY
import { CurrencyProvider } from "../Components/LanguageToggle/CurrencyContext.jsx";

import images from "../../src/assets";
import Image from "next/image";
import Style from "./_app.module.css";

// web2 auth
import { ThirdwebProvider } from "thirdweb/react";
import { WalletProvider } from "../Components/Wallet/WalletContext";

// Sloppy cahce solution because Sonic is on a hosted subgraph and not Subgraph Studio
import { CacheProvider } from "../utils/Graph/NOC/CacheContext";

// text size prod fix
import "../styles/globals.css";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"], // Include all the weights you are using
  style: ["normal", "italic"], // Include styles if needed
  display: "swap", // Mimic the display behavior of @import
});

global.explorer = explorer;

const { chains, webSocketPublicClient, publicClient } = configureChains(
  [arbitrum, sepolia, fantomSonicTestnet, sonicTestnet],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: false,
  connectors: [
    new MetaMaskConnector({
      chains,
      options: {
        name: "MetaMask",
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        name: "CoinBase",
        appName: "wagmi",
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        name: "WalletConnect",
        projectId: "f3e4578c7c5c2859b224991269a97846",
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Other",
        shimDisconnect: true,
      },
    }),
    // new getDefaultWallets({
    //     name: "My RainbowKit App",
    //     projectId: "f3e4578c7c5c2859b224991269a97846",
    //     chains,
    // }),
  ],
  publicClient,
  webSocketPublicClient,
});

// const  connectors  = getDefaultWallets({
//     appName: "My RainbowKit App",
//     projectId: "YOUR_PROJECT_ID",
//     chains,
// })
// const walletArrayResult = walletArray()
// const { wallets } = walletArrayResult[0]

// const { getDefaultWallets } = walletArray()
// const secondComponentConfig = createConfig({
//     autoConnect: false,
//     connectors: wallets,
//     publicClient,
//     webSocketPublicClient,
// })

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.

// useEffect is a gross solution. Should use something like sign-in / sing-out with next-auth to reconnect wallet
export default function App({ Component, pageProps }) {
  // const [currency, setCurrency] = useState("USD")

  // useEffect(() => {
  //     config.autoConnect()
  // }, [])

  return (
    <div className={roboto.className}>
      <div className="backgroundContainer">
        {/* <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes"
        /> */}
        {/* <div className={Style.backgroundStyle}>
          <Image
            src={images.a00001SwinIR}
            alt="Description of the image"
            priority={true}
          />
        </div>
        <div className={Style.backgroundContainer}> */}
        <TransactionProvider>
          <WagmiConfig config={config}>
            <ThirdwebProvider>
              <WalletProvider>
                <CurrencyProvider>
                  <div className={styles.App}>
                    <Header />

                    <PaymentResult />
                    <CacheProvider>
                      <Component {...pageProps} />
                    </CacheProvider>
                  </div>
                </CurrencyProvider>
              </WalletProvider>
            </ThirdwebProvider>
          </WagmiConfig>
        </TransactionProvider>
      </div>
    </div>
  );
}
