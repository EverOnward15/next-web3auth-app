//Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/app/api/derive/route.js
import { ECPair } from "bitcoinjs-lib";
import { networks, payments } from "bitcoinjs-lib";

export async function POST(req) {
  try {
    const body = await req.json();
    const { privateKeyHex } = body;

    if (!privateKeyHex || typeof privateKeyHex !== "string") {
      return new Response(JSON.stringify({ error: "Invalid privateKeyHex provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cleanedHex = privateKeyHex.replace(/^0x/, "");

    // Validate format: exactly 64 hex characters
    if (!/^[a-fA-F0-9]{64}$/.test(cleanedHex)) {
      return new Response(
        JSON.stringify({ error: "privateKeyHex must be a 64-character hex string." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const privateKeyBuffer = Buffer.from(cleanedHex, "hex");

    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
      network: networks.testnet,
    });

    const { address } = payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: networks.testnet,
    });

    return new Response(JSON.stringify({ address }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
