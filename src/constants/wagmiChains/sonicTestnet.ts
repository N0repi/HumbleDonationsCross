import { defineChain } from "viem";

export const sonicTestnet = /*#__PURE__*/ defineChain({
  id: 64_165,
  name: "Sonic Testnet",
  network: "sonic-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Sonic",
    symbol: "S",
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
