// me.ts

import { withIronSessionApiRoute } from "../../../lib/server/withIronSessionApiRoute"
import { NextApiRequest, NextApiResponse } from "next"
import { ironOptions } from "../../../utils/constants"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req
    switch (method) {
        case "GET":
            res.status(200).json({ address: req.session.siwe?.address })
            break
        default:
            res.setHeader("Allow", ["GET"])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export default withIronSessionApiRoute(handler, ironOptions)
