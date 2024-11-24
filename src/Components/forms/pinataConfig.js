// pinataConfig.js

import { PinataSDK } from "pinata-web3";
import dotenv from "dotenv";
dotenv.config();

export const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PROJECT_LOGO_JWT,
  pinataGateway: process.env.NEXT_PUBLIC_PROJECT_GATEWAY,
});
