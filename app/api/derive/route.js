//Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/app/api/derive/route.js
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";

const ECPair = ECPairFactory(ecc);

export async function POST(req) {
  try {
    console.log("API /derive called");
    console.log("Request body:", await req.text());

    const body = await req.json();
    const { privateKeyHex } = body;

    if (!privateKeyHex || typeof privateKeyHex !== "string") {
      return new Response(JSON.stringify({ error: "Invalid privateKeyHex provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cleanedHex = privateKeyHex.trim().replace(/^0x/, "").toLowerCase();

    // Ensure hex string is exactly 64 characters
    if (!/^[a-f0-9]{64}$/.test(cleanedHex)) {
      return new Response(
        JSON.stringify({ error: "privateKeyHex must be a 64-character hex string." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const privateKeyBuffer = Buffer.from(cleanedHex, "hex");

    // Validate that the buffer is exactly 32 bytes
    if (privateKeyBuffer.length !== 32) {
      return new Response(
        JSON.stringify({ error: "Buffer must be 32 bytes. Check input." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
      network: bitcoin.networks.testnet,
    });

    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.testnet,
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
