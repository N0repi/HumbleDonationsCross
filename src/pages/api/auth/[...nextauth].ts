// [...nextauth].ts

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getCsrfToken } from "next-auth/react"
import { SiweMessage } from "siwe"

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default async function auth(req: any, res: any) {
    const providers = [
        CredentialsProvider({
            name: "Ethereum",
            credentials: {
                message: {
                    label: "Message",
                    type: "text",
                    placeholder: "0x0",
                },
                signature: {
                    label: "Signature",
                    type: "text",
                    placeholder: "0x0",
                },
            },
            async authorize(credentials) {
                try {
                    const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"))
                    const nextAuthUrl = new URL(process.env.NEXTAUTH_URL)

                    const result = await siwe.verify({
                        signature: credentials?.signature || "",
                        domain: nextAuthUrl.host,
                        nonce: await getCsrfToken({ req }),
                    })

                    if (result.success) {
                        console.log(`Successfully authorized address: ${siwe.address}`)
                        return {
                            id: siwe.address,
                        }
                    }
                    return null
                } catch (e) {
                    return null
                }
            },
        }),
    ]

    const isDefaultSigninPage = req.method === "GET" && req.query.nextauth.includes("signin")

    // Hide Sign-In with Ethereum from default sign page
    if (isDefaultSigninPage) {
        providers.pop()
    }

    return await NextAuth(req, res, {
        // https://next-auth.js.org/configuration/providers/oauth
        providers,
        session: {
            strategy: "jwt",
            // AGE   -   Set the desired session lifetime (in seconds)
            // maxAge: 60 * 60,
            // 1 hour, adjust as needed
        },
        secret: process.env.NEXTAUTH_SECRET,
        callbacks: {
            async session({ session, token }: { session: any; token: any }) {
                session.address = token.sub
                session.user.name = token.sub
                session.user.image = "https://www.fillmurray.com/128/128"

                // Initialize approval status or other relevant session data
                session.isTokenApproved = false
                return session
            },
        },
    })
}
