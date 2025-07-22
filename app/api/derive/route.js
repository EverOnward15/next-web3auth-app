//Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/app/api/derive/route.js
import { ECPair } from "bitcoinjs-lib";
import { networks, payments } from "bitcoinjs-lib";

export default function handler(req, res) {
  try {
    const { privateKeyHex } = req.body;

    if (!privateKeyHex || typeof privateKeyHex !== "string") {
      return res.status(400).json({ error: "Invalid privateKeyHex provided." });
    }

    const cleanedHex = privateKeyHex.replace(/^0x/, "");
    const privateKeyBuffer = Buffer.from(cleanedHex, "hex");

    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
      network: networks.testnet,
    });

    const { address } = payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: networks.testnet,
    });

    return res.status(200).json({ address });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
