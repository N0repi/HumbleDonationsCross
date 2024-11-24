/** @type {import('next').NextConfig} */

const webpack = require("webpack");
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // "assets.coingecko.com",
      // "maroon-blank-stoat-172.mypinata.cloud",
      // "raw.githubusercontent.com",
      // "arbitrum.foundation",
      // "ethereum-optimism.github.io",
      // "s2.coinmarketcap.com",
      // "pinata.cloud",
      // "mypinata.cloud",
    ],
  },
  /* Specify domains in the future */
};

module.exports = {
  // webpack: {
  //   configure: (webpackConfig) => {
  //     webpackConfig.module.rules.forEach((rule) => {
  //       if (rule.use) {
  //         rule.use.forEach((loader) => {
  //           if (loader.loader === "source-map-loader") {
  //             loader.exclude = [
  //               /node_modules\/jsbi/,
  //               /node_modules\/node-vibrant/,
  //             ];
  //           }
  //         });
  //       }
  //     });
  //     webpackConfig.resolve.fallback = {
  //       assert: require.resolve("assert/"),
  //       http: require.resolve("stream-http"),
  //       https: require.resolve("https-browserify"),
  //       path: require.resolve("path-browserify"),
  //       fs: false,
  //     };
  //     webpackConfig.plugins.push(
  //       new webpack.ProvidePlugin({
  //         process: "process/browser",
  //       })
  //     );
  //     return webpackConfig;
  //   },
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maroon-obvious-orca-812.mypinata.cloud",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "maroon-blank-stoat-172.mypinata.cloud",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "arbitrum.foundation",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ethereum-optimism.github.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s2.coinmarketcap.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};
