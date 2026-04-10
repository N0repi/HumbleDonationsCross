// nonce.ts — bind nonce to session for verify step

import type { NextApiRequest, NextApiResponse } from "next";
import { withIronSessionApiRoute } from "iron-session/next";
import { generateNonce } from "siwe";
import { ironOptions } from "../../../utils/constants";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  switch (method) {
    case "GET": {
      const nonce = generateNonce();
      req.session.nonce = nonce;
      await req.session.save();
      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(nonce);
      break;
    }
    default:
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
