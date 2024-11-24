// Aridrop.jsx

import React from "react";
import Link from "next/link";
import callContract from "./AirdropComputation";
import Style from "./Airdrop.module.css";

const Airdrop = ({ setOpenAirdropModal }) => {
  const handleClaimClick = async () => {
    await callContract();
    // Close the modal after claiming the airdrop
    setOpenAirdropModal(false);
  };

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={Style.Model} onClick={() => setOpenAirdropModal(false)}>
      <div className={Style.Model_box} onClick={handleModalContentClick}>
        <div className={Style.AirdropHeader}>
          <p>Airdrop</p>
        </div>

        <div className={Style.EligibleHeader}>
          You must own a project to be eligible for the incentive{" "}
          <a
            href="https://humbledonations.com/newproject"
            target="_blank"
            rel="noopener noreferrer"
            className={Style.link}
          >
            Create a project
          </a>
        </div>
        <p className={Style.QualHeader}>Qualifications</p>
        <div className={Style.Model_box_item}>
          <div className={Style.Amounts}>
            <ul>
              <li>1000 HDT</li>
              <li>150 HDT</li>
              <li>100 HDT</li>
              <li>num donations * 10 HDT</li>
            </ul>
          </div>
          <ul>
            <li>Creating & owning a project</li>
            <li>Donating 150+ HDT in a single donation</li>
            <li>
              Donating ERC-20 tokens or ETH<em> excluding HDT </em>
            </li>
            <li>
              Total donations received received<em> excluding HDT </em>
            </li>
          </ul>
        </div>

        <div className={Style.AirdropHeader}>
          <button className={Style.claimButton}>Not yet</button>
          {/* <button className={Style.claimButton} onClick={handleClaimClick}>
                        Claim Tokens
                    </button> */}
        </div>
      </div>
    </div>
  );
};

export default Airdrop;
