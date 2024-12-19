// CreateForm.jsx

"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";

import { pinata } from "./pinataConfig";
import { ethers } from "ethers";
import { useRouter } from "next/router";

//
import images from "../../assets";
import { BASE_API_URL } from "../../utils/constants";
import Style from "./CreateForm.module.css";

// import { useTransaction } from "../TransactionContext.jsx"
import { useTransaction } from "../Transaction/TransactionContext";

// thirdweb
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../Model/thirdWebClient";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { arbitrum, sepolia } from "thirdweb/chains";

import { useWallet } from "../Wallet/WalletContext";
import { getConfig } from "../../utils/constants";

function getByteSize(str) {
  return new TextEncoder().encode(str).length;
}

export default function CreateForm() {
  const router = useRouter();
  const { setConfirmationHash, setTransactionError } = useTransaction();
  const [title, setTitle] = useState("");
  const [body, setDescription] = useState("");
  const [mintRate, setMintRate] = useState(null);
  const [balance, setBalance] = useState(null);
  const [buttonText, setButtonText] = useState("Add Project");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  // External Links
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitch, setTwitch] = useState("");
  const [reel, setReel] = useState("");
  const [github, setGithub] = useState("");
  // Network
  const [network, setNetwork] = useState("Unkown chainId");
  // Tag Array
  const [tag, setTag] = useState([]);

  const [pStatus, setPStatus] = useState(false); // State for project status
  // Add FundMe clicked -> default action is to refresh the page
  const [scHeight, setScHeight] = useState("auto"); // Initial height

  // IPFS Images
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ipfsUri, setIpfsUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const {
    walletType,
    wagmiAddress,
    thirdwebActiveAccount,
    chain,
    getProvider,
  } = useWallet();

  const chainId = chain?.id;
  const { contractAddress, ABI, NATIVE } = getConfig(chainId);

  console.log("Wallet type: ", walletType);
  const maxTags = 3;

  const { mutate: sendTransaction } = useSendTransaction();

  // auto resize state
  const handleTextareaChange = (e) => {
    setDescription(e.target.value);
    let newScHeight = e.target.scrollHeight + "px";
    setScHeight(newScHeight);
  };

  // tags state
  const handleSelectChange = (e) => {
    const selectedOptions = Array.from(e.target.options)
      .filter((option) => option.selected)
      .map((option) => option.value);

    setTag((prevTags) => [...prevTags, ...selectedOptions]);
  };
  const validateTitle = (input) => {
    // Prevent `/` from being included in the title
    if (input.includes("/")) {
      alert("The title cannot contain the '/' character.");
      return false;
    }
    return true;
  };
  const handleTitleChange = (e) => {
    const input = e.target.value;
    if (validateTitle(input)) {
      setTitle(input);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];

    if (file && validTypes.includes(file.type)) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      alert("Invalid file type. Please upload JPEG, PNG, or SVG.");
    }
  };

  // IPFS images
  const uploadToIPFS = async () => {
    if (!imageFile) {
      alert("Please select a file to upload.");
      return;
    }

    setUploading(true);

    try {
      // error on `const response`
      const response = await pinata.upload.file(imageFile);

      const cid = response.IpfsHash; // Retrieve the IPFS CID from the response
      console.log("CID:", cid);

      const ipfsUri = await pinata.gateways.convert(cid);
      setIpfsUri(ipfsUri);
      alert("Image uploaded successfully.");
    } catch (error) {
      console.error("IPFS upload failed:", error);
      alert("Failed to upload file to IPFS.");
    } finally {
      setUploading(false);
    }
  };

  // chain.name examples: "Sonic Testnet", "Sepolia"  |  chain.id examples: "64165", "11155111"
  // Update network only when `chain` changes
  // Set `network` to the chainId value when `chain` changes
  useEffect(() => {
    if (chain && chain.id) {
      const chainIdStr = chain.id.toString();
      setNetwork(chainIdStr); // Store chainId directly as the network
      console.log("chainIdStr:", chainIdStr);
      console.log("setNetwork id:", chain.id);
      console.log("network log:", network);
    }
  }, [chain]);

  useEffect(() => {
    console.log("Current Tags:", tag);
  }, [tag]);

  const contract = getContract({
    client: client,
    chain: chain || arbitrum,
    address: contractAddress,
  });

  const { data: dataRead, isLoading } = useReadContract({
    contract: contract,
    method: "function get_mintRate() external view returns (uint256)",
    params: [1n],
  });

  // Function to create the project
  const createProject = async (project) => {
    try {
      const createProjectRes = await fetch(`${BASE_API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });

      console.log("CreateForm response: ", createProjectRes);

      if (createProjectRes.status === 200 || 201) {
        localStorage.setItem("newProjectAdded", "true");
        router.push(`/projects/${project.title}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  // Function to fetch data and create the project
  const fetchDataAndCreateProject = async (title, owner, metadata) => {
    console.log("Creating project.");

    const project = {
      title,
      body: metadata.body,
      tokenOwner: owner,
      tag: metadata.tag,
      website: metadata.website,
      twitter: metadata.twitter,
      discord: metadata.discord,
      youtube: metadata.youtube,
      twitch: metadata.twitch,
      reel: metadata.reel,
      github: metadata.github,
      network: metadata.network,
      logo: metadata.ipfsUri,
    };

    await createProject(project);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPStatus(false);
    // Construct the metadata object
    const metadata = {
      title,
      body,
      tag,
      website,
      twitter,
      discord,
      youtube,
      twitch,
      reel,
      github,
      network,
      ipfsUri,
    };

    // Convert the metadata object to a JSON string
    const uri = JSON.stringify(metadata);
    console.log(uri);

    // ------Gas estimation------
    // get bytes of metadata
    const byteSize = getByteSize(uri);
    console.log(`Byte size of metadata: ${byteSize}`);
    const gasCostPerByte = 68;

    // estimate gas

    const estimatedGas = byteSize * gasCostPerByte;

    const buffer = 100000;
    const gasLimit = (estimatedGas + buffer).toString();
    console.log("gasLimit: ", gasLimit);

    const estimateGasBuffer = (estimatedGas * 0.2 + estimatedGas).toFixed(0);
    const gasBufferBuffer = (estimateGasBuffer + 100000).toString();

    console.log(`Estimated gas cost: ${estimatedGas}`);
    console.log(`Estimated gas + buffer cost: ${estimateGasBuffer}`);
    console.log(`gas buffer buffer cost: ${gasBufferBuffer}`);
    // ------Gas estimation------
    // If using an abstracted wallet
    console.log("Creating project.");
    const provider = await getProvider();
    // const provider = await getProvider(thirdwebActiveAccount);
    const contractNFTOnChainPayable = new ethers.Contract(
      contractAddress,
      ABI,
      provider
    );

    if (walletType == "thirdweb") {
      try {
        console.log(
          "thirdwebActiveAccount.address ",
          thirdwebActiveAccount.address
        );

        console.log("readRead == mintRate - ", dataRead);

        const sendAbstractedTx = prepareContractCall({
          contract: contract,
          method:
            "function safeMint(address to, string memory uri, string memory projectTitle) external payable",
          params: [thirdwebActiveAccount.address, uri, title],
          value: dataRead,
        });

        sendTransaction(sendAbstractedTx, {
          onSuccess: async (transaction) => {
            console.log("Transaction object: ", transaction);

            // The transaction object contains the transaction hash
            const transactionHash =
              transaction.transactionHash || transaction.hash;
            console.log("Transaction successful, hash:", transactionHash); // Works

            setConfirmationHash(transactionHash);

            // Wait for the transaction to be mined
            const receipt = await provider.waitForTransaction(transactionHash);

            if (receipt && receipt.status === 1) {
              // Fetch owner and create project after the transaction is confirmed
              const owner =
                await contractNFTOnChainPayable.getOwnerByProjectTitle(title);
              await fetchDataAndCreateProject(title, owner, metadata);
            } else {
              console.error("Transaction failed or is not mined yet.");
              setTransactionError(transactionHash);
            }
          },

          onError: (error) => {
            console.error("Transaction failed:", error);
            setTransactionError("Transaction failed");
          },
        });
        // console.log("testTx - ", testTx)
        // await testTx.wait()
        // console.log("await testTx - ", testTx)
      } catch (error) {
        console.error("Transaction failed:", error);
        setTransactionError("Transaction failed");
      }
    } else if (walletType == "wagmi") {
      // const provider = new ethers.BrowserProvider(window.ethereum);
      // await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = await getProvider();
      console.log("provider:", provider);

      const connectedWallet = await provider.getSigner(); // might need to have address: as a getSigner parameter
      console.log("connectedWallet log:", connectedWallet);

      //
      const newProjectMumbaiPayable19 = new ethers.Contract(
        contractAddress,
        [
          "function safeMint(address to, string memory uri, string memory projectTitle) external payable",
        ],
        connectedWallet
      );

      const contractNFTOnChainPayable = new ethers.Contract(
        contractAddress,
        ABI,
        provider
      );

      const txGetAfter = await contractNFTOnChainPayable.get_mintRate();
      const formatted_mintRate = ethers.formatEther(txGetAfter);
      console.log("mintRate:", formatted_mintRate);
      console.log(
        "Returned mint rate:",
        txGetAfter ? ethers.formatEther(txGetAfter) : "undefined"
      );

      try {
        console.log("contractAddress:", contractAddress);
        console.log("connectedWallet.address:", connectedWallet.address);
        const mintTokens = await newProjectMumbaiPayable19.safeMint(
          connectedWallet.address,
          uri,
          title,
          {
            value: txGetAfter,
            // changed from "0.0002" | added gasLimit
            // gasLimit: 10000000,
          }
        );

        if (mintTokens?.hash) {
          setConfirmationHash(mintTokens.hash);
          await mintTokens.wait();

          const owner = await contractNFTOnChainPayable.getOwnerByProjectTitle(
            title
          );
          await fetchDataAndCreateProject(title, owner, metadata);
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
    }
  };
  const fetchMintRateAndBalance = async () => {
    try {
      // Set mint rate based on wallet type
      if (walletType === "thirdweb") {
        setMintRate(dataRead ? ethers.formatEther(dataRead) : null);
      } else if (walletType === "wagmi") {
        const provider = await getProvider();
        const contractNFTOnChainPayable = new ethers.Contract(
          contractAddress,
          ABI,
          provider
        );
        const rate = await contractNFTOnChainPayable.get_mintRate();
        setMintRate(ethers.formatEther(rate));
      }

      // Fetch user balance if wallet and mint rate are available
      if (walletType && mintRate !== null) {
        const provider = await getProvider();
        const userBalance = await provider.getBalance(
          thirdwebActiveAccount?.address || wagmiAddress
        );
        const formattedBalance = ethers.formatEther(userBalance);
        setBalance(formattedBalance);

        // Check balance and update button text and disabled state
        if (parseFloat(formattedBalance) < parseFloat(mintRate)) {
          setButtonText(`${mintRate} ${NATIVE.symbol} is required`);
          setIsButtonDisabled(true);
        } else {
          setButtonText("Add Project");
          setIsButtonDisabled(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch mint rate or balance:", error);
    }
  };

  // Run `fetchMintRateAndBalance` every minute
  useEffect(() => {
    fetchMintRateAndBalance(); // Initial fetch

    const intervalId = setInterval(() => {
      fetchMintRateAndBalance();
    }, 60000); // 60000 ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [walletType, dataRead, mintRate, balance]);

  console.log("Rendering with Tags:", tag);
  return (
    <form onSubmit={handleSubmit} className={Style.Parent}>
      {/* Title input */}
      <label>
        <div className={Style.wrapper}>
          <span>Title</span>
          <input
            style={{ backgroundColor: "#302f2f" }}
            required
            type="text"
            onChange={handleTitleChange}
            value={title}
          />
        </div>
      </label>

      {/* Description textarea */}
      <label>
        <div className={Style.wrapper}>
          <span>Description</span>
          <textarea
            required
            onChange={handleTextareaChange}
            value={body}
            style={{ height: scHeight }}
          />
        </div>
      </label>
      <div className={Style.optionalMediaContainer}>
        <div className={Style.mediaWrapper}>
          {/* Optional Media input */}
          <div className={Style.websiteWrapper}>
            <span>
              <Image
                src={images.website}
                alt="website"
                width={30}
                height={30}
              />
            </span>
            <input
              placeholder="Link to website"
              type="text"
              onChange={(e) => setWebsite(e.target.value)}
              value={website}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image src={images.x2} alt="x2" width={30} height={30} />
            </span>
            <input
              placeholder="Twitter username"
              type="text"
              onChange={(e) => setTwitter(e.target.value)}
              value={twitter}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image
                src={images.discord}
                alt="discord"
                width={30}
                height={30}
              />
            </span>
            <input
              placeholder="Link to Discord channel"
              type="text"
              onChange={(e) => setDiscord(e.target.value)}
              value={discord}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image
                src={images.youtube}
                alt="youtube"
                width={30}
                height={30}
              />
            </span>
            <input
              placeholder="YouTube channel name"
              type="text"
              onChange={(e) => setYoutube(e.target.value)}
              value={youtube}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image src={images.twitch} alt="twitch" width={30} height={30} />
            </span>
            <input
              placeholder="Twitch username"
              type="text"
              onChange={(e) => setTwitch(e.target.value)}
              value={twitch}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image
                src={images.portfolio}
                alt="portfolio"
                width={30}
                height={30}
              />
            </span>
            <input
              placeholder="Link to art portfolio"
              type="text"
              onChange={(e) => setReel(e.target.value)}
              value={reel}
            />
          </div>
          <div className={Style.websiteWrapper}>
            <span>
              <Image src={images.github} alt="github" width={30} height={30} />
            </span>
            <input
              placeholder="Profile or profile/repo"
              type="text"
              onChange={(e) => setGithub(e.target.value)}
              value={github}
            />
          </div>
          {/* Optional Media input */}
        </div>

        <label>
          <div className={Style.dropdownWrapper}>
            <div className={Style.selectedTags}>
              {tag.map((selectedTag, index) => (
                <div key={index} className={Style.selectedTag}>
                  {selectedTag}
                  <span
                    onClick={() => {
                      setTag((prevTags) =>
                        prevTags.filter((tag) => tag !== selectedTag)
                      );
                    }}
                    className={Style.removeTag}
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
            <select
              className={Style.select}
              onChange={handleSelectChange}
              value={tag}
              disabled={tag.length >= maxTags}
              multiple
            >
              <option disabled value="">
                {tag.length >= maxTags
                  ? "Maximum tags selected"
                  : "Select up to 3 tags"}
              </option>
              <option value="AI">AI</option>
              <option value="Art">Art</option>
              <option value="Content Creator">Content Creator</option>
              <option value="DeFi">DeFi</option>
              <option value="Developer">Developer</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Educational">Educational</option>
              <option value="Fashion & Beauty">Fashion & Beauty</option>
              <option value="Health & Wellness">Health & Wellness</option>
              <option value="Medical">Medical</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Protocol">Protocol</option>
              <option value="Research">Research</option>
              <option value="Science">Science</option>
              <option value="Simply Struggling">Simply Struggling</option>
              <option value="Small Business">Small Business</option>
              <option value="Start-up">Startup</option>
              <option value="Technology">Technology</option>
              <option value="Video Game">Video Game</option>
              <option value="Web3">Web3</option>
            </select>
          </div>
          <div onSubmit={(e) => e.preventDefault()} className="form">
            {/* File upload section */}
            <div className={Style.fileUploadContainer}>
              {/* Label with Image for File Input */}
              <label htmlFor="file-upload" className={Style.fileLabel}>
                <Image
                  src={imagePreview || images.addImgProject} // Display preview or default image
                  alt="Upload Logo"
                  width={100}
                  height={100}
                  className={Style.imageUploadPreview}
                />
              </label>

              {/* Hidden File Input */}
              <input
                type="file"
                id="file-upload"
                accept=".jpeg,.png,.svg"
                onChange={handleFileChange}
                className={Style.hiddenFileInput} // Completely hide this input
              />

              {/* Upload Button */}
              <button
                type="button"
                onClick={uploadToIPFS}
                disabled={uploading}
                className={Style.uploadButton}
              >
                {uploading ? "Uploading..." : "Save image"}
              </button>
            </div>
          </div>
        </label>
        <div className={Style.addProjectContainer}>
          <button className={Style.AddProject} disabled={isButtonDisabled}>
            {buttonText}
          </button>
          <div className={Style.mintRateContainer}>
            {mintRate !== null ? (
              <>
                <p className={Style.mintRate}>
                  Mint Rate: {mintRate} {NATIVE.symbol}
                </p>
                <span className={Style.tooltipText}>
                  {mintRate} {NATIVE.name} is required to add a project.
                </span>
              </>
            ) : (
              <p className={Style.mintRate}>Please connect wallet</p>
            )}
          </div>

          {mintRate && <div></div>}
        </div>
        <div id="address" className="text-muted my-3"></div>
        {/* Conditionally render the div based on pStatus */}
        {pStatus && (
          <div>
            <p className="mb-2">
              Error: Project page already found. Only one page is permitted per
              wallet address.
            </p>
            {/* Additional content related to true status */}
          </div>
        )}
      </div>
    </form>
  );
}
