// utils/constants.js

export const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const ironOptions = {
  cookieName: "siwe",
  password: process.env.IRON_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

// ------MISC------
export const myTokenList = "../Components/SearchToken/tokenListNoDupes.json";

export const ArbitrumOneExplorer = `https://arbiscan.io/`;
export const SonicExplorer = `https://testnet.soniclabs.com/`;
export const SepoliaExplorer = `https://sepolia.etherscan.io/`;

const snapshotURLtestnet = "https://testnet.snapshot.org/#/humbledonations.eth";
export const snapshotURL = "https://snapshot.org/#/humbledonations.eth";
// ------MISC------

// ------ORACLES------
export const ETHUSDsepolia = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
export const JPYUSDsepolia = "0x8A6af2B75F23831ADc973ce6288e5329F63D86c6";

export const FTMUSDopera = "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc";
// ------ORACLES------

// ------TOKENS------
// Sepolia
export const SepoliaHDT = "0x9707Be4129F68B767aF550fe1c631BF1779623Cb";
export const SepoliaWETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

//Sonic
export const SonicHDT = "0xD8812d5d42ED80977d21213E3088EE7a24aC8B75";
export const SonicWETH = "0x625A959a716EF2fA19EE1A73052603E2D3711a82";
// ------TOKENS------

// ------CONTRACTS------
// ABIs
import HumbleDonationsArbitrum from "../../artifacts/contracts/a_HumbleDonations/Arbitrum/HumbleDonations.sol/HumbleDonations.json";
const ArbitrumABI = HumbleDonationsArbitrum.abi;

import HumbleDonationsSepolia from "../../artifacts/contracts/a_HumbleDonations/Sepolia/HumbleDonations.sol/HumbleDonations.json";
const SepoliaABI = HumbleDonationsSepolia.abi;

import HumbleDonationsSonic from "../../artifacts/contracts/a_HumbleDonations/Sonic/HumbleDonations.sol/HumbleDonations.json";
const SonicABI = HumbleDonationsSonic.abi;

// Addressess
export const SonicContractAddress =
  "0x505B0a771e2fDBDB8a0909414b8cf23dc400F567";
export const SepoliaContractAddress =
  "0x977428b2547A247848E2DD736B760c80da192b06";
// ------CONTRACTS------

// ---ABSTRACTED TOKEN LIST---
import abstractedTokenListArbitrum from "../Components/ThirdWeb/Connected/abstractedTokenListArbitrum.json";
import abstractedTokenListSepolia from "../Components/ThirdWeb/Connected/abstractedTokenListSepolia.json";
import abstractedTokenListSonic from "../Components/ThirdWeb/Connected/abstractedTokenListSonic.json";
// ---ABSTRACTED TOKEN LIST---

// ---GraphQL Clients---
import { clientArbitrum, urqlClients } from "./Graph/NOC/urqlClientNOC";
// ---GraphQL Clients---

const NATIVE_ETH = {
  name: "Ethereum",
  symbol: "ETH",
};
const NATIVE_SONIC = {
  name: "Sonic",
  symbol: "S",
};

const WRAPPED_ARBITRUM = {
  chainId: 42161,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  decimals: 18,
  symbol: "WETH",
  name: "Wrapped Ether",
};

const WRAPPED_SEPOLIA = {
  chainId: 11155111,
  address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  decimals: 18,
  symbol: "WETH",
  name: "Wrapped Ether",
};

const WRAPPED_SONIC = {
  chainId: 64165,
  address: "0x625A959a716EF2fA19EE1A73052603E2D3711a82",
  decimals: 18,
  symbol: "WS",
  name: "Wrapped Sonic",
};
// Multicall contract address
const ARBITRUM_MULTICALL_ADDRESS = "0xFade011AaDCC05b373C2A679E73980d12095A1fc";
const SEPOLIA_MULTICALL_ADDRESS = "0x9391CBb694c96Ce68c5b6659d3Fff811F9EbA7dB";
const SONIC_MULTICALL_ADDRESS = "0x42d9ab64f62837c8416ee46a4939537aeeb117bb";

// Addresses
const addresses = {
  // Arbitrum
  42161: {
    contractAddress: "0xEcD2932aA582b4b669845c96B64c3e95156ec425",
    ABI: ArbitrumABI,
    NATIVE: NATIVE_ETH,
    WRAPPED: WRAPPED_ARBITRUM,
    HDT: "0xBabe338052d822233Df0CD27Be40d6209B86Bae7",
    explorer: ArbitrumOneExplorer,
    ETHUSD: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    JPYUSD: "0x3dD6e51CB9caE717d5a8778CF79A04029f9cFDF8",
    uniQuoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    uniFactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    uniSwapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    Multicall: ARBITRUM_MULTICALL_ADDRESS,
    abstractedTokenList: abstractedTokenListArbitrum.abstractedTokenList,
    urqlClient: clientArbitrum,
  },
  // Sepolia
  11155111: {
    contractAddress: "0x977428b2547A247848E2DD736B760c80da192b06",
    ABI: SepoliaABI,
    NATIVE: NATIVE_ETH,
    WRAPPED: WRAPPED_SEPOLIA,
    HDT: "0x9707Be4129F68B767aF550fe1c631BF1779623Cb",
    explorer: SepoliaExplorer,
    ETHUSD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    JPYUSD: "0x8A6af2B75F23831ADc973ce6288e5329F63D86c6",
    uniQuoter: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
    uniFactory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    uniSwapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    Multicall: SEPOLIA_MULTICALL_ADDRESS,
    abstractedTokenList: abstractedTokenListSepolia.abstractedTokenList,
    urqlClient: urqlClients.sepolia,
  },
  // Sonic Testnet
  64165: {
    contractAddress: "0x505B0a771e2fDBDB8a0909414b8cf23dc400F567",
    ABI: SonicABI,
    NATIVE: NATIVE_SONIC,
    WRAPPED: WRAPPED_SONIC,
    HDT: "0xD8812d5d42ED80977d21213E3088EE7a24aC8B75",
    explorer: SonicExplorer,
    ETHUSD: "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc", // changed - was address of FTMUSD
    JPYUSD: "0x8A6af2B75F23831ADc973ce6288e5329F63D86c6",
    uniQuoter: "0x96F1EDa317935F2E86e7c3550F0bdCDBe5e14A9e",
    uniFactory: "0xBb5F17b4b598641AD1D946E3C2cEf23Fb96249D4",
    uniSwapRouter: "0xE67701aac6D40d34c43367D90FdeaE0095dc28Ba",
    Multicall: SONIC_MULTICALL_ADDRESS,
    abstractedTokenList: abstractedTokenListSonic.abstractedTokenList,
    urqlClient: urqlClients.sonic,
  },
};

// Function to retrieve config based on the network
export const getConfig = (chainId) => {
  return addresses[chainId] || addresses[42161];
};
