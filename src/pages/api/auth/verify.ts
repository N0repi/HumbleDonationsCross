// verify.ts

import { withIronSessionApiRoute } from "iron-session/next"
import { NextApiRequest, NextApiResponse } from "next"
import { SiweMessage } from "siwe"
import { ironOptions } from "../../../utils/constants"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req
    switch (method) {
        case "POST":
            try {
                const { message, signature } = req.body
                const siweMessage = new SiweMessage(message)
                const fields = await siweMessage.validate(signature)
                req.session.siwe = fields
                await req.session.save()
                console.log(`Verified SIWE message for address: ${fields.address}`)
                res.json({ ok: true })
            } catch (_error) {
                res.json({ ok: false })
            }
            break
        default:
            res.setHeader("Allow", ["POST"])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export default withIronSessionApiRoute(handler, ironOptions)
