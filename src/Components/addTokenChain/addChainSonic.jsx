// addTokenChain.jsx

export default async function addSonic() {
  try {
    // Sonic
    const result = await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x92",
          rpcUrls: ["https://rpc.soniclabs.com/"],
          chainName: "Sonic",
          nativeCurrency: {
            name: "Sonic",
            symbol: "S",
            decimals: 18,
          },
          blockExplorerUrls: ["https://sonicscan.org/"],
        },
      ],
    });
  } catch (error) {
    console.log(error);
  }
}
