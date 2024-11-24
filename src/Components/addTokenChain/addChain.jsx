// addTokenChain.jsx

export default async function addSonic() {
  try {
    // Sonic
    // const result = await window.ethereum.request({
    //   method: "wallet_addEthereumChain",
    //   params: [
    //     {
    //       chainId: "0xfaa5",
    //       rpcUrls: ["https://rpc.sonic.fantom.network/"],
    //       chainName: "Sonic Testnet",
    //       nativeCurrency: {
    //         name: "Sonic",
    //         symbol: "S",
    //         decimals: 18,
    //       },
    //       blockExplorerUrls: ["https://testnet.soniclabs.com/"],
    //     },
    //   ],
    // });

    // Arbitrum
    const result = await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0xa4b1",
          rpcUrls: ["https://arb1.arbitrum.io/rpc"],
          chainName: "Arbitrum One",
          nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18,
          },
          blockExplorerUrls: ["https://arbiscan.io/"],
        },
      ],
    });
  } catch (error) {
    console.log(error);
  }
}
