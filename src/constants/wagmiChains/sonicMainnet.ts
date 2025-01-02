import { defineChain } from "viem";

export const sonicMainnet = /*#__PURE__*/ defineChain({
  id: 146,
  name: "Sonic",
  network: "sonic",
  nativeCurrency: {
    decimals: 18,
    name: "Sonic",
    symbol: "S",
  },
  rpcUrls: {
    default: { http: ["https://rpc.soniclabs.com"] },
    public: { http: ["https://rpc.soniclabs.com"] },
  },
  blockExplorers: {
    default: {
      name: "Sonic Explorer",
      url: "https://sonicscan.org/",
    },
  },
  testnet: false,
});
