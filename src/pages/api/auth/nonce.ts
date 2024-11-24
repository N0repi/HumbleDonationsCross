// nonce.ts

// import { withIronSessionApiRoute } from "iron-session/next"
import { generateNonce } from "siwe"
// import ironOptions from "../../../utils/constants"
import { NextApiRequest, NextApiResponse } from "next"

const handler = (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req
    switch (method) {
        case "GET":
            res.setHeader("Content-Type", "text/plain")
            res.send(generateNonce())
            const nonce = generateNonce()
            console.log(`Generated nonce: ${nonce}`)
            res.send(nonce)
            break
        default:
            res.setHeader("Allow", ["GET"])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export default handler
