// app/providers.js or app/crypto-patch-provider.js
"use client"; // <--- VERY IMPORTANT

// 1) Expose Buffer globally (if not already)
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// 2) Patch noble-secp256k1
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { ripemd160 } from "@noble/hashes/ripemd160";

secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);

// 3) Patch bitcoinjs-lib
// The 'crypto' import here refers to the Node.js 'crypto' module, which Webpack needs to polyfill.
// Make sure crypto-browserify is installed.
// import crypto from "crypto"; // This line is not directly used by your patches below,
                              // but bitcoinjs-lib might internally try to import it.
                              // Keeping it here means Webpack will try to polyfill it.

import * as bitcoin from "bitcoinjs-lib";
bitcoin.crypto.sha256 = (b) => Buffer.from(sha256(b));
bitcoin.crypto.hash256 = (b) => Buffer.from(sha256(sha256(b)));
bitcoin.crypto.ripemd160 = (b) => Buffer.from(ripemd160(b));
bitcoin.crypto.hmacSha256 = (k, b) => Buffer.from(hmac(sha256, k, b));
bitcoin.crypto.hmacSha256Sync = (k, b) => Buffer.from(hmac(sha256, k, b));


// This component doesn't need to render anything,
// its purpose is just to execute the patching code on the client.
export default function CryptoPatchProvider({ children }) {
  return children;
}