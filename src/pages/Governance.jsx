import Image from "next/image"
import { Inter } from "next/font/google"
import styles from "../styles/Home.module.css"
import React from "react"

// require("dotenv").config()

// const Moralis = require("moralis-v1/node")

// /* Moralis init code */
// const serverUrl = process.env.APP_DOMAIN
// const appId = process.env.MORALIS_PROJECT_ID
// const masterKey = process.env.MORALIS_API_KEY

// await Moralis.start({ serverUrl, appId, masterKey })

const inter = Inter({ subsets: ["latin"] })

export default function Home({ Component, pageProps }) {
    return (
        <>
            <main className={`${styles.main} ${inter.className}`}>
                <div className={styles.description}>Frontend in developement</div>
            </main>
        </>
    )
}
