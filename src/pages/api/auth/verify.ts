// verify.ts — SIWE + session nonce. Smart accounts use ERC-6492 signatures; use thirdweb/auth
// verifySignature (same stack as thirdweb signMessage), not siwe.verify + raw EIP-1271 alone.

import { withIronSessionApiRoute } from "iron-session/next";
import type { NextApiRequest, NextApiResponse } from "next";
import { SiweMessage } from "siwe";
import { createThirdwebClient } from "thirdweb";
import { verifySignature } from "thirdweb/auth";
import { arbitrum, arbitrumSepolia, sepolia } from "thirdweb/chains";
import { ironOptions } from "../../../utils/constants";
import { sonicMainnet } from "../../../constants/thirdwebChains/sonicMainnet";

function getThirdwebChain(chainId: number) {
  switch (chainId) {
    case 42161:
      return arbitrum;
    case 421614:
      return arbitrumSepolia;
    case 11155111:
      return sepolia;
    case 146:
      return sonicMainnet;
    default:
      return arbitrum;
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  switch (method) {
    case "POST":
      try {
        const { message, signature } = req.body;
        const siweMessage = new SiweMessage(message);

        const sessionNonce = req.session.nonce;
        if (!sessionNonce || siweMessage.nonce !== sessionNonce) {
          res.status(401).json({ ok: false, error: "Invalid or missing nonce" });
          return;
        }

        const clientId =
          process.env.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;
        if (!clientId) {
          res.status(500).json({ ok: false, error: "Missing Thirdweb client id" });
          return;
        }

        const twClient = createThirdwebClient({ clientId });
        const chainId = Number(siweMessage.chainId);
        const chain = getThirdwebChain(chainId);

        const prepared = siweMessage.prepareMessage();

        const isValid = await verifySignature({
          message: prepared,
          signature,
          address: siweMessage.address,
          client: twClient,
          chain,
        });

        if (!isValid) {
          res.status(401).json({ ok: false });
          return;
        }

        req.session.nonce = undefined;
        req.session.siwe = {
          address: siweMessage.address,
          domain: siweMessage.domain,
          statement: siweMessage.statement,
          uri: siweMessage.uri,
          version: siweMessage.version,
          chainId: siweMessage.chainId,
          nonce: siweMessage.nonce,
          issuedAt: siweMessage.issuedAt,
          expirationTime: siweMessage.expirationTime,
          notBefore: siweMessage.notBefore,
          requestId: siweMessage.requestId,
          resources: siweMessage.resources,
        } as import("siwe").SiweMessage;

        await req.session.save();
        console.log(`Verified SIWE message for address: ${siweMessage.address}`);
        res.json({ ok: true });
      } catch (error) {
        console.error("SIWE verification error:", error);
        res.status(401).json({ ok: false });
      }
      break;
    default:
      res.setHeader("Allow", ["POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
