// lib/cryptoPatch.js
// 1) Expose Buffer globally (if not already)
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// 2) Patch noble-secp256k1
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac }   from "@noble/hashes/hmac";
secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);

// 3) Patch bitcoinjs-lib
import * as bitcoin from "bitcoinjs-lib";
import crypto from "crypto"; // webpack will polyfill this to crypto-browserify

bitcoin.crypto.hmacSha256Sync = (key, buffer) =>
  Buffer.from(hmac(sha256, key, buffer));


export function applyCryptoPatches() {
  // nothing here; the imports above already ran the patches
}
