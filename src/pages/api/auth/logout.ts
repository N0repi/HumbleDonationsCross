// logout.ts

import { withIronSessionApiRoute } from "iron-session/next"
import { ironOptions } from "../../../utils/constants"

import { NextApiRequest, NextApiResponse } from "next"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req
    switch (method) {
        case "GET":
        case "POST":
            req.session.destroy()
            console.log(`User logged out`)
            res.send({ ok: true })
            break
        default:
            res.setHeader("Allow", ["GET"])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export default withIronSessionApiRoute(handler, ironOptions)
