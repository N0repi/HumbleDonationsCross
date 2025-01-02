// addTokenChain.jsx

export default async function addArbitrum() {
  try {
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
