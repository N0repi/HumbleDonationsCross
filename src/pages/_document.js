// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                {/* Add the viewport meta tag */}
                {/* <meta name="viewport" content="width=1000"></meta> */}
                {/* <meta name="viewport" content="width=device-width, initial-scale=1" /> */}
                {/* Any other custom meta tags, stylesheets, or scripts */}
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
