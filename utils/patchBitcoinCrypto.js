import * as bitcoinjs from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// 1) Polyfill Buffer
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// 2) init ECC
bitcoinjs.initEccLib(ecc);

// 3) ensure hashes
const crypto = bitcoinjs.crypto;
if (!crypto.hashes) crypto.hashes = {};
console.log("🔧[patch] before:", crypto.hashes);

// 4–6) override
crypto.hashes.sha256             = b => Buffer.from(sha256(Buffer.from(b)));
crypto.hashes.hmacSha256Sync     = (k,d) => Buffer.from(hmac(sha256, Buffer.from(k), Buffer.from(d)));
crypto.sha256                     = crypto.hashes.sha256;
crypto.hmacSha256Sync             = crypto.hashes.hmacSha256Sync;

console.log("🔧[patch] after:", Object.keys(crypto.hashes));
// Should print: [ 'sha256', 'hmacSha256Sync', … ]

export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
