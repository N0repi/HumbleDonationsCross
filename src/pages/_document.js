// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charset="UTF-8" />
          <meta
            name="description"
            content="Humble Donations is a decentralized crowdfunding and donation platform where you can support creators, startups, and causes with zero fees utilizing crypto using blockchain technology."
          />
          <meta
            name="keywords"
            content="crypto donations, cryptocurrency, crowdfunding, HumbleDonations, Humble Donations, HDT, support creators, blockchain donations, earn rewards, staking HDT-WETH, web3 fundraising, no revenue cuts, decentralized, Arbitrum, NGO, startups, artists"
          />
          <meta name="robots" content="index, follow" />
          <meta name="author" content="HumbleDonations Team" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <meta name="theme-color" content="#e44bca" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
