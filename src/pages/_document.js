// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charset="UTF-8" />
          <meta name="robots" content="index, follow" />
          <meta name="author" content="HumbleDonations Team" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <meta name="theme-color" content="#e44bca" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
