import { defineChain } from "thirdweb";

export const sonicTestnet = /*#__PURE__*/ defineChain({
  id: 64165,
  name: "Sonic Testnet",
  nativeCurrency: {
    name: "Sonic",
    symbol: "S",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.sonic.fantom.network"] },
    public: { http: ["https://rpc.sonic.fantom.network"] },
  },
  blockExplorers: {
    default: {
      name: "Sonic Testnet Explorer",
      url: "https://testnet.soniclabs.com/",
    },
  },
  testnet: true,
});
