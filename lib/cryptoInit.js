// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// 1) Polyfill Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// 2) Initialize the full tiny-secp256k1 API
bitcoinjs.initEccLib(ecc);

// 3) Ensure crypto.hashes exists
const crypto = bitcoinjs.crypto;
if (!crypto.hashes) crypto.hashes = {};

// 4) Override SHA-256
crypto.hashes.sha256 = (buffer) =>
  Buffer.from(sha256(Buffer.from(buffer)));

// 5) Override HMAC-SHA256 (sync)
crypto.hashes.hmacSha256Sync = (key, data) => {
  const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.from(hmac(sha256, keyBytes, dataBytes));
};

// 6) Patch the direct crypto APIs too
crypto.sha256 = crypto.hashes.sha256;
crypto.hmacSha256Sync = crypto.hashes.hmacSha256Sync;

// 7) Re-export what you need from bitcoinjs-lib
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
