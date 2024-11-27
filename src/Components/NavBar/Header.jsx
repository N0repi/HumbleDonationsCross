// Header.jsx

"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import images from "../../assets";
import { Model, TokenList, LanguageToggle, Airdrop } from "../index";
import { useRouter } from "next/router";

// IMPORT INTERNAL
import { snapshotURL } from "../../utils/constants.js";
import Style from "./Header.module.css";
// import Profile from "../../pages/wagmi-profile"
import { useAccount } from "wagmi";
import { useActiveWalletConnectionStatus } from "thirdweb/react";

import InAppWallet from "../ThirdWeb/Connected/InAppWallet";
import WalletModal from "../ThirdWeb/Connected/WalletModal";

// SIWE
// import SignInButton from "../../pages/siweMessageIntegrated"

export default function Head() {
  const { isConnected } = useAccount(); // wagmi connection status
  const thirdWebConnectionStatus = useActiveWalletConnectionStatus(); // thirdweb connection status

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openAirdropModal, setOpenAirdropModal] = useState(false);
  const [openWalletModal, setOpenWalletModal] = useState(false);
  const [activeTab, setActiveTab] = useState("/");
  const router = useRouter();

  useEffect(() => {
    // Determine if either wagmi or thirdweb wallet is connected
    const isConnectedStatus =
      isConnected || thirdWebConnectionStatus === "connected";
    setIsWalletConnected(isConnectedStatus);
  }, [isConnected, thirdWebConnectionStatus]);

  useEffect(() => {
    setActiveTab(router.pathname);
  }, [router.pathname]);

  const handleProfileClick = () => {
    if (!isWalletConnected) {
      setOpenModel(true);
    } else {
      // Handle disconnect logic if needed
    }
  };

  const handleInAppWalletClick = () => {
    setOpenWalletModal(true);
  };

  return (
    <nav className={Style.parent}>
      <div className={Style.left}>
        <div className={Style.HDTlogo}>
          <Link legacyBehavior href="/">
            <a
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              <Image src={images.probablyBest} alt="HDT logo" />
              <span className={`${Style.title} ${Style.hideOnMobile}`}>
                Humble Donations
              </span>
            </a>
          </Link>
        </div>
      </div>
      <div className={Style.center}>
        <Link legacyBehavior href="/newproject">
          <a
            className={`${Style.link} ${
              activeTab === "/newproject" ? Style.activeTab : ""
            }`}
          >
            Create
          </a>
        </Link>
        <Link legacyBehavior href="/donate">
          <a
            className={`${Style.link} ${
              activeTab === "/donate" ? Style.activeTab : ""
            }`}
            onClick={() => setActiveTab("/donate")}
          >
            Donate
          </a>
        </Link>
        <Link legacyBehavior href="/swap">
          <a
            className={`${Style.link} ${
              activeTab === "/swap" ? Style.activeTab : ""
            }`}
          >
            Swap
          </a>
        </Link>
        <Link legacyBehavior href="/stake">
          <a
            className={`${Style.link} ${
              activeTab === "/stake" ? Style.activeTab : ""
            }`}
          >
            Stake
          </a>
        </Link>

        <a
          href={snapshotURL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${Style.link} ${Style.hideOnMobile} ${
            activeTab === "/Governance" ? Style.activeTab : ""
          }`}
        >
          Governance
        </a>
      </div>

      <div className={`${Style.right}`}>
        <div className={`${Style.airdrop} ${Style.hideOnMobile}`}>
          <button
            onClick={() => setOpenAirdropModal(true)}
            className={Style.airdropText}
          >
            Airdrop
          </button>
          {openAirdropModal && (
            <Airdrop setOpenAirdropModal={setOpenAirdropModal} />
          )}
        </div>
        <div>
          <a
            className={`${Style.link} ${
              activeTab === "/docs" ? Style.activeTab : ""
            }`}
            href="https://docs.humbledonations.com/Introduction"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={images.docLessBottomWork}
              alt="document"
              width={26}
              height={26}
            />
          </a>
        </div>
        {openAirdropModal && (
          <Airdrop setOpenAirdropModal={setOpenAirdropModal} />
        )}
        <div>{/* Profile-related actions */}</div>
        {openModel && <Model setOpenModel={setOpenModel} connect="Connect" />}
        <div className={Style.WalletModal}>
          <InAppWallet
            setOpenModel={setOpenModel}
            handleInAppWalletClick={handleInAppWalletClick}
          />
        </div>
        {openWalletModal && (
          <WalletModal setOpenWalletModal={setOpenWalletModal} />
        )}
      </div>
    </nav>
  );
}
