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
import { ripemd160 } from "@noble/hashes/ripemd160";

secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);

// 3) Patch bitcoinjs-lib
import * as bitcoin from "bitcoinjs-lib";
import crypto from "crypto"; // webpack will polyfill this to crypto-browserify
// Patch bitcoinjs-lib next
import * as bitcoin from "bitcoinjs-lib";
bitcoin.crypto.sha256          = (b) => Buffer.from(sha256(b));
bitcoin.crypto.hash256         = (b) => Buffer.from(sha256(sha256(b)));
bitcoin.crypto.ripemd160       = (b) => Buffer.from(ripemd160(b));
bitcoin.crypto.hmacSha256      = (k, b) => Buffer.from(hmac(sha256, k, b));
bitcoin.crypto.hmacSha256Sync  = (k, b) => Buffer.from(hmac(sha256, k, b));

// no exports needed