// [title].js

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import images from "../../assets/index.js";
import { useRouter } from "next/router";
import { BASE_API_URL, getConfig } from "../../utils/constants.js";
import HeroSection from "../../Components/HeroSection/HeroSection.jsx";
import Style from "./[title].module.css";

import GetTokenBalance from "../Rewards/MetricsForTitle.jsx";
import { useTransaction } from "../../pages/TransactionContext";
import { ethers } from "ethers";

// thirdweb
import { getContract, prepareContractCall } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { useWallet } from "../../Components/Wallet/WalletContext";
import { client } from "../../Components/Model/thirdWebClient";

// ERC721 Render

const URIrender = () => {
  const router = useRouter();
  const { title } = router.query;
  const [project, setProject] = useState(null);
  const [showHeroSection, setShowHeroSection] = useState(false);
  const [tokenId, setTokenId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [provider, setProvider] = useState(null); // State to store the provider for MetricsForTitle to get fiat value
  const { setBurnHash, setTransactionError } = useTransaction();
  const {
    walletType,
    wagmiAddress,
    thirdwebActiveWallet,
    thirdwebActiveAccount,
    thirdWebConnectionStatus,
    wagmiIsConnected,
    chain,
    getProvider,
  } = useWallet();

  const networks = {
    42161: { name: "Arbitrum", image: images.arbitrum },
    11155111: { name: "Sepolia", image: images.sepolia },
    64165: { name: "Sonic", image: images.sonic },
  };

  const { contractAddress, ABI, NATIVE } = getConfig(chain?.id);

  console.log("useWallet chainId:", chain);
  console.log("thirdweb useWallet chainId:", chain?.id);

  const contract = getContract({
    client: client,
    chain: chain,
    address: contractAddress,
  });
  const { mutate: sendTransaction } = useSendTransaction();

  useEffect(() => {
    const fetchTokenData = async () => {
      // !thirdWebConnectionStatus == undefined)
      const isThirdwebConnected =
        thirdWebConnectionStatus !== undefined &&
        thirdWebConnectionStatus !== null &&
        thirdwebActiveAccount?.address;

      if (wagmiIsConnected || isThirdwebConnected) {
        console.log("*Rendering on chain*");
        const provider = await getProvider();
        setProvider(provider);
        console.log("ethersJS provider:", provider);
        if (!provider) {
          console.error("Connected wallet not available"); // -> use DB fallback code
          return;
        }

        const HumbleDonations = new ethers.Contract(
          contractAddress,
          ABI,
          provider
        );

        try {
          const tokenId = await HumbleDonations.getTokenId(title);
          console.log("tokenId: ", tokenId);
          if (tokenId === null || tokenId === undefined) {
            console.error("Token ID not found for the provided title:", title);
            return;
          }
          const tokenURI = await HumbleDonations.tokenURI(tokenId);
          const metadata = JSON.parse(tokenURI);
          setProject(metadata);
          setTokenId(tokenId);
          const owner = await HumbleDonations.ownerOf(tokenId);
          const connectedWallet =
            wagmiAddress || thirdwebActiveAccount?.address;
          console.log(
            "thirdwebActiveAccount?.address - ",
            thirdwebActiveAccount?.address
          );
          console.log("connectedWallet - ", connectedWallet);
          if (owner.toLowerCase() === connectedWallet.toLowerCase()) {
            setIsOwner(true);
          } else {
            null;
          }
          // console.log("owner: ", owner)
          // console.log("isOwner: ", isOwner)
        } catch (error) {
          console.error("Error fetching token ID or token URI:", error);
        }
      } else {
        try {
          console.log("*Rendering from fallback*");
          const res = await fetch(`${BASE_API_URL}/projects?title=${title}`);
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          const data = await res.json();
          setProject(data[0]);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    if (title) {
      // This line is 'Uncaught (in)
      fetchTokenData();
    }
  }, [title, wagmiIsConnected, wagmiAddress]);

  const toggleHeroSection = () => {
    setShowHeroSection(!showHeroSection);
  };

  const handleDelete = async () => {
    const provider = await getProvider();
    if (walletType == "wagmi") {
      try {
        const signer = await provider.getSigner();
        const HumbleDonations = new ethers.Contract(
          contractAddress,
          ABI,
          signer
        );
        console.log("handleDelete check:", signer);
        console.log("handleDelete check:", tokenId);
        const burnTx = await HumbleDonations.burnToken(tokenId);
        setBurnHash(burnTx.hash);
        await burnTx.wait();
        alert("Project deleted successfully!");
        router.push("/donate"); // Redirect to home or another page after deletion
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Error deleting project.");
        if (error.burnTx) {
          setTransactionError(error.burnTx.hash);
        } else if (error.receipt && error.receipt.hash) {
          setTransactionError(error.receipt.hash);
        } else if (burnTx.hash) {
          setTransactionError(burnTx.hash);
        } else {
          setTransactionError("Unknown error occurred");
        }
      }
    } else if (walletType == "thirdweb") {
      try {
        console.log("tokenId: ", tokenId);
        const sendAbstractedTx = prepareContractCall({
          contract: contract,
          method: "function burnToken(uint256 tokenId) external",
          params: [tokenId],
        });
        sendTransaction(sendAbstractedTx, {
          onSuccess: async (transaction) => {
            console.log("Transaction successful, hash:", transaction.hash);

            const transactionHash =
              transaction.transactionHash || transaction.hash;
            console.log("Transaction successful, hash:", transactionHash); // Works

            setBurnHash(transactionHash);

            // const receipt = await connectedProvider.waitForTransaction(transactionHash)

            // if (receipt && receipt.status === 1) {
            // } else {
            //     console.error("Transaction failed or is not mined yet.")
            //     setTransactionError(transactionHash)
            // }
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            if (error.transaction) {
              setTransactionError(error.transaction.hash);
            } else if (error.receipt && error.receipt.hash) {
              setTransactionError(error.receipt.hash);
            } else if (transactionHash) {
              setTransactionError(transactionHash);
            } else {
              setTransactionError("Unknown error occurred");
            }
          },
        });
        alert("Project deleted successfully!");
        router.push("/donate");
      } catch (error) {
        console.error("Transaction failed:", error);
      }
    }
  };

  const contentRef = useRef(null);

  return (
    <main className={Style.mainContainer}>
      <div className={Style.hideOnDesktop}>
        {project && (
          <div className={Style.optionalMediaContainer}>
            {/* Render Project Logo */}

            {project.website && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`${project.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.website}
                      alt="website"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.twitter && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`https://twitter.com/${project.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.x2}
                      alt="twitter"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.discord && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`${project.discord}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.discord}
                      alt="discord"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.youtube && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`https://www.youtube.com/@${project.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.youtube}
                      alt="youtube"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.twitch && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`https://www.twitch.tv/${project.twitch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.twitch}
                      alt="twitch"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.reel && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={project.reel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.portfolio}
                      alt="reel"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.github && (
              <div className={Style.websiteWrapperMobile}>
                <a
                  href={`https://github.com/${project.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.github}
                      alt="github"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project?.network && networks[project.network] ? (
              <div className={Style.networkContainer}>
                <div className={Style.websiteWrapperMobile}>
                  <Image
                    src={networks[project.network]?.image} // Safely access the image
                    alt={networks[project.network]?.name} // Safely access the name
                    width={30}
                    height={30}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {project ? (
        <div className={Style.contentContainer} ref={contentRef}>
          {showHeroSection ? (
            true
          ) : (
            <button
              onClick={toggleHeroSection}
              className={Style.buttonContainer}
            >
              Donate
              <div className={Style.expandContract}>
                <Image src={images.expand} alt="expand" />
              </div>
            </button>
          )}
          <div className={Style.textContainer}>
            <div className={Style.titleStyle}>
              <h3>{project.title}</h3>
            </div>
            {project.ipfsUri ? (
              <div className={Style.logoContainer}>
                <Image
                  src={project.ipfsUri}
                  alt="Project Logo"
                  width={80}
                  height={80}
                />
              </div>
            ) : null}
            <div className={Style.bodyStyle}>
              {project.body.split("\n").map((paragraph, index) => (
                <React.Fragment key={index}>
                  <p>{paragraph}</p>
                  <p>
                    {index < project.body.split("\n").length - 1 && "\n \n"}
                  </p>
                </React.Fragment>
              ))}
            </div>
          </div>
          {/* {console.log("isOwner before rendering: ", isOwner)} */}
          {isOwner && (
            <button onClick={handleDelete} className={Style.deleteButton}>
              Delete project
            </button>
          )}
          <button>
            {/* <Link legacyBehavior href="/Rewards/MetricsForRewards">
              <a className={`${Style.metricsButton} ${"/Rewards"}`}>Metrics</a>
            </Link> */}
          </button>
        </div>
      ) : (
        <p>Loading...</p> // Display a loading message while project is null
      )}
      <div>
        <div className={Style.heroSectionContainer}>
          {showHeroSection && (
            <>
              <HeroSection
                tokenId={tokenId}
                projectTitle={project.title}
                toggleHeroSection={toggleHeroSection}
              />
              {tokenId &&
                provider && ( // Ensure provider is defined before passing it
                  <GetTokenBalance
                    tokenId={tokenId}
                    chainId={chain?.id}
                    provider={provider}
                  />
                )}
            </>
          )}
        </div>
      </div>
      <div className={Style.hideOnMobile}>
        {project?.network && networks[project.network] ? (
          <div className={Style.networkContainer}>
            <Image
              src={networks[project.network]?.image} // Safely access the image
              alt={networks[project.network]?.name} // Safely access the name
              width={50}
              height={50}
            />
          </div>
        ) : null}
        {project && (
          <div className={Style.optionalMediaContainer}>
            {project.website && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`${project.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.website}
                      alt="website"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.twitter && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`https://twitter.com/${project.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.x2}
                      alt="twitter"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.discord && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`${project.discord}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.discord}
                      alt="discord"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.youtube && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`https://www.youtube.com/@${project.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.youtube}
                      alt="youtube"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.twitch && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`https://www.twitch.tv/${project.twitch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.twitch}
                      alt="twitch"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.reel && (
              <div className={Style.websiteWrapper}>
                <a
                  href={project.reel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.portfolio}
                      alt="reel"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
            {project.github && (
              <div className={Style.websiteWrapper}>
                <a
                  href={`https://github.com/${project.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <Image
                      src={images.github}
                      alt="github"
                      width={30}
                      height={30}
                    />
                  </span>
                </a>
              </div>
            )}
          </div>
        )}

        <div className={Style.hideOnMobile}>
          <div className={Style.tagContainer}>
            {project &&
              Array.isArray(project.tag) &&
              project.tag.map((tag, index) => {
                const formattedTag = tag.replace(/\s+/g, "-");
                return (
                  <div
                    key={index}
                    className={`${Style.tag} ${Style[formattedTag]}`}
                  >
                    {tag}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default URIrender;
