// thirdWebClient.ts

import dotenv from "dotenv"
dotenv.config()
import { createThirdwebClient } from "thirdweb"

export const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
})
