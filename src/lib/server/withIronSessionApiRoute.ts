/**
 * Mirrors iron-session's withIronSessionApiRoute without importing `iron-session/next`.
 * Next.js 16 typechecking follows `node_modules/iron-session/next/index.ts`, which
 * references a missing ../src file; the published `next/dist` bundle is fine at runtime.
 */
import type { IronSession, IronSessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

function getPropertyDescriptorForReqSession(session: IronSession) {
  const asRecord = session as unknown as Record<string, unknown>;
  return {
    enumerable: true,
    get(): IronSession {
      return session;
    },
    set(value: IronSession) {
      const next = value as unknown as Record<string, unknown>;
      const keys = Object.keys(next);
      const currentKeys = Object.keys(asRecord);
      for (const key of currentKeys) {
        if (!keys.includes(key)) {
          delete asRecord[key];
        }
      }
      for (const key of keys) {
        asRecord[key] = next[key];
      }
    },
  };
}

type GetIronSessionApiOptions = (
  request: NextApiRequest,
  response: NextApiResponse,
) => Promise<IronSessionOptions> | IronSessionOptions;

export function withIronSessionApiRoute(
  handler: NextApiHandler,
  options: IronSessionOptions | GetIronSessionApiOptions,
): NextApiHandler {
  return async function nextApiHandlerWrappedWithIronSession(req, res) {
    const sessionOptions =
      typeof options === "function" ? await options(req, res) : options;
    const session = await getIronSession(req, res, sessionOptions);
    Object.defineProperty(req, "session", getPropertyDescriptorForReqSession(session));
    return handler(req, res);
  };
}
