// index.js

import React from "react";
import Image from "next/image";

// INTERNAL
import Style from "./index.module.css";
import WrappedRecentDonations from "../Components/trending/RecentlyDonated";
import images from "../assets";
import addArbitrum from "../Components/addTokenChain/addChainArbitrum";
import addSonic from "../Components/addTokenChain/addChainSonic";
import addTokenToMetaMask from "../Components/addTokenChain/addToken";

export default function Home({ Component, pageProps }) {
  return (
    <>
      <div className="pageWrapper">
        <div className={Style.Parent}>
          <div>
            <p className={Style.description}>
              <strong>Anyone</strong> can create a project and start receiving
              donations in less than 2 minutes.
            </p>
            <p className={Style.description}>
              With the Humble Donations Token, 100% of your contribution
              directly benefits <br />
              your chosen start-ups, creators, and causes— no fees,
              <strong> no revenue taken</strong>.
            </p>
            <p className={Style.description}>
              Users can stake HDT-WETH to <strong>earn WETH</strong> and support
              the protocol. <br />
            </p>
            <p className={Style.description}>
              Donations made in other tokens are subject to a 1.5% tax which
              funds <br />
              the WETH rewards pool and reduces the supply of HDT.
            </p>
            <p className={Style.description}>
              The first application to write webpages on-chain.
            </p>
            <br />
            <a
              className={Style.descriptionLink}
              href="https://docs.humbledonations.com/Introduction"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </a>
          </div>
          <div className={Style.imageContainer}>
            <Image
              src={images.rings4}
              alt="Description of the image"
              width={523} // Adjust the width according to your design
              height={356} // Adjust the height according to your design
            />
          </div>
        </div>
        <div className={Style.lowerHalfParent}>
          <div className={Style.recentlyActive}>Recently Active</div>
          <div className={Style.scrollParent}>
            <WrappedRecentDonations />
          </div>

          <div className={Style.lowerHalf}>
            <div className={Style.connectButton}>
              {/* <a
                            href="https://chainlist.org/chain/42161"
                            target="_blank"
                            rel="noopener noreferrer"
                        > */}
              <button onClick={addArbitrum}>Add Arbitrum to your wallet</button>

              {/* </a> */}
            </div>
            <div className={Style.connectButton}>
              {" "}
              <button onClick={addSonic}>Add Sonic to your wallet</button>
            </div>
            <button onClick={addTokenToMetaMask}>
              <div className={Style.addToWallet}>
                <Image
                  src={images.probablyBest}
                  alt="HDT"
                  width={60}
                  height={60}
                />
                +
                <Image
                  src={images.MetaMask}
                  alt="MetaMask"
                  width={60}
                  height={60}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
