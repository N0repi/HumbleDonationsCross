// index.js

import React from "react";
import Image from "next/image";

import Style from "./index.module.css";
import WrappedRecentDonations from "../Components/trending/RecentlyDonated";
import images from "../assets";
import addArbitrum from "../Components/addTokenChain/addChainArbitrum";
import addSonic from "../Components/addTokenChain/addChainSonic";
import addTokenToMetaMask from "../Components/addTokenChain/addToken";

export default function Home() {
  return (
    <div className={Style.pageWrapper}>
      <section className={Style.hero} aria-labelledby="hero-heading">
        <div className={Style.heroGrid}>
          <div className={Style.heroCopy}>
            <p className={Style.heroEyebrow}>Humble Donations</p>
            <h1 id="hero-heading" className={Style.heroTitle}>
              Donate and fundraise with on-chain transparency
            </h1>
            <p className={Style.heroLead}>
              Launch a project in minutes. Supporters keep more of what they
              give—built for startups, creators, and causes.
            </p>

            <div className={Style.heroPanel}>
              <p className={Style.heroParagraph}>
                <strong>Anyone</strong> can create a project and start receiving
                donations in less than 2 minutes.
              </p>
              <p className={Style.heroParagraph}>
                With the Humble Donations Token, <strong>100%</strong> of your
                contribution directly benefits your chosen startups, creators,
                and causes—no fees, <strong>no revenue taken</strong>.
              </p>
              <p className={Style.heroParagraph}>
                Stake HDT–WETH to <strong>earn WETH</strong> and support the
                protocol.
              </p>
              <p className={Style.heroParagraph}>
                Donations in other tokens include a 1.5% tax that funds the WETH
                rewards pool and reduces HDT supply.
              </p>
              <p className={Style.heroParagraph}>
                The first application to write webpages on-chain.
              </p>
            </div>

            <a
              className={Style.heroCta}
              href="https://docs.humbledonations.com/Introduction"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the docs
            </a>
          </div>

          <div className={Style.heroVisual}>
            <div className={Style.heroVisualFrame}>
              <Image
                src={images.rings4}
                alt=""
                width={523}
                height={356}
                priority
                className={Style.heroImage}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={Style.feedSection} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={Style.sectionTitle}>
          Recently active
        </h2>
        <div className={Style.feedLayout}>
          <div className={Style.scrollParent}>
            <WrappedRecentDonations />
          </div>
          <aside className={Style.walletAside} aria-label="Network shortcuts">
            <p className={Style.asideLabel}>Get started</p>
            <button
              type="button"
              className={Style.walletAction}
              onClick={addArbitrum}
            >
              Add Arbitrum
            </button>
            <button
              type="button"
              className={Style.walletAction}
              onClick={addSonic}
            >
              Add Sonic
            </button>
            <button
              type="button"
              className={Style.walletActionGhost}
              onClick={addTokenToMetaMask}
            >
              <span className={Style.walletActionIcons}>
                <Image
                  src={images.probablyBest}
                  alt=""
                  width={36}
                  height={36}
                />
                <span aria-hidden>+</span>
                <Image
                  src={images.MetaMask}
                  alt=""
                  width={36}
                  height={36}
                />
              </span>
              <span>Add HDT to MetaMask</span>
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
